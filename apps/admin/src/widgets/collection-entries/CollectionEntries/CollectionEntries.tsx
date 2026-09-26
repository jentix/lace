import type { ContentEntryListDto } from "@lacecms/contracts";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useSession, useSessionRecovery } from "../../../entities/session/index.js";
import { CreateEntryDialog } from "../../../features/create-entry/index.js";
import { DeleteEntryDialog } from "../../../features/delete-entry/index.js";
import { adminQueryKeys, useAdminClient } from "../../../shared/api/index.js";
import { Badge } from "../../../shared/ui/Badge/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { EmptyState } from "../../../shared/ui/EmptyState/index.js";
import { pageClass, pageHeadingClass } from "../../../shared/ui/layout/index.js";
import { LoadingState } from "../../../shared/ui/LoadingState/index.js";
import { PageError } from "../../../shared/ui/PageState/index.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/Table/index.js";

/** The paginated entry list of a collection with permission-aware entry actions. */
export function CollectionEntries({
  modelKey,
  title,
}: {
  readonly modelKey: string;
  readonly title: string;
}) {
  const client = useAdminClient();
  const session = useSession();
  const entries = useInfiniteQuery<
    ContentEntryListDto,
    Error,
    InfiniteData<ContentEntryListDto>,
    ReturnType<typeof adminQueryKeys.entries>,
    string | undefined
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => client.listEntries(modelKey, pageParam),
    queryKey: adminQueryKeys.entries(modelKey),
  });
  useSessionRecovery(entries.error);
  const items = entries.data?.pages.flatMap((page) => page.items) ?? [];
  const canManage = session.role !== "viewer";
  return (
    <section className={pageClass} aria-labelledby="model-title">
      <div className={pageHeadingClass}>
        <h1 id="model-title">{title}</h1>
        {canManage ? <CreateEntryDialog modelKey={modelKey} /> : undefined}
      </div>
      {entries.isPending ? <LoadingState label="Loading entries" lines={4} /> : undefined}
      {entries.error === null ? undefined : <PageError error={entries.error} />}
      {entries.data !== undefined && items.length === 0 ? (
        <EmptyState
          description={
            canManage
              ? "Create the first entry for this collection. If this is a new local model, run pnpm content:sync first."
              : "There are no entries in this collection yet."
          }
          title="No entries yet"
        />
      ) : undefined}
      {items.length > 0 ? (
        <Table aria-label={`${title} entries`}>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              {canManage ? <TableHead>Actions</TableHead> : undefined}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Link params={{ entryId: entry.id, modelKey }} to="/content/$modelKey/$entryId">
                    {entry.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={entry.publishedSnapshotId === undefined ? "warning" : "success"}>
                    {entry.publishedSnapshotId === undefined ? "Draft" : "Published"}
                  </Badge>
                </TableCell>
                <TableCell>{entry.updatedAt}</TableCell>
                {canManage ? (
                  <TableCell>
                    <DeleteEntryDialog
                      entryId={entry.id}
                      expectedRevision={entry.draftRevision}
                      modelKey={modelKey}
                      title={entry.title}
                    />
                  </TableCell>
                ) : undefined}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : undefined}
      {entries.hasNextPage ? (
        <Button disabled={entries.isFetchingNextPage} onClick={() => entries.fetchNextPage()}>
          {entries.isFetchingNextPage ? "Loading more…" : "Load more entries"}
        </Button>
      ) : undefined}
    </section>
  );
}
