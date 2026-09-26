import type { MediaMetadataDto } from "@lacecms/contracts";
import { Badge } from "../../../shared/ui/Badge/index.js";

const presentation = {
  active: { label: "Active", variant: "success" },
  delete_failed: { label: "Deletion failed", variant: "destructive" },
  deleting: { label: "Deletion pending", variant: "warning" },
} as const;

/** The lifecycle status of a media item; `deleting` reads as pending, never as removed. */
export function MediaStatusBadge({ status }: { readonly status: MediaMetadataDto["status"] }) {
  const { label, variant } = presentation[status];
  return <Badge variant={variant}>{label}</Badge>;
}
