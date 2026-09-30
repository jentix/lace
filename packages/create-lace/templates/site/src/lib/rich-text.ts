export type SafeRichTextMark =
  | { readonly type: "bold" | "code" | "italic" | "strike" }
  | { readonly attrs: { readonly href: string }; readonly type: "link" };

export type SafeRichTextNode =
  | { readonly type: "hardBreak" }
  | { readonly marks?: readonly SafeRichTextMark[]; readonly text: string; readonly type: "text" }
  | { readonly content?: readonly SafeRichTextNode[]; readonly type: "paragraph" }
  | {
      readonly attrs: { readonly level: 1 | 2 | 3 };
      readonly content?: readonly SafeRichTextNode[];
      readonly type: "heading";
    }
  | { readonly content: readonly SafeRichTextNode[]; readonly type: "bulletList" | "orderedList" }
  | { readonly content: readonly SafeRichTextNode[]; readonly type: "listItem" }
  | { readonly content: readonly SafeRichTextNode[]; readonly type: "blockquote" };

export interface SafeRichTextDocument {
  readonly content: readonly SafeRichTextNode[];
  readonly type: "doc";
}

function assertRecord(value: unknown, context: string): asserts value is Record<string, unknown> {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new TypeError(`${context} must be an object.`);
  }
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  context: string,
): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key))
      throw new TypeError(`${context} contains unsupported property ${key}.`);
  }
}

export function assertSafeHref(value: unknown, context: string): string {
  if (typeof value !== "string") throw new TypeError(`${context} must be a string.`);
  if (value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) return value;
  } catch {
    // The deterministic error below is clearer than a URL parsing implementation detail.
  }
  throw new TypeError(`${context} must be an allowed URL.`);
}

function assertMarks(value: unknown, context: string): readonly SafeRichTextMark[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TypeError(`${context} must be an array.`);
  return value.map((mark, index) => {
    const markContext = `${context}[${index}]`;
    assertRecord(mark, markContext);
    if (
      mark.type === "bold" ||
      mark.type === "code" ||
      mark.type === "italic" ||
      mark.type === "strike"
    ) {
      assertOnlyKeys(mark, ["type"], markContext);
      return { type: mark.type };
    }
    if (mark.type === "link") {
      assertOnlyKeys(mark, ["attrs", "type"], markContext);
      assertRecord(mark.attrs, `${markContext}.attrs`);
      assertOnlyKeys(mark.attrs, ["href"], `${markContext}.attrs`);
      return {
        attrs: { href: assertSafeHref(mark.attrs.href, `${markContext}.attrs.href`) },
        type: "link",
      };
    }
    throw new TypeError(`${markContext} has unsupported mark type.`);
  });
}

function assertNodes(value: unknown, context: string): readonly SafeRichTextNode[] {
  if (!Array.isArray(value)) throw new TypeError(`${context} must be an array.`);
  return value.map((node, index) => assertNode(node, `${context}[${index}]`));
}

function assertNode(value: unknown, context: string): SafeRichTextNode {
  assertRecord(value, context);
  if (value.type === "hardBreak") {
    assertOnlyKeys(value, ["type"], context);
    return { type: "hardBreak" };
  }
  if (value.type === "text") {
    assertOnlyKeys(value, ["marks", "text", "type"], context);
    if (typeof value.text !== "string") throw new TypeError(`${context}.text must be a string.`);
    const marks = assertMarks(value.marks, `${context}.marks`);
    return marks.length === 0
      ? { text: value.text, type: "text" }
      : { marks, text: value.text, type: "text" };
  }
  if (value.type === "paragraph") {
    assertOnlyKeys(value, ["content", "type"], context);
    return value.content === undefined
      ? { type: "paragraph" }
      : { content: assertNodes(value.content, `${context}.content`), type: "paragraph" };
  }
  if (value.type === "heading") {
    assertOnlyKeys(value, ["attrs", "content", "type"], context);
    assertRecord(value.attrs, `${context}.attrs`);
    assertOnlyKeys(value.attrs, ["level"], `${context}.attrs`);
    if (value.attrs.level !== 1 && value.attrs.level !== 2 && value.attrs.level !== 3) {
      throw new TypeError(`${context}.attrs.level must be 1, 2, or 3.`);
    }
    const attrs = { level: value.attrs.level } as const;
    return value.content === undefined
      ? { attrs, type: "heading" }
      : { attrs, content: assertNodes(value.content, `${context}.content`), type: "heading" };
  }
  if (
    value.type === "bulletList" ||
    value.type === "orderedList" ||
    value.type === "listItem" ||
    value.type === "blockquote"
  ) {
    assertOnlyKeys(value, ["content", "type"], context);
    const content = assertNodes(value.content, `${context}.content`);
    return { content, type: value.type };
  }
  throw new TypeError(`${context} has unsupported node type.`);
}

export function assertSafeRichTextDocument(value: unknown): SafeRichTextDocument {
  assertRecord(value, "rich text document");
  assertOnlyKeys(value, ["content", "type"], "rich text document");
  if (value.type !== "doc") throw new TypeError("rich text document must have type doc.");
  return { content: assertNodes(value.content, "rich text document.content"), type: "doc" };
}
