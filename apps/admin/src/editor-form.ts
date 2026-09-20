import {
  ContentValidationError,
  MAX_SLUG_LENGTH,
  MAX_TITLE_LENGTH,
  validateFieldValue,
} from "@lacecms/content";
import type { FieldMetadata, JsonObject } from "@lacecms/content";
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
  return errors as FieldErrors<DraftEditorValues>;
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
): "slug" | "title" | `fields.${string}` | undefined {
  if (path === "/title") return "title";
  if (path === "/slug") return "slug";
  if (!path.startsWith("/fields/")) return undefined;
  const key = path.slice("/fields/".length).replaceAll("~1", "/").replaceAll("~0", "~");
  return /^[A-Za-z][A-Za-z0-9]*$/u.test(key) ? `fields.${key}` : undefined;
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
