import type { MediaMetadataDto } from "@lacecms/contracts";
import { MediaStatusBadge, MediaThumbnail } from "../../../entities/media/index.js";
import { cn } from "../../../shared/lib/index.js";

/** Media as square image tiles; activating a tile opens its details. */
export function MediaGrid({
  busy = false,
  items,
  label,
  onOpen,
}: {
  readonly busy?: boolean;
  readonly items: readonly MediaMetadataDto[];
  readonly label: string;
  readonly onOpen: (item: MediaMetadataDto, opener: HTMLElement) => void;
}) {
  return (
    <ul
      aria-busy={busy || undefined}
      aria-label={label}
      className={cn(
        "m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3 p-0 transition-opacity duration-(--duration-fast)",
        busy && "opacity-60",
      )}
    >
      {items.map((item) => (
        <li key={item.id}>
          <button
            aria-haspopup="dialog"
            className="group grid w-full cursor-pointer gap-1.5 rounded-lg border border-border bg-card p-1.5 text-left text-card-foreground shadow-xs transition-colors duration-(--duration-fast) ease-standard hover:border-ring focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring"
            onClick={(event) => onOpen(item, event.currentTarget)}
            type="button"
          >
            <span className="relative block">
              <MediaThumbnail className="aspect-square w-full rounded-md" mediaId={item.id} />
              {item.status === "active" ? undefined : (
                <span className="absolute top-1.5 left-1.5">
                  <MediaStatusBadge status={item.status} />
                </span>
              )}
            </span>
            <span className="truncate px-0.5 text-xs font-medium" title={item.filename}>
              {item.filename}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
