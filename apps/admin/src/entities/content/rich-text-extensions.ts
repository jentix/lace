import { Extension, mergeAttributes, type Extensions } from "@tiptap/core";
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
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import { isSafeUrl } from "@lacecms/content";

/** The placeholder of an empty paragraph, also exposed as `aria-placeholder`. */
export const RICH_TEXT_PLACEHOLDER = "Write something…";

/** The heading levels permitted by the shared rich-text allowlist. */
export const HEADING_LEVELS = [1, 2, 3] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

/**
 * A link mark whose only attribute is `href`. Tiptap's default link also
 * serializes `target`, `rel`, `class`, and `title`, which the shared
 * rich-text validator rejects.
 */
const SafeLink = Link.extend({
  addAttributes() {
    return {
      href: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute("href") },
    };
  },
}).configure({
  autolink: false,
  HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
  isAllowedUri: (href) => isSafeUrl(href),
  linkOnPaste: false,
  openOnClick: false,
  protocols: ["http", "https", "mailto", "tel"],
});

/** An ordered list without the `start` and `type` attributes the allowlist forbids. */
const SafeOrderedList = OrderedList.extend({
  addAttributes() {
    return {};
  },
  renderHTML({ HTMLAttributes }) {
    return ["ol", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

/** Callbacks for editor shortcuts that open React-owned controls. */
export interface RichTextShortcutHandlers {
  readonly focusToolbar: () => void;
  readonly openLink: () => void;
}

function editorShortcuts(handlers: { readonly current: RichTextShortcutHandlers }) {
  return Extension.create({
    name: "laceEditorShortcuts",
    addKeyboardShortcuts() {
      return {
        "Alt-F10": () => {
          handlers.current.focusToolbar();
          return true;
        },
        "Mod-k": () => {
          handlers.current.openLink();
          return true;
        },
      };
    },
  });
}

/**
 * The editor schema: exactly the shared allowlist of nodes, marks, heading
 * levels, and link forms, plus history, placeholders, and Lace shortcuts.
 */
export function richTextExtensions(handlers: {
  readonly current: RichTextShortcutHandlers;
}): Extensions {
  return [
    Document,
    Paragraph,
    Text,
    Heading.configure({ levels: [...HEADING_LEVELS] }),
    BulletList,
    SafeOrderedList,
    ListItem,
    Blockquote,
    HardBreak,
    Bold,
    Italic,
    Strike,
    Code,
    SafeLink,
    UndoRedo,
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === "heading"
          ? `Heading ${String(node.attrs.level)}`
          : RICH_TEXT_PLACEHOLDER,
    }),
    editorShortcuts(handlers),
  ];
}
