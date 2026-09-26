import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../shared/lib/index.js";
import { mediaPreviewPath } from "../media-limits.js";

/**
 * A decorative, lazily loaded thumbnail read through the admin preview
 * boundary. The surrounding control carries the filename, so a failed image
 * falls back to an icon without losing the item's name.
 */
export function MediaThumbnail({
  className,
  mediaId,
}: {
  readonly className?: string;
  readonly mediaId: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "flex items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        className,
      )}
    >
      {failed ? (
        <ImageOff aria-hidden="true" className="size-6" data-testid="thumbnail-fallback" />
      ) : (
        <img
          alt=""
          className="size-full object-cover"
          decoding="async"
          loading="lazy"
          onError={() => setFailed(true)}
          src={mediaPreviewPath(mediaId)}
        />
      )}
    </span>
  );
}
