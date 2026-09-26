import { useState } from "react";
import { buttonVariants } from "./components/ui.js";

export function MediaPreview({
  filename,
  mediaId,
}: {
  readonly filename: string;
  readonly mediaId: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const source = `/api/v1/admin/media/${encodeURIComponent(mediaId)}/preview${attempt === 0 ? "" : `?attempt=${attempt}`}`;
  return (
    <div className="grid gap-2">
      {state === "loading" ? <span role="status">Loading preview for {filename}…</span> : undefined}
      {state === "failed" ? (
        <div role="status">
          Preview unavailable for {filename}.{" "}
          <button
            className={buttonVariants({ size: "sm", variant: "secondary" })}
            onClick={() => {
              setState("loading");
              setAttempt((current) => current + 1);
            }}
            type="button"
          >
            Retry preview
          </button>
        </div>
      ) : (
        <img
          alt={`Preview of ${filename}`}
          className="block h-auto max-h-64 max-w-full rounded-md object-contain"
          onError={() => setState("failed")}
          onLoad={() => setState("ready")}
          src={source}
        />
      )}
    </div>
  );
}
