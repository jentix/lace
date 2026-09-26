import type { MediaMetadataDto } from "@lacecms/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AdminClientError,
  adminQueryKeys,
  errorDescription,
  useAdminClient,
} from "../../shared/api/index.js";

/** Requests deletion of an active item, or retries a failed deletion. */
export function useMediaDeletion(onChanged: (item: MediaMetadataDto) => void) {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, retry }: { id: string; retry: boolean }) =>
      retry ? client.retryMediaDeletion(id) : client.deleteMedia(id),
    onSuccess: async (item) => {
      onChanged(item);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.media });
    },
  });
}

/** Explains a refused deletion in terms the editor can act on. */
export function mediaDeletionDescription(error: unknown): string {
  if (error instanceof AdminClientError && error.code === "MEDIA_IN_USE") {
    return "Deletion was refused because content still uses this media. Remove it from every entry, publish those entries, and try again.";
  }
  return error instanceof AdminClientError && error.code === "CONTENT_INVALID_STATE"
    ? "Deletion was refused because this media is no longer active. Refresh the library before retrying."
    : errorDescription(error);
}
