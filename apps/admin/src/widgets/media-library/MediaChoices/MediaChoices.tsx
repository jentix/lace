import type { MediaListDto, MediaMetadataDto } from "@lacecms/contracts";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MediaPreview } from "../../../entities/media/index.js";
import { useSession, useSessionRecovery } from "../../../entities/session/index.js";
import { MediaUpload } from "../../../features/upload-media/index.js";
import {
  adminQueryKeys,
  errorDescription,
  technicalDetails,
  useAdminClient,
} from "../../../shared/api/index.js";
import { cn } from "../../../shared/lib/index.js";
import { Button, buttonVariants } from "../../../shared/ui/Button/index.js";
import { EmptyState } from "../../../shared/ui/EmptyState/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { actionsClass, listClass } from "../../../shared/ui/layout/index.js";
import { LoadingState } from "../../../shared/ui/LoadingState/index.js";

const compactButtonClass = buttonVariants({ size: "sm", variant: "outline" });

/**
 * The inline paged chooser of the media field picker: offers only active items
 * as choices and keeps an unresolved selection visible. Session 18C replaces
 * it with a dialog around the library grid.
 */
export function MediaChoices({
  onSelect,
  selectionLabel,
  value,
}: {
  readonly onSelect: (id: string | undefined) => void;
  readonly selectionLabel: string;
  readonly value?: string | undefined;
}) {
  const client = useAdminClient();
  const session = useSession();
  const [recent, setRecent] = useState<MediaMetadataDto | undefined>();
  const [previewId, setPreviewId] = useState<string | undefined>();
  const media = useInfiniteQuery<
    MediaListDto,
    Error,
    InfiniteData<MediaListDto>,
    ReturnType<typeof adminQueryKeys.mediaList>,
    string | undefined
  >({
    getNextPageParam: (page) => page.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => client.listMedia(pageParam),
    queryKey: adminQueryKeys.mediaList({}),
  });
  useSessionRecovery(media.error);
  const listed = media.data?.pages.flatMap((page) => page.items) ?? [];
  const items =
    recent === undefined || listed.some((item) => item.id === recent.id)
      ? listed
      : [recent, ...listed];
  const visible = items.filter((item) => item.status === "active");
  const current = items.find((item) => item.id === value);
  const canWrite = session.role !== "viewer";
  return (
    <div className="grid gap-2">
      <div aria-live="polite">
        <p>{value === undefined ? "No media selected" : `Selected: ${value}`}</p>
        {value !== undefined && current === undefined ? (
          <p>
            {media.hasNextPage || media.isPending
              ? "Selection not found in loaded pages yet."
              : "Selected media is unavailable or inaccessible."}
          </p>
        ) : current !== undefined && current.status !== "active" ? (
          <p>Selected media is unavailable or inaccessible.</p>
        ) : undefined}
        {value === undefined ? undefined : (
          <Button onClick={() => onSelect(undefined)} type="button" variant="outline">
            Clear selection
          </Button>
        )}
      </div>
      {canWrite ? <MediaUpload onUploaded={setRecent} selectable /> : undefined}
      {media.isPending ? <LoadingState label="Loading media" lines={3} /> : undefined}
      {media.error === null ? undefined : (
        <ErrorState
          description={errorDescription(media.error)}
          technicalDetails={technicalDetails(media.error)}
        />
      )}
      {media.data !== undefined && visible.length === 0 ? (
        <EmptyState
          title="No active media is available"
          description={
            canWrite ? "Upload an image to get started." : "No images are available to select."
          }
        />
      ) : undefined}
      {visible.length === 0 ? undefined : (
        <ul aria-label={`Media choices for ${selectionLabel}`} className={listClass}>
          {visible.map((item) => (
            <li className="grid gap-2 rounded-md border border-border p-3" key={item.id}>
              <div className="grid gap-2 [&>span]:text-muted-foreground">
                <strong>{item.filename}</strong>
                <span>
                  {item.mimeType} · {item.size} bytes
                </span>
              </div>
              <div className={actionsClass}>
                <Button
                  onClick={() => setPreviewId(previewId === item.id ? undefined : item.id)}
                  type="button"
                  variant="outline"
                >
                  {previewId === item.id ? "Hide preview" : `Preview ${item.filename}`}
                </Button>
                <button
                  aria-pressed={value === item.id}
                  className={cn(
                    compactButtonClass,
                    "aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground",
                  )}
                  onClick={() => onSelect(item.id)}
                  type="button"
                >
                  {item.filename}
                </button>
              </div>
              {previewId === item.id ? (
                <MediaPreview filename={item.filename} mediaId={item.id} />
              ) : undefined}
            </li>
          ))}
        </ul>
      )}
      {media.hasNextPage ? (
        <Button
          disabled={media.isFetchingNextPage}
          onClick={() => media.fetchNextPage()}
          type="button"
          variant="outline"
        >
          {media.isFetchingNextPage ? "Loading more media…" : "Load more media"}
        </Button>
      ) : undefined}
    </div>
  );
}
