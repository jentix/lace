import { RotateCw } from "lucide-react";
import { useId } from "react";
import { cn } from "../../lib/index.js";
import { Button } from "../Button/index.js";
import { panelClass, panelErrorClass } from "../layout/index.js";

/**
 * A failure alert with a sanitized description and optional request ID. With
 * `onRetry`, it offers the shared "Try again" action for repeatable reads.
 */
export function ErrorState({
  description,
  onRetry,
  retrying = false,
  technicalDetails,
  title = "Something went wrong",
}: {
  readonly description: string;
  readonly onRetry?: (() => void) | undefined;
  readonly retrying?: boolean;
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
      {onRetry === undefined ? undefined : (
        <Button className="mt-2" disabled={retrying} onClick={onRetry} size="sm" variant="outline">
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      )}
    </section>
  );
}
