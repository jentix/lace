import { errorDescription, technicalDetails } from "../../api/index.js";
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

export function PageError({ error }: { readonly error: unknown }) {
  return (
    <section className={pageClass}>
      <ErrorState
        description={errorDescription(error)}
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

export function PageAccessDenied() {
  return (
    <section className={pageClass} aria-labelledby="access-denied-title">
      <ErrorState
        description="Your role does not have permission to view this route."
        title="Access denied"
      />
    </section>
  );
}
