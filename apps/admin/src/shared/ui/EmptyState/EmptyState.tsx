import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { panelClass } from "../layout/index.js";

export function EmptyState({
  action,
  description,
  icon: Icon,
  title,
}: {
  readonly action?: ReactNode;
  readonly description: string;
  readonly icon?: LucideIcon;
  readonly title: string;
}) {
  const titleId = useId();
  return (
    <section className={panelClass} aria-labelledby={titleId}>
      {Icon === undefined ? undefined : (
        <span className="mb-1 grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      )}
      <h2 id={titleId}>{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      {action === undefined ? undefined : <div className="mt-2">{action}</div>}
    </section>
  );
}
