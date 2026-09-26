import { Editor } from "@tiptap/core";
import { validateRichTextDocument } from "@lacecms/content";
import { afterEach, expect, test, vi } from "vitest";
import { richTextExtensions } from "./rich-text-extensions.js";

const editors: Editor[] = [];

function createEditor(content: string | object) {
  const handlers = { current: { focusToolbar: vi.fn(), openLink: vi.fn() } };
  const editor = new Editor({ content, extensions: richTextExtensions(handlers) });
  editors.push(editor);
  return { editor, handlers };
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

test("every toolbar action produces a document the shared validator accepts", () => {
  const { editor } = createEditor("<p>Hello world</p>");
  const actions: ((chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>)[] = [
    (chain) => chain.toggleBold(),
    (chain) => chain.toggleItalic(),
    (chain) => chain.toggleStrike(),
    (chain) => chain.toggleCode(),
    (chain) => chain.setLink({ href: "https://example.com" }),
    (chain) => chain.setHeading({ level: 1 }),
    (chain) => chain.setHeading({ level: 3 }),
    (chain) => chain.setParagraph(),
    (chain) => chain.toggleBulletList(),
    (chain) => chain.toggleOrderedList(),
    (chain) => chain.toggleBlockquote(),
    (chain) => chain.setHardBreak(),
  ];
  for (const action of actions) {
    editor.commands.selectAll();
    action(editor.chain()).run();
    expect(() => validateRichTextDocument(editor.getJSON())).not.toThrow();
  }
});

test("links carry only href and ordered lists carry no attributes", () => {
  const { editor } = createEditor(
    '<p><a class="x" href="https://example.com" target="_blank" title="t">Link</a></p><ol start="3" type="a"><li><p>Item</p></li></ol>',
  );
  const json = editor.getJSON();
  expect(json.content?.[0]?.content?.[0]?.marks).toEqual([
    { attrs: { href: "https://example.com" }, type: "link" },
  ]);
  expect(json.content?.[1]).not.toHaveProperty("attrs");
  expect(() => validateRichTextDocument(json)).not.toThrow();
});

test("pasted HTML is reduced to the allowlist and unsafe links are dropped", () => {
  const { editor } = createEditor(
    '<h4 style="color:red">Deep</h4><p onclick="x()"><a href="javascript:alert(1)">bad</a> <img src="x"><u>under</u></p>',
  );
  const json = editor.getJSON();
  expect(JSON.stringify(json)).not.toContain("javascript");
  expect(() => validateRichTextDocument(json)).not.toThrow();
});

test("undo and redo restore earlier documents", () => {
  const { editor } = createEditor("<p>One</p>");
  editor.chain().selectAll().toggleBold().run();
  expect(editor.isActive("bold")).toBe(true);
  editor.commands.undo();
  expect(JSON.stringify(editor.getJSON())).not.toContain("bold");
  editor.commands.redo();
  expect(JSON.stringify(editor.getJSON())).toContain("bold");
});

test("editor shortcuts call their handlers", () => {
  const { editor, handlers } = createEditor("<p>One</p>");
  const press = (key: string, init: KeyboardEventInit) =>
    editor.view.someProp("handleKeyDown", (handler) =>
      handler(editor.view, new KeyboardEvent("keydown", { key, ...init })),
    );
  press("k", { ctrlKey: true });
  press("F10", { altKey: true });
  expect(handlers.current.openLink).toHaveBeenCalled();
  expect(handlers.current.focusToolbar).toHaveBeenCalled();
});
