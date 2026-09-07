import * as v from "valibot";

/** A JSON primitive that can be transported between Lace runtimes. */
export type JsonPrimitive = boolean | null | number | string;

/** A portable JSON value. Field descriptors never retain executable values. */
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

/** A portable JSON object. */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/** Field kinds available in the first Lace content-model DSL. */
export type FieldType =
  | "boolean"
  | "date"
  | "datetime"
  | "media"
  | "number"
  | "richText"
  | "select"
  | "text"
  | "textarea"
  | "url";

/** Options common to every field builder. */
export interface CommonFieldOptions<Value> {
  readonly defaultValue?: Value;
  readonly description?: string;
  readonly label?: string;
  readonly required?: boolean;
}

/** String-length constraints supported by text and textarea fields. */
export interface StringFieldOptions extends CommonFieldOptions<string> {
  readonly maxLength?: number;
  readonly minLength?: number;
}

/** Numeric bounds supported by number fields. */
export interface NumberFieldOptions extends CommonFieldOptions<number> {
  readonly max?: number;
  readonly min?: number;
}

/** Options supported by boolean fields. */
export type BooleanFieldOptions = CommonFieldOptions<boolean>;

/** Options supported by date, datetime, URL, and media fields. */
export type StringValueFieldOptions = CommonFieldOptions<string>;

/** Options supported by a safe Tiptap rich-text field. */
export interface RichTextFieldOptions extends CommonFieldOptions<SafeRichTextDocument> {}

/** Options supported by select fields. */
export interface SelectFieldOptions<Choices extends readonly string[]> extends CommonFieldOptions<
  NoInfer<Choices[number]>
> {
  readonly options: Choices;
}

type RequiredFrom<Options> = "required" extends keyof Options
  ? Options extends { readonly required: infer Required extends boolean }
    ? Required
    : boolean
  : false;

type PropertyFrom<Options, Key extends string> = Key extends keyof Options
  ? Options extends { readonly [Name in Key]: infer Value }
    ? { readonly [Name in Key]: Value }
    : Options extends { readonly [Name in Key]?: infer Value }
      ? { readonly [Name in Key]?: Value }
      : {}
  : {};

type DefaultFrom<Options> = PropertyFrom<Options, "defaultValue">;

type LabelAndDescriptionFrom<Options> = PropertyFrom<Options, "label"> &
  PropertyFrom<Options, "description">;

type CommonDefinition<Type extends FieldType, Options> = {
  readonly required: RequiredFrom<Options>;
  readonly type: Type;
} & DefaultFrom<Options> &
  LabelAndDescriptionFrom<Options>;

type StringConstraintsFrom<Options> = PropertyFrom<Options, "minLength"> &
  PropertyFrom<Options, "maxLength">;

type NumberConstraintsFrom<Options> = PropertyFrom<Options, "min"> & PropertyFrom<Options, "max">;

/** A text-field descriptor. */
export type TextFieldDefinition<Options extends StringFieldOptions = StringFieldOptions> =
  CommonDefinition<"text", Options> & StringConstraintsFrom<Options>;

/** A textarea-field descriptor. */
export type TextareaFieldDefinition<Options extends StringFieldOptions = StringFieldOptions> =
  CommonDefinition<"textarea", Options> & StringConstraintsFrom<Options>;

/** A rich-text-field descriptor. */
export type RichTextFieldDefinition<Options extends RichTextFieldOptions = RichTextFieldOptions> =
  CommonDefinition<"richText", Options>;

/** A number-field descriptor. */
export type NumberFieldDefinition<Options extends NumberFieldOptions = NumberFieldOptions> =
  CommonDefinition<"number", Options> & NumberConstraintsFrom<Options>;

/** A boolean-field descriptor. */
export type BooleanFieldDefinition<Options extends BooleanFieldOptions = BooleanFieldOptions> =
  CommonDefinition<"boolean", Options>;

/** A date-field descriptor. */
export type DateFieldDefinition<Options extends StringValueFieldOptions = StringValueFieldOptions> =
  CommonDefinition<"date", Options>;

/** A datetime-field descriptor. */
export type DatetimeFieldDefinition<
  Options extends StringValueFieldOptions = StringValueFieldOptions,
> = CommonDefinition<"datetime", Options>;

/** A URL-field descriptor. */
export type UrlFieldDefinition<Options extends StringValueFieldOptions = StringValueFieldOptions> =
  CommonDefinition<"url", Options>;

/** A media-field descriptor that stores a media identifier. */
export type MediaFieldDefinition<
  Options extends StringValueFieldOptions = StringValueFieldOptions,
> = CommonDefinition<"media", Options>;

/** A select-field descriptor. */
export type SelectFieldDefinition<
  Choices extends readonly string[] = readonly string[],
  Options extends SelectFieldOptions<Choices> = SelectFieldOptions<Choices>,
> = CommonDefinition<"select", Options> & { readonly options: Choices };

/** The discriminated union of all currently supported field descriptors. */
export type FieldDefinition =
  | BooleanFieldDefinition
  | DateFieldDefinition
  | DatetimeFieldDefinition
  | MediaFieldDefinition
  | NumberFieldDefinition
  | RichTextFieldDefinition
  | SelectFieldDefinition
  | TextareaFieldDefinition
  | TextFieldDefinition
  | UrlFieldDefinition;

/** The submitted value type associated with a field descriptor. */
export type FieldValue<Definition extends FieldDefinition> = Definition["type"] extends "boolean"
  ? boolean
  : Definition["type"] extends "number"
    ? number
    : Definition["type"] extends "richText"
      ? SafeRichTextDocument
      : Definition["type"] extends "select"
        ? Definition extends { readonly options: readonly (infer Choice)[] }
          ? Choice
          : never
        : string;

/** Whether a descriptor makes a model property required through `required` or a default. */
export type FieldIsRequired<Definition extends FieldDefinition> = Definition extends {
  readonly defaultValue: unknown;
}
  ? true
  : Definition extends { readonly required: true }
    ? true
    : false;

/** Serializable form metadata has the same safe data shape as a field descriptor. */
export type FieldMetadata = FieldDefinition;

/** Thrown when a field builder receives a non-portable or contradictory option. */
export class FieldConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "FieldConfigurationError";
  }
}

type MutableJsonObject = { [key: string]: MutableJsonValue };
type MutableJsonValue = boolean | null | number | string | MutableJsonObject | MutableJsonValue[];

function fail(path: string, message: string): never {
  throw new FieldConfigurationError(`${path} ${message}`);
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function isArrayIndex(key: string): boolean {
  if (key === "0") {
    return true;
  }

  if (!/^[1-9][0-9]*$/u.test(key)) {
    return false;
  }

  const index = Number(key);
  return Number.isSafeInteger(index) && index < 4_294_967_295;
}

function normalizeJsonValue(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): MutableJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail(path, "must not contain a non-finite number.");
    }

    return value;
  }

  if (typeof value !== "object") {
    fail(path, "must be JSON-serializable.");
  }

  if (ancestors.has(value)) {
    fail(path, "must not contain a cyclic reference.");
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      for (const key of keys) {
        if (key === "length") {
          continue;
        }

        if (typeof key !== "string" || !isArrayIndex(key)) {
          fail(path, "must not contain non-index array properties or symbols.");
        }

        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined) {
          fail(`${path}[${key}]`, "must contain an own data property.");
        }
        if ("get" in descriptor || "set" in descriptor) {
          fail(`${path}[${key}]`, "must not contain accessor properties.");
        }
      }

      const normalized: MutableJsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          fail(`${path}[${index}]`, "must not contain sparse array entries.");
        }

        normalized.push(normalizeJsonValue(value[index], `${path}[${index}]`, ancestors));
      }

      return normalized;
    }

    if (!isPlainObject(value)) {
      fail(path, "must not contain a non-plain object.");
    }

    const normalized: MutableJsonObject = {};
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        fail(path, "must not contain symbol keys.");
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined) {
        fail(`${path}.${key}`, "must contain an own data property.");
      }
      if ("get" in descriptor || "set" in descriptor) {
        fail(`${path}.${key}`, "must not contain accessor properties.");
      }
      if (!descriptor.enumerable) {
        fail(`${path}.${key}`, "must contain an enumerable data property.");
      }

      normalized[key] = normalizeJsonValue(descriptor.value, `${path}.${key}`, ancestors);
    }

    return normalized;
  } finally {
    ancestors.delete(value);
  }
}

function normalizeOptions(options: unknown): MutableJsonObject {
  const normalized = normalizeJsonValue(options, "options", new WeakSet<object>());
  if (normalized === null || Array.isArray(normalized) || typeof normalized !== "object") {
    fail("options", "must be a plain object.");
  }

  return normalized;
}

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }

    Object.freeze(value);
  }

  return value;
}

function readOptionalString(options: MutableJsonObject, name: string): string | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    fail(`options.${name}`, "must be a string.");
  }

  return value;
}

function readOptionalBoolean(options: MutableJsonObject, name: string): boolean | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    fail(`options.${name}`, "must be a boolean.");
  }

  return value;
}

function readOptionalFiniteNumber(
  options: MutableJsonObject,
  name: string,
  integer: boolean,
): number | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (integer && !Number.isSafeInteger(value)) ||
    (integer && value < 0)
  ) {
    fail(
      `options.${name}`,
      integer ? "must be a non-negative safe integer." : "must be a finite number.",
    );
  }

  return value;
}

function addCommonOptions(definition: Record<string, unknown>, options: MutableJsonObject): void {
  const label = readOptionalString(options, "label");
  if (label !== undefined) {
    definition.label = label;
  }

  const description = readOptionalString(options, "description");
  if (description !== undefined) {
    definition.description = description;
  }

  definition.required = readOptionalBoolean(options, "required") ?? false;
}

function assertAllowedOptions(options: MutableJsonObject, allowed: readonly string[]): void {
  for (const key of Object.keys(options)) {
    if (!allowed.includes(key)) {
      fail(`options.${key}`, "is not supported by this field type.");
    }
  }
}

function addDefault(
  definition: Record<string, unknown>,
  options: MutableJsonObject,
  isValid: (value: MutableJsonValue) => boolean,
  message: string,
): void {
  if (!Object.hasOwn(options, "defaultValue")) {
    return;
  }

  const value = options.defaultValue;
  if (value === undefined || !isValid(value)) {
    fail("options.defaultValue", message);
  }

  definition.defaultValue = value;
}

function buildStringField<Type extends "text" | "textarea", Options extends StringFieldOptions>(
  type: Type,
  input: Options | undefined,
): Type extends "text" ? TextFieldDefinition<Options> : TextareaFieldDefinition<Options> {
  const options = normalizeOptions(input ?? {});
  assertAllowedOptions(options, [
    "defaultValue",
    "description",
    "label",
    "maxLength",
    "minLength",
    "required",
  ]);
  const definition: Record<string, unknown> = { type };
  addCommonOptions(definition, options);

  const minLength = readOptionalFiniteNumber(options, "minLength", true);
  const maxLength = readOptionalFiniteNumber(options, "maxLength", true);
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    fail("options", "must not set minLength greater than maxLength.");
  }

  if (minLength !== undefined) {
    definition.minLength = minLength;
  }
  if (maxLength !== undefined) {
    definition.maxLength = maxLength;
  }

  addDefault(
    definition,
    options,
    (value) =>
      typeof value === "string" &&
      (minLength === undefined || value.length >= minLength) &&
      (maxLength === undefined || value.length <= maxLength),
    "must be a string that conforms to the declared length constraints.",
  );

  return deepFreeze(definition) as Type extends "text"
    ? TextFieldDefinition<Options>
    : TextareaFieldDefinition<Options>;
}

function buildStringValueField<
  Type extends "date" | "datetime" | "media" | "url",
  Options extends StringValueFieldOptions,
>(type: Type, input: Options | undefined): FieldDefinition {
  const options = normalizeOptions(input ?? {});
  assertAllowedOptions(options, ["defaultValue", "description", "label", "required"]);
  const definition: Record<string, unknown> = { type };
  addCommonOptions(definition, options);
  addDefault(definition, options, (value) => typeof value === "string", "must be a string.");
  return deepFreeze(definition) as FieldDefinition;
}

/** Builders for portable Lace field descriptors. */
export const field = {
  /** Define a single-line text field. */
  text<const Options extends StringFieldOptions = StringFieldOptions>(
    options?: Options,
  ): TextFieldDefinition<Options> {
    return buildStringField("text", options);
  },

  /** Define a multiline text field. */
  textarea<const Options extends StringFieldOptions = StringFieldOptions>(
    options?: Options,
  ): TextareaFieldDefinition<Options> {
    return buildStringField("textarea", options);
  },

  /** Define a Tiptap JSON field; document semantics are validated in Session 2B. */
  richText<const Options extends RichTextFieldOptions = RichTextFieldOptions>(
    options?: Options,
  ): RichTextFieldDefinition<Options> {
    const normalized = normalizeOptions(options ?? {});
    assertAllowedOptions(normalized, ["defaultValue", "description", "label", "required"]);
    const definition: Record<string, unknown> = { type: "richText" };
    addCommonOptions(definition, normalized);
    addDefault(
      definition,
      normalized,
      (value) => isSafeRichTextDocument(value),
      "must be a safe rich-text document.",
    );
    return deepFreeze(definition) as RichTextFieldDefinition<Options>;
  },

  /** Define a finite numeric field. */
  number<const Options extends NumberFieldOptions = NumberFieldOptions>(
    options?: Options,
  ): NumberFieldDefinition<Options> {
    const normalized = normalizeOptions(options ?? {});
    assertAllowedOptions(normalized, [
      "defaultValue",
      "description",
      "label",
      "max",
      "min",
      "required",
    ]);
    const definition: Record<string, unknown> = { type: "number" };
    addCommonOptions(definition, normalized);
    const min = readOptionalFiniteNumber(normalized, "min", false);
    const max = readOptionalFiniteNumber(normalized, "max", false);
    if (min !== undefined && max !== undefined && min > max) {
      fail("options", "must not set min greater than max.");
    }
    if (min !== undefined) {
      definition.min = min;
    }
    if (max !== undefined) {
      definition.max = max;
    }
    addDefault(
      definition,
      normalized,
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        (min === undefined || value >= min) &&
        (max === undefined || value <= max),
      "must be a finite number that conforms to the declared numeric bounds.",
    );
    return deepFreeze(definition) as NumberFieldDefinition<Options>;
  },

  /** Define a boolean field. */
  boolean<const Options extends BooleanFieldOptions = BooleanFieldOptions>(
    options?: Options,
  ): BooleanFieldDefinition<Options> {
    const normalized = normalizeOptions(options ?? {});
    assertAllowedOptions(normalized, ["defaultValue", "description", "label", "required"]);
    const definition: Record<string, unknown> = { type: "boolean" };
    addCommonOptions(definition, normalized);
    addDefault(definition, normalized, (value) => typeof value === "boolean", "must be a boolean.");
    return deepFreeze(definition) as BooleanFieldDefinition<Options>;
  },

  /** Define a date string field. */
  date<const Options extends StringValueFieldOptions = StringValueFieldOptions>(
    options?: Options,
  ): DateFieldDefinition<Options> {
    return buildStringValueField("date", options) as DateFieldDefinition<Options>;
  },

  /** Define a datetime string field. */
  datetime<const Options extends StringValueFieldOptions = StringValueFieldOptions>(
    options?: Options,
  ): DatetimeFieldDefinition<Options> {
    return buildStringValueField("datetime", options) as DatetimeFieldDefinition<Options>;
  },

  /** Define a select field with a non-empty unique list of string choices. */
  select<
    const Options extends {
      readonly options: readonly [string, ...string[]];
    },
  >(
    options: Options & SelectFieldOptions<Options["options"]>,
  ): SelectFieldDefinition<Options["options"], Options & SelectFieldOptions<Options["options"]>> {
    const normalized = normalizeOptions(options);
    assertAllowedOptions(normalized, [
      "defaultValue",
      "description",
      "label",
      "options",
      "required",
    ]);
    const rawChoices = normalized.options;
    if (!Array.isArray(rawChoices) || rawChoices.length === 0) {
      fail("options.options", "must be a non-empty array of strings.");
    }

    const choices: string[] = [];
    const seen = new Set<string>();
    for (const [index, choice] of rawChoices.entries()) {
      if (typeof choice !== "string") {
        fail(`options.options[${index}]`, "must be a string.");
      }
      if (seen.has(choice)) {
        fail(`options.options[${index}]`, "must not duplicate a select choice.");
      }
      seen.add(choice);
      choices.push(choice);
    }

    const definition: Record<string, unknown> = { options: choices, type: "select" };
    addCommonOptions(definition, normalized);
    addDefault(
      definition,
      normalized,
      (value) => typeof value === "string" && seen.has(value),
      "must be one of the declared select choices.",
    );
    return deepFreeze(definition) as SelectFieldDefinition<
      Options["options"],
      Options & SelectFieldOptions<Options["options"]>
    >;
  },

  /** Define a URL string field; URL protocol validation is added in Session 2B. */
  url<const Options extends StringValueFieldOptions = StringValueFieldOptions>(
    options?: Options,
  ): UrlFieldDefinition<Options> {
    return buildStringValueField("url", options) as UrlFieldDefinition<Options>;
  },

  /** Define a field holding a media identifier. */
  media<const Options extends StringValueFieldOptions = StringValueFieldOptions>(
    options?: Options,
  ): MediaFieldDefinition<Options> {
    return buildStringValueField("media", options) as MediaFieldDefinition<Options>;
  },
} as const;

/**
 * Project a field descriptor into a detached, immutable JSON-safe admin form
 * representation. Runtime schemas and callbacks are deliberately absent.
 */
export function toFieldMetadata(definition: FieldDefinition): FieldMetadata {
  const normalized = normalizeJsonValue(definition, "definition", new WeakSet<object>());
  if (normalized === null || Array.isArray(normalized) || typeof normalized !== "object") {
    fail("definition", "must be a field-definition object.");
  }
  return deepFreeze(normalized) as FieldMetadata;
}

/** A mark permitted in Lace rich-text documents. */
export type SafeRichTextMark =
  | { readonly type: "bold" | "code" | "italic" | "strike" }
  | { readonly attrs: { readonly href: string }; readonly type: "link" };

/** A node permitted in Lace rich-text documents. */
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

/** The closed, safe Tiptap document representation supported by Lace. */
export interface SafeRichTextDocument {
  readonly content: readonly SafeRichTextNode[];
  readonly type: "doc";
}

/** A stable path segment for validation errors. */
export type ValidationPathSegment = number | string;

/** A portable validation error that callers can associate with form values. */
export interface ContentValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path: readonly ValidationPathSegment[];
}

/** Thrown when submitted content fails a portable validation contract. */
export class ContentValidationError extends Error {
  public readonly issues: readonly ContentValidationIssue[];

  public constructor(issues: readonly ContentValidationIssue[]) {
    super(issues.map((issue) => `${formatValidationPath(issue.path)} ${issue.message}`).join("; "));
    this.name = "ContentValidationError";
    this.issues = issues;
  }
}

function formatValidationPath(path: readonly ValidationPathSegment[]): string {
  if (path.length === 0) {
    return "$";
  }

  return path.reduce<string>((result, segment) => {
    return typeof segment === "number" ? `${result}[${segment}]` : `${result}.${segment}`;
  }, "$");
}

function invalid(path: readonly ValidationPathSegment[], code: string, message: string): never {
  throw new ContentValidationError([{ code, message, path }]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value) && isPlainObject(value)
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  path: readonly ValidationPathSegment[],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      invalid([...path, key], "unknown_key", "is not permitted.");
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      invalid([...path, key], "missing_key", "is required.");
    }
  }
}

/** Returns whether a URL is permitted in Lace URL fields and rich-text links. */
export function isSafeUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    /\s/u.test(value) ||
    value.includes(String.fromCodePoint(0))
  ) {
    return false;
  }
  if (value.startsWith("#")) {
    return true;
  }
  if (value.startsWith("/")) {
    return !value.startsWith("//");
  }
  return /^(?:https?:\/\/[^/?#\s]+(?:[/?#][^\s]*)?|mailto:[^\s@]+@[^\s@]+|tel:\+?[0-9(). -]+)$/u.test(
    value,
  );
}

function assertMarks(value: unknown, path: readonly ValidationPathSegment[]): void {
  if (!Array.isArray(value)) {
    invalid(path, "invalid_marks", "must be an array.");
  }
  for (const [index, mark] of value.entries()) {
    const markPath = [...path, index];
    if (!isRecord(mark) || typeof mark.type !== "string") {
      invalid(markPath, "invalid_mark", "must be a mark object.");
    }
    if (mark.type === "link") {
      assertExactKeys(mark, ["attrs", "type"], [], markPath);
      if (!isRecord(mark.attrs)) {
        invalid([...markPath, "attrs"], "invalid_link_attributes", "must be an object.");
      }
      assertExactKeys(mark.attrs, ["href"], [], [...markPath, "attrs"]);
      if (!isSafeUrl(mark.attrs.href)) {
        invalid([...markPath, "attrs", "href"], "unsafe_url", "must be an approved URL.");
      }
      continue;
    }
    if (
      mark.type === "bold" ||
      mark.type === "code" ||
      mark.type === "italic" ||
      mark.type === "strike"
    ) {
      assertExactKeys(mark, ["type"], [], markPath);
      continue;
    }
    invalid([...markPath, "type"], "unknown_mark", "is not permitted.");
  }
}

function assertRichTextChildren(
  value: unknown,
  path: readonly ValidationPathSegment[],
  allowed: readonly SafeRichTextNode["type"][],
): void {
  if (!Array.isArray(value)) {
    invalid(path, "invalid_content", "must be an array.");
  }
  for (const [index, child] of value.entries()) {
    assertRichTextNode(child, [...path, index]);
    if (!allowed.includes(child.type)) {
      invalid([...path, index, "type"], "invalid_child", "is not permitted in this node.");
    }
  }
}

function assertRichTextNode(
  value: unknown,
  path: readonly ValidationPathSegment[],
): asserts value is SafeRichTextNode {
  if (!isRecord(value) || typeof value.type !== "string") {
    invalid(path, "invalid_node", "must be a rich-text node object.");
  }

  if (value.type === "text") {
    assertExactKeys(value, ["text", "type"], ["marks"], path);
    if (typeof value.text !== "string") {
      invalid([...path, "text"], "invalid_text", "must be a string.");
    }
    if (Object.hasOwn(value, "marks")) {
      assertMarks(value.marks, [...path, "marks"]);
    }
    return;
  }

  if (value.type === "hardBreak") {
    assertExactKeys(value, ["type"], [], path);
    return;
  }

  if (value.type === "paragraph") {
    assertExactKeys(value, ["type"], ["content"], path);
    if (Object.hasOwn(value, "content")) {
      assertRichTextChildren(value.content, [...path, "content"], ["hardBreak", "text"]);
    }
    return;
  }

  if (value.type === "heading") {
    assertExactKeys(value, ["attrs", "type"], ["content"], path);
    if (!isRecord(value.attrs)) {
      invalid([...path, "attrs"], "invalid_heading_attributes", "must be an object.");
    }
    assertExactKeys(value.attrs, ["level"], [], [...path, "attrs"]);
    if (value.attrs.level !== 1 && value.attrs.level !== 2 && value.attrs.level !== 3) {
      invalid([...path, "attrs", "level"], "invalid_heading_level", "must be 1, 2, or 3.");
    }
    if (Object.hasOwn(value, "content")) {
      assertRichTextChildren(value.content, [...path, "content"], ["hardBreak", "text"]);
    }
    return;
  }

  if (value.type === "bulletList" || value.type === "orderedList") {
    assertExactKeys(value, ["content", "type"], [], path);
    assertRichTextChildren(value.content, [...path, "content"], ["listItem"]);
    return;
  }

  if (value.type === "listItem") {
    assertExactKeys(value, ["content", "type"], [], path);
    assertRichTextChildren(
      value.content,
      [...path, "content"],
      ["bulletList", "orderedList", "paragraph"],
    );
    return;
  }

  if (value.type === "blockquote") {
    assertExactKeys(value, ["content", "type"], [], path);
    assertRichTextChildren(
      value.content,
      [...path, "content"],
      ["bulletList", "orderedList", "paragraph"],
    );
    return;
  }

  invalid([...path, "type"], "unknown_node", "is not permitted.");
}

/** Validates and returns a closed, safe rich-text document. */
export function validateRichTextDocument(value: unknown): SafeRichTextDocument {
  if (!isRecord(value) || value.type !== "doc") {
    invalid([], "invalid_document", "must be a doc node.");
  }
  assertExactKeys(value, ["content", "type"], [], []);
  assertRichTextChildren(
    value.content,
    ["content"],
    ["blockquote", "bulletList", "heading", "orderedList", "paragraph"],
  );
  return value as unknown as SafeRichTextDocument;
}

function isSafeRichTextDocument(value: unknown): value is SafeRichTextDocument {
  try {
    validateRichTextDocument(value);
    return true;
  } catch (error) {
    if (error instanceof ContentValidationError) {
      return false;
    }
    throw error;
  }
}

/** A total handler map for every supported field definition. */
export type FieldDefinitionVisitor<Result> = {
  readonly [Type in FieldType]: (
    definition: Extract<FieldDefinition, { readonly type: Type }>,
  ) => Result;
};

/** Visits a field descriptor exhaustively. */
export function visitFieldDefinition<Result>(
  definition: FieldDefinition,
  visitor: FieldDefinitionVisitor<Result>,
): Result {
  switch (definition.type) {
    case "boolean":
      return visitor.boolean(definition);
    case "date":
      return visitor.date(definition);
    case "datetime":
      return visitor.datetime(definition);
    case "media":
      return visitor.media(definition);
    case "number":
      return visitor.number(definition);
    case "richText":
      return visitor.richText(definition);
    case "select":
      return visitor.select(definition);
    case "text":
      return visitor.text(definition);
    case "textarea":
      return visitor.textarea(definition);
    case "url":
      return visitor.url(definition);
  }
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const parts = value.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isUtcIsoDatetime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isFieldValue(definition: FieldDefinition, value: unknown): boolean {
  return visitFieldDefinition(definition, {
    boolean: () => typeof value === "boolean",
    date: () => isCalendarDate(value),
    datetime: () => isUtcIsoDatetime(value),
    media: () => typeof value === "string" && value.length > 0,
    number: (fieldDefinition) =>
      typeof value === "number" &&
      Number.isFinite(value) &&
      (fieldDefinition.min === undefined || value >= fieldDefinition.min) &&
      (fieldDefinition.max === undefined || value <= fieldDefinition.max),
    richText: () => isSafeRichTextDocument(value),
    select: (fieldDefinition) =>
      typeof value === "string" && fieldDefinition.options.includes(value),
    text: (fieldDefinition) =>
      typeof value === "string" &&
      (fieldDefinition.minLength === undefined || value.length >= fieldDefinition.minLength) &&
      (fieldDefinition.maxLength === undefined || value.length <= fieldDefinition.maxLength),
    textarea: (fieldDefinition) =>
      typeof value === "string" &&
      (fieldDefinition.minLength === undefined || value.length >= fieldDefinition.minLength) &&
      (fieldDefinition.maxLength === undefined || value.length <= fieldDefinition.maxLength),
    url: () => isSafeUrl(value),
  });
}

/** A Valibot runtime schema compiled from a field definition. */
export type CompiledFieldSchema<Definition extends FieldDefinition> = v.BaseSchema<
  unknown,
  FieldValue<Definition>,
  v.BaseIssue<unknown>
>;

/** Compiles a field definition into its Valibot runtime schema. */
export function compileFieldSchema<Definition extends FieldDefinition>(
  definition: Definition,
): CompiledFieldSchema<Definition> {
  return v.custom<FieldValue<Definition>>((value) =>
    isFieldValue(definition, value),
  ) as CompiledFieldSchema<Definition>;
}

/** Validates a submitted field value and returns its inferred value type. */
export function validateFieldValue<Definition extends FieldDefinition>(
  definition: Definition,
  value: unknown,
  path: readonly ValidationPathSegment[] = [],
): FieldValue<Definition> {
  const result = v.safeParse(compileFieldSchema(definition), value);
  if (!result.success) {
    invalid(path, "invalid_field_value", "does not conform to its field definition.");
  }
  return result.output;
}

/** A model field map accepted by the draft and publish validators. */
export type ModelFieldDefinitions = Readonly<Record<string, FieldDefinition>>;

/** A validated set of model field values. */
export type ModelFieldValues = Readonly<Record<string, FieldValue<FieldDefinition>>>;

/** The validation state of a content snapshot. */
export type ContentValidationMode = "draft" | "publish";

/** Validates field data for either an incomplete draft or a publish candidate. */
export function validateModelFields(
  definitions: ModelFieldDefinitions,
  value: unknown,
  mode: ContentValidationMode,
): ModelFieldValues {
  if (!isRecord(value)) {
    invalid([], "invalid_fields", "must be an object.");
  }

  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(definitions, key)) {
      invalid([key], "unknown_field", "is not defined by this model.");
    }
  }

  const output: Record<string, FieldValue<FieldDefinition>> = {};
  for (const [key, definition] of Object.entries(definitions)) {
    if (Object.hasOwn(value, key)) {
      output[key] = validateFieldValue(definition, value[key], [key]);
      continue;
    }
    if (Object.hasOwn(definition, "defaultValue")) {
      output[key] = validateFieldValue(definition, definition.defaultValue, [key]);
      continue;
    }
    if (mode === "publish" && definition.required) {
      invalid([key], "missing_required_field", "is required for publication.");
    }
  }
  return output;
}

/** Maximum title length shared by draft, publish, REST, and admin validation. */
export const MAX_TITLE_LENGTH = 200;
/** Maximum slug length shared by publish, REST, and admin validation. */
export const MAX_SLUG_LENGTH = 100;
/** Maximum flat top-level block count for one entry. */
export const MAX_TOP_LEVEL_BLOCKS = 200;
/** Maximum UTF-8 bytes in fields JSON or a single block data JSON value. */
export const MAX_JSON_BYTES = 1_000_000;

/** The only entry kinds required before model definitions are introduced. */
export type ContentModelKind = "collection" | "page";

/** A block-like value whose data can be limited before the Step 3 block registry exists. */
export interface EntryBlockData {
  readonly data: JsonValue;
}

/** System data validated alongside a model field record. */
export interface EntryPayloadInput {
  readonly blocks: readonly EntryBlockData[];
  readonly fields: JsonObject;
  readonly kind: ContentModelKind;
  readonly slug?: string;
  readonly title: string;
}

/** Returns canonical JSON with recursively sorted object keys. */
export function canonicalizeJson(value: JsonValue): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }
  const object = value as JsonObject;
  const entries = Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(object[key]!)}`);
  return `{${entries.join(",")}}`;
}

interface TextEncoderLike {
  encode(input: string): Uint8Array;
}

interface TextEncoderConstructorLike {
  new (): TextEncoderLike;
}

/** Gets the UTF-8 byte count of portable JSON through canonical serialization. */
export function canonicalJsonByteLength(value: JsonValue): number {
  const TextEncoderConstructor = (
    globalThis as unknown as { readonly TextEncoder?: TextEncoderConstructorLike }
  ).TextEncoder;
  if (TextEncoderConstructor === undefined) {
    throw new Error("TextEncoder is required for canonical JSON byte measurement.");
  }
  return new TextEncoderConstructor().encode(canonicalizeJson(value)).byteLength;
}

/** Minimal portable shape used by the SHA-256 helper. */
export interface WebCryptoLike {
  readonly subtle: {
    digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
  };
}

function getWebCrypto(): WebCryptoLike {
  const crypto = (globalThis as unknown as { readonly crypto?: WebCryptoLike }).crypto;
  if (crypto === undefined) {
    throw new Error("Web Crypto is required for canonical JSON hashing.");
  }
  return crypto;
}

/** Hashes canonical JSON UTF-8 bytes with Web Crypto SHA-256 as lowercase hexadecimal. */
export async function sha256CanonicalJson(
  value: JsonValue,
  webCrypto: WebCryptoLike = getWebCrypto(),
): Promise<string> {
  const TextEncoderConstructor = (
    globalThis as unknown as { readonly TextEncoder?: TextEncoderConstructorLike }
  ).TextEncoder;
  if (TextEncoderConstructor === undefined) {
    throw new Error("TextEncoder is required for canonical JSON hashing.");
  }
  const digest = new Uint8Array(
    await webCrypto.subtle.digest(
      "SHA-256",
      new TextEncoderConstructor().encode(canonicalizeJson(value)),
    ),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assertJsonSize(value: JsonValue, path: readonly ValidationPathSegment[]): void {
  if (canonicalJsonByteLength(value) > MAX_JSON_BYTES) {
    invalid(path, "json_too_large", `must not exceed ${MAX_JSON_BYTES} UTF-8 bytes.`);
  }
}

/** Validates system entry data and shared payload limits for a draft or publish candidate. */
export function validateEntryPayload(
  input: EntryPayloadInput,
  mode: ContentValidationMode,
): EntryPayloadInput {
  if (input.kind !== "collection" && input.kind !== "page") {
    invalid(["kind"], "invalid_model_kind", "must be page or collection.");
  }
  if (typeof input.title !== "string" || input.title.length === 0) {
    invalid(["title"], "missing_title", "is required.");
  }
  if (input.title.length > MAX_TITLE_LENGTH) {
    invalid(["title"], "title_too_long", `must not exceed ${MAX_TITLE_LENGTH} characters.`);
  }
  if (
    input.slug !== undefined &&
    (typeof input.slug !== "string" || input.slug.length > MAX_SLUG_LENGTH)
  ) {
    invalid(["slug"], "slug_too_long", `must not exceed ${MAX_SLUG_LENGTH} characters.`);
  }
  if (
    mode === "publish" &&
    input.kind === "collection" &&
    (input.slug === undefined || input.slug.length === 0)
  ) {
    invalid(["slug"], "missing_slug", "is required for collection publication.");
  }
  if (!Array.isArray(input.blocks)) {
    invalid(["blocks"], "invalid_blocks", "must be an array.");
  }
  if (input.blocks.length > MAX_TOP_LEVEL_BLOCKS) {
    invalid(
      ["blocks"],
      "too_many_blocks",
      `must not contain more than ${MAX_TOP_LEVEL_BLOCKS} blocks.`,
    );
  }
  assertJsonSize(input.fields, ["fields"]);
  for (const [index, block] of input.blocks.entries()) {
    if (!isRecord(block) || !Object.hasOwn(block, "data")) {
      invalid(["blocks", index], "invalid_block", "must contain JSON data.");
    }
    assertJsonSize(block.data as JsonValue, ["blocks", index, "data"]);
  }
  return input;
}
