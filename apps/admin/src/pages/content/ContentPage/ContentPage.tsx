import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useSessionRecovery } from "../../../entities/session/index.js";
import {
  adminQueryKeys,
  errorDescription,
  technicalDetails,
  useAdminClient,
} from "../../../shared/api/index.js";
import { EmptyState } from "../../../shared/ui/EmptyState/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { pageClass } from "../../../shared/ui/layout/index.js";
import { LoadingState } from "../../../shared/ui/LoadingState/index.js";

export function ContentPage() {
  const client = useAdminClient();
  const models = useQuery({ queryFn: client.listModels, queryKey: adminQueryKeys.models });
  useSessionRecovery(models.error);
  return (
    <section className={pageClass} aria-labelledby="content-title">
      <h1 id="content-title">Content</h1>
      {models.isPending ? <LoadingState label="Loading content models" lines={3} /> : undefined}
      {models.error === null ? undefined : (
        <ErrorState
          description={errorDescription(models.error)}
          technicalDetails={technicalDetails(models.error)}
        />
      )}
      {models.data?.items.length === 0 ? (
        <EmptyState
          description="Define a page or collection in lace.config.ts, restart the local API, then run pnpm content:sync. Models are defined in code."
          title="No content models configured"
        />
      ) : undefined}
      {models.data === undefined || models.data.items.length === 0 ? undefined : (
        <div className="grid gap-2 [&>a]:rounded-md [&>a]:border [&>a]:border-border [&>a]:bg-card [&>a]:p-3 [&>a]:text-card-foreground [&>a]:transition-colors [&>a:hover]:bg-accent [&>a:hover]:text-accent-foreground">
          {models.data.items.map((model) =>
            model.kind === "page" ? (
              <PageModelLink key={model.key} modelKey={model.key} />
            ) : (
              <Link key={model.key} params={{ modelKey: model.key }} to="/content/$modelKey">
                {model.label ?? model.key}
              </Link>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function PageModelLink({ modelKey }: { readonly modelKey: string }) {
  const client = useAdminClient();
  const page = useQuery({
    queryFn: () => client.listEntries(modelKey),
    queryKey: adminQueryKeys.entries(modelKey),
  });
  useSessionRecovery(page.error);
  if (page.isPending) return <LoadingState label={`Loading ${modelKey}`} lines={1} />;
  if (page.error !== null)
    return (
      <ErrorState
        description={errorDescription(page.error)}
        technicalDetails={technicalDetails(page.error)}
      />
    );
  const entry = page.data.items[0];
  return entry === undefined ? (
    <EmptyState
      description="This page has no editable draft yet. Local synchronization may be pending: run pnpm content:sync, then reload."
      title="Page draft missing"
    />
  ) : (
    <Link params={{ entryId: entry.id, modelKey }} to="/content/$modelKey/$entryId">
      {modelKey}
    </Link>
  );
}
