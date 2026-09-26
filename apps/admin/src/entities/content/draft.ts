import { canonicalizeJson, type JsonValue } from "@lacecms/content";
import type { ContentBlockDto, ContentEntryDto, ContentModelDto } from "@lacecms/contracts";
import { initialModelFieldValues, type DraftEditorValues } from "./editor-form.js";

/** Form values for an entry draft, with block defaults filled from the block definitions. */
export function draftValues(model: ContentModelDto, entry: ContentEntryDto): DraftEditorValues {
  return {
    blocks: entry.draft.blocks.map((block) => {
      const definition = model.blockDefinitions?.find((item) => item.type === block.type);
      if (definition === undefined) return block;
      return {
        ...block,
        data: Object.fromEntries(
          Object.entries(definition.fields).map(([key, field]) => [
            key,
            block.data[key] ?? ("defaultValue" in field ? field.defaultValue : undefined),
          ]),
        ) as ContentBlockDto["data"],
      };
    }),
    fields: initialModelFieldValues(model, entry.draft.fields),
    ...(entry.draft.slug === undefined ? {} : { slug: entry.draft.slug }),
    title: entry.draft.title,
  };
}

/** The public path of the entry's published (or draft) route, when the model routes it. */
export function resolvedPublicPath(
  model: ContentModelDto,
  entry: ContentEntryDto,
): string | undefined {
  if (model.kind === "page") return model.path;
  const slug = (entry.published ?? entry.draft).slug;
  return slug === undefined ? undefined : model.route?.replace(":slug", slug);
}

/** Canonical JSON of the local draft so an author can keep it during a conflict. */
export function localDraftJson(values: DraftEditorValues): string {
  return canonicalizeJson({
    blocks: values.blocks,
    fields: values.fields,
    ...(values.slug === undefined ? {} : { slug: values.slug }),
    title: values.title,
  } as unknown as JsonValue);
}

/** A human label for a field or block key when the definition supplies none. */
export function fieldLabel(key: string, label: string | undefined): string {
  return label ?? key.replace(/([A-Z])/gu, " $1").replace(/^./u, (value) => value.toUpperCase());
}
