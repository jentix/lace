import { type ReactNode, useId } from "react";
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
  const titleId = useId();
  return (
    <section className={panelClass} aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}
