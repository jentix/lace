import { useId } from "react";
import { cn } from "../../lib/index.js";
import { panelClass, panelErrorClass } from "../layout/index.js";

export function ErrorState({
  description,
  technicalDetails,
  title = "Something went wrong",
}: {
  readonly description: string;
  readonly technicalDetails?: string | undefined;
  readonly title?: string;
}) {
  const titleId = useId();
  return (
    <section className={cn(panelClass, panelErrorClass)} aria-labelledby={titleId} role="alert">
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {technicalDetails === undefined ? undefined : (
        <details>
          <summary>Technical details</summary>
          <p>Request ID: {technicalDetails}</p>
        </details>
      )}
    </section>
  );
}
