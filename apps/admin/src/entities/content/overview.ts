import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys, useAdminClient } from "../../shared/api/index.js";

/**
 * The first entry and per-status totals of a model. Pages read their singleton
 * from it and collections their counts; the shell and content overview share it.
 */
export function useEntryOverview(modelKey: string) {
  const client = useAdminClient();
  return useQuery({
    queryFn: () => client.listEntries(modelKey, undefined, { limit: 1 }),
    queryKey: adminQueryKeys.entryOverview(modelKey),
    staleTime: 30_000,
  });
}
