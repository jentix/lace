import type { MediaMetadataDto } from "@lacecms/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { EntryStatusBadge } from "../../../entities/content/index.js";
import {
  formatMediaDimensions,
  MediaPreview,
  MediaStatusBadge,
  mediaTypeLabel,
} from "../../../entities/media/index.js";
import { useSessionRecovery } from "../../../entities/session/index.js";
import {
  DeleteMediaDialog,
  mediaDeletionDescription,
  useMediaDeletion,
} from "../../../features/delete-media/index.js";
import {
  adminQueryKeys,
  errorDescription,
  technicalDetails,
  useAdminClient,
} from "../../../shared/api/index.js";
import { formatAbsoluteTime, formatBytes } from "../../../shared/lib/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { LoadingState } from "../../../shared/ui/LoadingState/index.js";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../../shared/ui/Sheet/index.js";
import { usageLocationLabel } from "./usage-labels.js";

const sectionHeadingClass = "m-0 text-sm font-semibold";

/**
 * The side panel describing one media item: preview, facts, where it is used,
 * the public URL, and (for writers) confirmed, usage-aware deletion. Focus
 * returns to `returnFocus` because the panel opens without a trigger.
 */
export function MediaDetailsPanel({
  canWrite,
  item,
  onChanged,
  onClose,
  returnFocus,
}: {
  readonly canWrite: boolean;
  readonly item: MediaMetadataDto | undefined;
  readonly onChanged: (item: MediaMetadataDto) => void;
  readonly onClose: () => void;
  readonly returnFocus: () => void;
}) {
  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={item !== undefined}
    >
      {item === undefined ? undefined : (
        <SheetContent
          className="w-full gap-0 overflow-y-auto sm:max-w-md"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus();
          }}
          // Focus the panel itself rather than its first control (the URL field).
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
        >
          <MediaDetails canWrite={canWrite} item={item} key={item.id} onChanged={onChanged} />
        </SheetContent>
      )}
    </Sheet>
  );
}

function MediaDetails({
  canWrite,
  item,
  onChanged,
}: {
  readonly canWrite: boolean;
  readonly item: MediaMetadataDto;
  readonly onChanged: (item: MediaMetadataDto) => void;
}) {
  const client = useAdminClient();
  const [copyStatus, setCopyStatus] = useState<string | undefined>();
  const detail = useQuery({
    queryFn: () => client.getMedia(item.id),
    queryKey: adminQueryKeys.mediaDetail(item.id),
  });
  const retry = useMediaDeletion(onChanged);
  useSessionRecovery(detail.error ?? retry.error);
  const usage = detail.data?.usage;
  const usageCount = detail.data?.usageCount ?? item.usageCount;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopyStatus("URL copied.");
    } catch {
      setCopyStatus("The URL could not be copied. Copy it from the field instead.");
    }
  }

  return (
    <>
      <SheetHeader className="pr-10">
        <SheetTitle className="break-all">{item.filename}</SheetTitle>
        <SheetDescription>
          {mediaTypeLabel(item.mimeType)} · {formatBytes(item.size)}
        </SheetDescription>
      </SheetHeader>
      <div className="grid gap-5 px-4 pb-6">
        <MediaPreview
          className="max-h-80 w-full bg-muted"
          filename={item.filename}
          mediaId={item.id}
        />
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm [&_dd]:m-0 [&_dt]:text-muted-foreground">
          <dt>Type</dt>
          <dd>{mediaTypeLabel(item.mimeType)}</dd>
          <dt>Dimensions</dt>
          <dd className="tabular-nums">{formatMediaDimensions(item)}</dd>
          <dt>Size</dt>
          <dd className="tabular-nums">{formatBytes(item.size)}</dd>
          <dt>Uploaded by</dt>
          <dd>{item.createdBy.displayName}</dd>
          <dt>Uploaded</dt>
          <dd>
            <time dateTime={item.createdAt}>{formatAbsoluteTime(item.createdAt)}</time>
          </dd>
          <dt>Status</dt>
          <dd>
            <MediaStatusBadge status={item.status} />
          </dd>
        </dl>

        <section aria-labelledby="media-usage-heading" className="grid gap-2">
          <h2 className={sectionHeadingClass} id="media-usage-heading">
            Used in
          </h2>
          {detail.isPending ? <LoadingState label="Loading usage" lines={2} /> : undefined}
          {detail.error === null ? undefined : (
            <ErrorState
              description={errorDescription(detail.error)}
              technicalDetails={technicalDetails(detail.error)}
              title="Usage could not be loaded"
            />
          )}
          {usage !== undefined && usage.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">Not used by any entry.</p>
          ) : undefined}
          {usage === undefined || usage.length === 0 ? undefined : (
            <ul aria-label="Entries using this media" className="m-0 grid list-none gap-2 p-0">
              {usage.map((entry) => (
                <li
                  className="grid gap-1 rounded-md border border-border p-2.5 text-sm"
                  key={entry.entryId}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                      params={{ entryId: entry.entryId, modelKey: entry.modelKey }}
                      to="/content/$modelKey/$entryId"
                    >
                      {entry.title}
                    </Link>
                    <EntryStatusBadge status={entry.status} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {entry.modelKey}
                    </span>
                  </div>
                  <ul className="m-0 grid list-none gap-0.5 p-0 text-xs text-muted-foreground">
                    {entry.locations.map((location, index) => (
                      <li key={`${location.source}-${index}`}>{usageLocationLabel(location)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          {usage !== undefined && usageCount > usage.length ? (
            <p className="m-0 text-sm text-muted-foreground">
              {`Used by ${usageCount} entries; only the ${usage.length} most recently edited are shown.`}
            </p>
          ) : undefined}
        </section>

        <section aria-labelledby="media-url-heading" className="grid gap-2">
          <h2 className={sectionHeadingClass} id="media-url-heading">
            Public URL
          </h2>
          <div className="flex gap-2">
            <input
              aria-label="Public URL"
              className="min-h-8 min-w-0 flex-1 rounded-md border border-input bg-muted px-2.5 font-mono text-xs text-foreground"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              value={item.url}
            />
            <Button onClick={() => void copyUrl()} variant="outline">
              <Copy aria-hidden="true" />
              Copy URL
            </Button>
          </div>
          <p className="m-0 text-xs text-muted-foreground">
            The public URL serves the file only once published content uses it.
          </p>
          <p aria-live="polite" className="m-0 text-xs" role="status">
            {copyStatus}
          </p>
        </section>

        {canWrite && item.status !== "deleting" ? (
          <section aria-labelledby="media-delete-heading" className="grid gap-2">
            <h2 className={sectionHeadingClass} id="media-delete-heading">
              Deletion
            </h2>
            {item.status === "delete_failed" ? (
              <>
                <p className="m-0 text-sm text-muted-foreground">
                  Removing the file from storage failed. Retry to queue the removal again.
                </p>
                <Button
                  className="justify-self-start"
                  disabled={retry.isPending}
                  onClick={() => retry.mutate({ id: item.id, retry: true })}
                  variant="outline"
                >
                  <RotateCcw aria-hidden="true" />
                  Retry deletion
                </Button>
                {retry.error === null ? undefined : (
                  <p className="m-0 text-sm text-destructive" role="alert">
                    {mediaDeletionDescription(retry.error)}
                  </p>
                )}
              </>
            ) : usageCount > 0 ? (
              <>
                <p className="m-0 text-sm text-muted-foreground">
                  {`This media is used by ${usageCount === 1 ? "1 entry" : `${usageCount} entries`}. Remove it from every listed entry and publish those entries before deleting it.`}
                </p>
                <Button className="justify-self-start" disabled variant="outline">
                  Delete media
                </Button>
              </>
            ) : (
              <div className="justify-self-start">
                <DeleteMediaDialog item={item} onChanged={onChanged} />
              </div>
            )}
          </section>
        ) : undefined}
      </div>
    </>
  );
}
