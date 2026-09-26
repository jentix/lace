import type {
  AdminContentEntryDto,
  ContentModelDto,
  PublishContentEntryResultDto,
} from "@lacecms/contracts";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  EntryStatusBadge,
  entryStatus,
  resolvedPublicPath,
} from "../../../entities/content/index.js";
import { buildDispatchDescription } from "../../../features/publish-entry/index.js";
import { formatAbsoluteTime, formatRelativeTime } from "../../../shared/lib/index.js";

export type BuildDispatchStatus = PublishContentEntryResultDto["build"]["status"];

function RelativeTime({ iso, prefix = "" }: { readonly iso: string; readonly prefix?: string }) {
  return (
    <time dateTime={iso} title={formatAbsoluteTime(iso)}>
      {prefix}
      {formatRelativeTime(iso)}
    </time>
  );
}

function Fact({ children, term }: { readonly children: ReactNode; readonly term: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  );
}

/**
 * The editor's publication card: derived status, live and draft revisions,
 * last editor, public URL, and the latest build state known to the editor.
 */
export function EntryPublicationDetails({
  children,
  entry,
  latestBuild,
  model,
}: {
  readonly children?: ReactNode;
  readonly entry: AdminContentEntryDto;
  readonly latestBuild: BuildDispatchStatus | undefined;
  readonly model: ContentModelDto;
}) {
  const publicPath = resolvedPublicPath(model, entry);
  return (
    <section
      aria-label="Publication status"
      className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-semibold">Publication</h2>
        <EntryStatusBadge status={entryStatus(entry)} />
      </div>
      <dl className="m-0 grid gap-2">
        <Fact term="Live">
          {entry.published === undefined ? (
            "Not published"
          ) : (
            <>
              Revision {entry.published.revision} ·{" "}
              <RelativeTime iso={entry.published.updatedAt} prefix="published " />
            </>
          )}
        </Fact>
        <Fact term="Draft">Revision {entry.draft.revision}</Fact>
        <Fact term="Last edited">
          {entry.updatedBy.displayName} · <RelativeTime iso={entry.draft.updatedAt} />
        </Fact>
        <Fact term="Public URL">
          {publicPath === undefined ? (
            <span className="text-muted-foreground">No public URL yet</span>
          ) : (
            <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">{publicPath}</code>
          )}
        </Fact>
        <Fact term="Latest build">
          {latestBuild === undefined ? (
            <>
              No build requested from this editor.{" "}
              <Link className="text-primary underline-offset-4 hover:underline" to="/builds">
                View builds
              </Link>
            </>
          ) : (
            <span role="status">{buildDispatchDescription(latestBuild)}</span>
          )}
        </Fact>
      </dl>
      {children}
    </section>
  );
}
