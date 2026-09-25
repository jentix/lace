import { useState } from "react";

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
    <div className="lace-media-preview">
      {state === "loading" ? <span role="status">Loading preview for {filename}…</span> : undefined}
      {state === "failed" ? (
        <div role="status">
          Preview unavailable for {filename}.{" "}
          <button
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
          onError={() => setState("failed")}
          onLoad={() => setState("ready")}
          src={source}
        />
      )}
    </div>
  );
}
