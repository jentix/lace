import { CircleAlert, CircleCheck, LoaderCircle, RotateCcw, X } from "lucide-react";
import { formatBytes } from "../../../shared/lib/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import type { MediaUploadEntry } from "../useMediaUploads.js";

function summary(uploads: readonly MediaUploadEntry[]): string {
  const uploaded = uploads.filter((upload) => upload.state === "uploaded").length;
  const failed = uploads.filter(
    (upload) => upload.state === "failed" || upload.state === "rejected",
  ).length;
  const pending = uploads.length - uploaded - failed;
  return [
    `${uploaded} of ${uploads.length} uploaded`,
    ...(failed > 0 ? [`${failed} failed`] : []),
    ...(pending > 0 ? [`${pending} in progress`] : []),
  ].join(", ");
}

function stateText(upload: MediaUploadEntry): string {
  switch (upload.state) {
    case "queued":
      return "Waiting to upload";
    case "uploading":
      return upload.progress === undefined
        ? "Uploading…"
        : `Uploading ${Math.round(upload.progress * 100)}%`;
    case "uploaded":
      return "Uploaded";
    case "failed":
    case "rejected":
      return upload.message ?? "Upload failed";
  }
}

/** Per-file upload rows with progress, errors, retry, and dismissal. */
export function UploadQueue({
  onClearFinished,
  onDismiss,
  onRetry,
  uploads,
}: {
  readonly onClearFinished: () => void;
  readonly onDismiss: (key: string) => void;
  readonly onRetry: (key: string) => void;
  readonly uploads: readonly MediaUploadEntry[];
}) {
  if (uploads.length === 0) return null;
  const finished = uploads.some(
    (upload) => upload.state !== "queued" && upload.state !== "uploading",
  );
  return (
    <section
      aria-label="Uploads"
      className="grid gap-2 rounded-lg border border-border bg-card p-3 text-card-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="m-0 text-sm font-medium">
          {summary(uploads)}
        </p>
        {finished ? (
          <Button onClick={onClearFinished} size="sm" variant="ghost">
            Clear finished
          </Button>
        ) : undefined}
      </div>
      <ul aria-label="Upload queue" className="m-0 grid list-none gap-2 p-0">
        {uploads.map((upload) => {
          const failed = upload.state === "failed" || upload.state === "rejected";
          const name = upload.file.name;
          return (
            <li className="grid gap-1.5 text-sm" key={upload.key}>
              <div className="flex items-center gap-2">
                {upload.state === "uploaded" ? (
                  <CircleCheck
                    aria-hidden="true"
                    className="size-4 shrink-0 text-success-foreground"
                  />
                ) : failed ? (
                  <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-destructive" />
                ) : (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
                  />
                )}
                <span className="min-w-0 flex-1 truncate font-medium" title={name}>
                  {name}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatBytes(upload.file.size)}
                </span>
                {upload.state === "failed" ? (
                  <Button
                    aria-label={`Retry upload of ${name}`}
                    onClick={() => onRetry(upload.key)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <RotateCcw aria-hidden="true" />
                  </Button>
                ) : undefined}
                {upload.state === "queued" || upload.state === "uploading" ? undefined : (
                  <Button
                    aria-label={`Dismiss ${name}`}
                    onClick={() => onDismiss(upload.key)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
              {upload.state === "uploading" ? (
                <div
                  aria-label={`Upload progress for ${name}`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  {...(upload.progress === undefined
                    ? {}
                    : { "aria-valuenow": Math.round(upload.progress * 100) })}
                  className="h-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                >
                  <div
                    className="h-full bg-primary transition-[width] duration-(--duration-fast) ease-standard"
                    style={{ width: `${Math.round((upload.progress ?? 0) * 100)}%` }}
                  />
                </div>
              ) : undefined}
              <p
                className={
                  failed ? "m-0 text-xs text-destructive" : "m-0 text-xs text-muted-foreground"
                }
                role={failed ? "alert" : undefined}
              >
                {stateText(upload)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
