import {
  contentEntrySortSchema,
  contentEntryStatusSchema,
  MAX_ENTRY_SEARCH_LENGTH,
  type ContentEntrySortDto,
  type ContentEntryStatusDto,
} from "@lacecms/contracts";
import * as v from "valibot";
import { DEFAULT_ENTRY_SORT } from "../../shared/api/index.js";

/**
 * The collection-list search, status filter, and sort carried in the route URL.
 * Every key is present so an unsupported raw value inherited from the root
 * route's unvalidated search is overridden rather than passed through.
 */
export interface CollectionSearch {
  readonly q: string | undefined;
  readonly sort: ContentEntrySortDto | undefined;
  readonly status: ContentEntryStatusDto | undefined;
}

/**
 * Keeps only the list parameters the API accepts. Unsupported values are
 * dropped instead of failing the route, and the API default sort is omitted
 * so equivalent lists share one URL.
 */
export function parseCollectionSearch(search: Record<string, unknown>): CollectionSearch {
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const status = v.safeParse(contentEntryStatusSchema, search.status);
  const sort = v.safeParse(contentEntrySortSchema, search.sort);
  return {
    q: q.length > 0 && q.length <= MAX_ENTRY_SEARCH_LENGTH ? q : undefined,
    sort: sort.success && sort.output !== DEFAULT_ENTRY_SORT ? sort.output : undefined,
    status: status.success ? status.output : undefined,
  };
}
