import type { ContentEntryStatusDto } from "@lacecms/contracts";
import { Badge } from "../../../shared/ui/Badge/index.js";

const presentation = {
  changed: { label: "Changed", variant: "secondary" },
  draft: { label: "Draft", variant: "warning" },
  published: { label: "Published", variant: "success" },
} as const;

/** The derived publication status of an entry: draft, published, or published with later changes. */
export function EntryStatusBadge({ status }: { readonly status: ContentEntryStatusDto }) {
  const { label, variant } = presentation[status];
  return (
    <Badge
      className={status === "changed" ? "bg-accent text-accent-foreground" : undefined}
      variant={variant}
    >
      {label}
    </Badge>
  );
}
