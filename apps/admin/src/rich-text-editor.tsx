import { EditorContent, useEditor } from "@tiptap/react";
import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Code from "@tiptap/extension-code";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import { useEffect } from "react";
import { isSafeUrl } from "@lacecms/content";
import { buttonVariants } from "./components/ui.js";

const extensions = [
  Document,
  Paragraph,
  Text,
  Heading.configure({ levels: [1, 2, 3] }),
  BulletList,
  OrderedList,
  ListItem,
  Blockquote,
  HardBreak,
  Bold,
  Italic,
  Strike,
  Code,
  Link.configure({
    autolink: false,
    linkOnPaste: false,
    openOnClick: false,
    protocols: ["http", "https", "mailto", "tel"],
    isAllowedUri: (href) => isSafeUrl(href),
  }),
];

const surfaceClass = "grid gap-3 rounded-lg border border-input bg-background p-3";
const toolbarButtonClass = buttonVariants({ size: "sm", variant: "secondary" });

export function RichTextEditor({
  describedBy,
  id,
  label,
  onBlur,
  onChange,
  value,
}: {
  readonly describedBy?: string;
  readonly id: string;
  readonly label: string;
  readonly onBlur: () => void;
  readonly onChange: (value: unknown) => void;
  readonly value: unknown;
}) {
  const editor = useEditor({
    content: value ?? { content: [], type: "doc" },
    editorProps: {
      attributes: {
        "aria-label": label,
        class:
          "min-h-32 font-normal outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_h2]:text-lg [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        role: "textbox",
      },
    },
    extensions,
    immediatelyRender: false,
    onBlur,
    onUpdate: ({ editor: updated }) => onChange(updated.getJSON()),
  });
  useEffect(() => {
    if (editor === null || value === undefined) return;
    const next = JSON.stringify(value);
    if (JSON.stringify(editor.getJSON()) !== next)
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  if (editor === null) return <div aria-busy="true" className={surfaceClass} />;
  const setLink = () => {
    const href = window.prompt("Link URL");
    if (href === null) return;
    if (!isSafeUrl(href)) {
      onChange({ type: "invalid" });
      return;
    }
    editor.chain().focus().setLink({ href }).run();
  };
  return (
    <div aria-describedby={describedBy} className={surfaceClass} id={id}>
      <div
        aria-label="Rich text formatting"
        className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2 border-b border-border pb-3"
        role="toolbar"
      >
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleBold().run()}
          type="button"
        >
          Bold
        </button>
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type="button"
        >
          Italic
        </button>
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          type="button"
        >
          Strike
        </button>
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleCode().run()}
          type="button"
        >
          Code
        </button>
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          type="button"
        >
          Heading
        </button>
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          type="button"
        >
          Bullets
        </button>
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          type="button"
        >
          Numbered list
        </button>
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          type="button"
        >
          Quote
        </button>
        <button
          className={toolbarButtonClass}
          onClick={() => editor.chain().focus().setHardBreak().run()}
          type="button"
        >
          Line break
        </button>
        <button className={toolbarButtonClass} onClick={setLink} type="button">
          Link
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
