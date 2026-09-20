import { assertSafeHref, assertSafeRichTextDocument } from "./rich-text.js";
import type { SafeRichTextDocument } from "./rich-text.js";
import type { SiteBlock } from "./site-data.js";

export type PublicBlock = SiteBlock;

export interface BlockContext {
  readonly entryId: string;
  readonly key: string;
  readonly modelKey: string;
}

const renderableBlockTypes = new Set(["hero", "richText", "image", "quote", "cta"]);

function failure(context: BlockContext, detail: string): never {
  throw new TypeError(
    `Cannot render block ${context.key} for model ${context.modelKey} entry ${context.entryId}: ${detail}`,
  );
}

export function assertRenderableBlock(block: PublicBlock, context: BlockContext): void {
  if (!renderableBlockTypes.has(block.type))
    failure(context, `unsupported block type ${block.type}.`);
}

export function readRequiredString(
  block: PublicBlock,
  context: BlockContext,
  field: string,
): string {
  const value = block.data[field];
  if (typeof value !== "string" || value.length === 0)
    failure(context, `${field} must be a non-empty string.`);
  return value;
}

export function readOptionalString(
  block: PublicBlock,
  context: BlockContext,
  field: string,
): string | undefined {
  const value = block.data[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") failure(context, `${field} must be a string.`);
  return value;
}

export function readUrl(block: PublicBlock, context: BlockContext, field: string): string {
  try {
    return assertSafeHref(readRequiredString(block, context, field), field);
  } catch (cause) {
    failure(context, cause instanceof Error ? cause.message : `${field} must be an allowed URL.`);
  }
}

export function readOptionalDocument(
  block: PublicBlock,
  context: BlockContext,
  field: string,
): SafeRichTextDocument | undefined {
  const value = block.data[field];
  if (value === undefined) return undefined;
  try {
    return assertSafeRichTextDocument(value);
  } catch (cause) {
    failure(context, cause instanceof Error ? cause.message : `${field} must be safe rich text.`);
  }
}

export function readDocument(
  block: PublicBlock,
  context: BlockContext,
  field: string,
): SafeRichTextDocument {
  const document = readOptionalDocument(block, context, field);
  if (document === undefined) failure(context, `${field} is required.`);
  return document;
}
