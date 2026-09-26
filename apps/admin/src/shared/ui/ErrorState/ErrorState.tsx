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
  return (
    <section
      className={cn(panelClass, panelErrorClass)}
      aria-labelledby="error-state-title"
      role="alert"
    >
      <h2 id="error-state-title">{title}</h2>
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
