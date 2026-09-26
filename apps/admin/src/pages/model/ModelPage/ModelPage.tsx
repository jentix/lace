import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useSessionRecovery } from "../../../entities/session/index.js";
import { adminQueryKeys, useAdminClient } from "../../../shared/api/index.js";
import { PageError, PageLoading, PagePlaceholder } from "../../../shared/ui/PageState/index.js";
import { CollectionEntries } from "../../../widgets/collection-entries/index.js";

const modelRoute = getRouteApi("/_protected/content/$modelKey");

export function ModelPage() {
  const { modelKey } = modelRoute.useParams();
  const client = useAdminClient();
  const models = useQuery({ queryFn: client.listModels, queryKey: adminQueryKeys.models });
  useSessionRecovery(models.error);
  if (models.isPending) return <PageLoading label="Loading content model" />;
  if (models.error !== null) return <PageError error={models.error} />;
  const model = models.data.items.find((item) => item.key === modelKey);
  if (model === undefined)
    return (
      <PagePlaceholder description="This content model does not exist." title="Page not found" />
    );
  if (model.kind === "page")
    return (
      <PagePlaceholder
        description="Open this page from the content landing route."
        title={model.label ?? model.key}
      />
    );
  return <CollectionEntries modelKey={modelKey} title={model.label ?? model.key} />;
}
