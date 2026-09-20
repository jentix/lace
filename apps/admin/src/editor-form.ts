import {
  ContentValidationError,
  MAX_SLUG_LENGTH,
  MAX_TITLE_LENGTH,
  validateFieldValue,
} from "@lacecms/content";
import type { BlockMetadata, FieldMetadata, JsonObject } from "@lacecms/content";
import type { ContentBlockDto, ContentModelDto } from "@lacecms/contracts";
import type { FieldErrors, Resolver } from "react-hook-form";

export interface DraftEditorValues {
  blocks: ContentBlockDto[];
  fields: Record<string, unknown>;
  slug?: string;
  title: string;
}

function error(message: string): { readonly message: string; readonly type: "validate" } {
  return { message, type: "validate" };
}

function fieldErrors(
  model: ContentModelDto,
  values: DraftEditorValues,
): FieldErrors<DraftEditorValues> {
  const errors: Record<string, unknown> = {};
  if (values.title.length === 0) errors.title = error("Title is required.");
  else if (values.title.length > MAX_TITLE_LENGTH)
    errors.title = error(`Title must not exceed ${MAX_TITLE_LENGTH} characters.`);
  if (
    model.kind === "collection" &&
    values.slug !== undefined &&
    values.slug.length > MAX_SLUG_LENGTH
  )
    errors.slug = error(`Slug must not exceed ${MAX_SLUG_LENGTH} characters.`);

  const fieldIssues: Record<string, { readonly message: string; readonly type: "validate" }> = {};
  for (const [key, definition] of Object.entries(model.fields)) {
    const value = values.fields[key];
    if (value === undefined) continue;
    try {
      validateFieldValue(definition as FieldMetadata, value, ["fields", key]);
    } catch (caught) {
      if (caught instanceof ContentValidationError)
        fieldIssues[key] = error(caught.issues[0]?.message ?? "Invalid value.");
      else throw caught;
    }
  }
  if (Object.keys(fieldIssues).length > 0) errors.fields = fieldIssues;
  const blockIssues: Record<string, unknown> = {};
  const definitions = new Map(
    (model.blockDefinitions ?? []).map((definition) => [definition.type, definition]),
  );
  const keys = new Set<string>();
  for (const [index, block] of values.blocks.entries()) {
    const issues: Record<string, unknown> = {};
    if (!isUlid(block.key)) issues.key = error("Block keys must be ULIDs.");
    else if (keys.has(block.key)) issues.key = error("Each block must have a unique key.");
    keys.add(block.key);
    const definition = definitions.get(block.type);
    if (definition === undefined || !model.blocks.includes(block.type)) {
      issues.type = error("This block type is not allowed by the model.");
    } else if (block.schemaVersion !== definition.version) {
      issues.schemaVersion = error("This block version is not current.");
    } else {
      const dataIssues = validateBlockData(definition, block.data);
      if (Object.keys(dataIssues).length > 0) issues.data = dataIssues;
    }
    if (Object.keys(issues).length > 0) blockIssues[index] = issues;
  }
  if (Object.keys(blockIssues).length > 0) errors.blocks = blockIssues;
  return errors as FieldErrors<DraftEditorValues>;
}

function validateBlockData(
  definition: BlockMetadata,
  data: JsonObject,
): Record<string, { readonly message: string; readonly type: "validate" }> {
  const issues: Record<string, { readonly message: string; readonly type: "validate" }> = {};
  for (const key of Object.keys(data)) {
    if (!Object.hasOwn(definition.fields, key)) issues[key] = error("This field is not defined.");
  }
  for (const [key, fieldDefinition] of Object.entries(definition.fields)) {
    const value = data[key];
    if (value === undefined) continue;
    try {
      validateFieldValue(fieldDefinition, value, ["blocks", key]);
    } catch (caught) {
      if (caught instanceof ContentValidationError)
        issues[key] = error(caught.issues[0]?.message ?? "Invalid value.");
      else throw caught;
    }
  }
  return issues;
}

export function validateDraftValues(
  model: ContentModelDto,
  values: DraftEditorValues,
): FieldErrors<DraftEditorValues> {
  return fieldErrors(model, values);
}

/** Builds the local draft-mode resolver from validated, serializable model metadata. */
export function createDraftResolver(
  model: ContentModelDto,
): Resolver<DraftEditorValues, unknown, DraftEditorValues> {
  return async (values) => {
    const errors = fieldErrors(model, values);
    return Object.keys(errors).length === 0
      ? { errors: {}, values }
      : ({ errors, values: {} } as never);
  };
}

/** Applies descriptor defaults only when an entry draft has no value for the field. */
export function initialModelFieldValues(
  model: ContentModelDto,
  fields: JsonObject,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(model.fields).map(([key, definition]) => [
      key,
      fields[key] ??
        (Object.hasOwn(definition, "defaultValue") ? definition.defaultValue : undefined),
    ]),
  );
}

export function pointerToFormField(
  path: string,
  model?: ContentModelDto,
  blocks?: readonly ContentBlockDto[],
): "slug" | "title" | `blocks.${number}.data.${string}` | `fields.${string}` | undefined {
  if (path === "/title") return "title";
  if (path === "/slug") return "slug";
  const block = /^\/blocks\/(\d+)\/data\/([A-Za-z][A-Za-z0-9]*)$/u.exec(path);
  if (block !== null && model !== undefined && blocks !== undefined) {
    const [, indexValue, fieldKey] = block;
    if (indexValue === undefined || fieldKey === undefined) return undefined;
    const index = Number(indexValue);
    const definition = model.blockDefinitions?.find((item) => item.type === blocks[index]?.type);
    return definition !== undefined && Object.hasOwn(definition.fields, fieldKey)
      ? `blocks.${index}.data.${fieldKey}`
      : undefined;
  }
  if (!path.startsWith("/fields/")) return undefined;
  const key = path.slice("/fields/".length).replaceAll("~1", "/").replaceAll("~0", "~");
  return /^[A-Za-z][A-Za-z0-9]*$/u.test(key) ? `fields.${key}` : undefined;
}

/** ULID is the browser-created stable identity format for a block snapshot. */
export function isUlid(value: string): boolean {
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/u.test(value);
}

export function suggestSlug(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[^\w\s-]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, MAX_SLUG_LENGTH);
}
