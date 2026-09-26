import type { ReactNode } from "react";
import { panelClass } from "../layout/index.js";

export function EmptyState({
  action,
  description,
  title,
}: {
  readonly action?: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <section className={panelClass} aria-labelledby="empty-state-title">
      <h2 id="empty-state-title">{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}
