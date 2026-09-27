import { Link } from "@tanstack/react-router";
import { ShieldOff, type LucideIcon } from "lucide-react";
import { errorDescription, technicalDetails } from "../../api/index.js";
import { Button } from "../Button/index.js";
import { EmptyState } from "../EmptyState/index.js";
import { ErrorState } from "../ErrorState/index.js";
import { LoadingState } from "../LoadingState/index.js";
import { pageClass } from "../layout/index.js";

/** Route-level states shared by every page: loading, failure, placeholder, and denial. */
export function PageLoading({ label }: { readonly label: string }) {
  return (
    <section className={pageClass}>
      <LoadingState label={label} lines={3} />
    </section>
  );
}

export function PageError({
  error,
  onRetry,
}: {
  readonly error: unknown;
  readonly onRetry?: () => void;
}) {
  return (
    <section className={pageClass}>
      <ErrorState
        description={errorDescription(error)}
        onRetry={onRetry}
        technicalDetails={technicalDetails(error)}
      />
    </section>
  );
}

export function PagePlaceholder({
  description,
  title,
}: {
  readonly description: string;
  readonly title: string;
}) {
  return (
    <section className={pageClass} aria-labelledby="route-title">
      <h1 id="route-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}

/** A route that cannot be shown, with a decorative icon and the way back to Content. */
export function PageDeadEnd({
  description,
  icon,
  title,
}: {
  readonly description: string;
  readonly icon: LucideIcon;
  readonly title: string;
}) {
  return (
    <section className={pageClass}>
      <EmptyState
        action={
          <Button asChild variant="outline">
            <Link to="/content">Go to Content</Link>
          </Button>
        }
        description={description}
        icon={icon}
        title={title}
      />
    </section>
  );
}

export function PageAccessDenied() {
  return (
    <PageDeadEnd
      description="Your role does not have permission to view this route. Ask an administrator if you need access."
      icon={ShieldOff}
      title="Access denied"
    />
  );
}
