import { useQuery } from "@tanstack/react-query";
import { useSessionRecovery } from "../../../entities/session/index.js";
import { adminQueryKeys, errorDescription, useAdminClient } from "../../../shared/api/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { LoadingState } from "../../../shared/ui/LoadingState/index.js";
import { cardClass } from "../../../shared/ui/layout/index.js";

export function CurrentBuildSite() {
  const client = useAdminClient();
  const selection = useQuery({ queryKey: adminQueryKeys.buildSite, queryFn: client.loadBuildSite });
  useSessionRecovery(selection.error);
  return (
    <section className={cardClass} aria-label="Current build site">
      <h2 className="m-0">Current build site</h2>
      {selection.isPending ? <LoadingState label="Loading build site" lines={1} /> : undefined}
      {selection.error === null ? undefined : (
        <ErrorState
          title="Build site unavailable"
          description={errorDescription(selection.error)}
          onRetry={() => void selection.refetch()}
          retrying={selection.isFetching}
        />
      )}
      {selection.data?.site === null ? (
        <p className="m-0">No build site identity configured.</p>
      ) : undefined}
      {selection.data?.site ? (
        <p className="m-0">
          <strong>{selection.data.site.label}</strong>{" "}
          <span className="text-muted-foreground">({selection.data.site.id})</span>
        </p>
      ) : undefined}
      <p className="m-0 text-sm text-muted-foreground">
        The operator selects this site in deployment configuration. This identifies the current
        configuration; build history records earlier outcomes.
      </p>
    </section>
  );
}
