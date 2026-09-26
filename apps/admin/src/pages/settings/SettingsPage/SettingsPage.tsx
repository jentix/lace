import type { BuildTokenCreatedDto } from "@lacecms/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useSessionRecovery } from "../../../entities/session/index.js";
import {
  adminQueryKeys,
  errorDescription,
  technicalDetails,
  useAdminClient,
} from "../../../shared/api/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { EmptyState } from "../../../shared/ui/EmptyState/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import {
  actionsClass,
  formClass,
  pageClass,
  pageHeadingClass,
  panelClass,
} from "../../../shared/ui/layout/index.js";
import { LoadingState } from "../../../shared/ui/LoadingState/index.js";
import { PageAccessDenied } from "../../../shared/ui/PageState/index.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/Table/index.js";
import { TextField } from "../../../shared/ui/TextField/index.js";

const settingsRoute = getRouteApi("/_protected/settings");

export function SettingsPage() {
  const { permitted } = settingsRoute.useRouteContext();
  return permitted ? <SettingsManager /> : <PageAccessDenied />;
}

function SettingsManager() {
  const client = useAdminClient();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [issued, setIssued] = useState<BuildTokenCreatedDto>();
  const [notice, setNotice] = useState<string>();
  const status = useQuery({
    queryKey: adminQueryKeys.settingsStatus,
    queryFn: client.loadSettingsStatus,
  });
  const tokens = useQuery({ queryKey: adminQueryKeys.tokens, queryFn: client.listTokens });
  const creation = useMutation({
    mutationFn: async () => {
      setIssued(await client.createToken(name));
    },
    onSuccess: async () => {
      setName("");
      setNotice(undefined);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.tokens });
    },
  });
  const revocation = useMutation({
    mutationFn: client.revokeToken,
    onSuccess: async () => {
      setNotice("Token revoked.");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.tokens });
    },
  });
  useSessionRecovery(status.error ?? tokens.error ?? creation.error ?? revocation.error);
  return (
    <section className={pageClass}>
      <h1>Settings</h1>
      <p>Inspect the local API and manage read-only build credentials.</p>
      <section className={panelClass} aria-label="Site status">
        <div className={pageHeadingClass}>
          <h2>Site status</h2>
          <Button
            onClick={() => {
              void status.refetch();
            }}
            variant="outline"
          >
            Refresh status
          </Button>
        </div>
        {status.isPending ? (
          <LoadingState label="Loading site status" />
        ) : status.error !== null ? (
          <ErrorState
            description={errorDescription(status.error)}
            technicalDetails={technicalDetails(status.error)}
          />
        ) : (
          <p>
            API: {status.data?.ready ? "Ready" : "Not ready"} · Configured models:{" "}
            {status.data?.configuredModels}
          </p>
        )}
      </section>
      <section aria-label="Build tokens">
        <h2>Build tokens</h2>
        <p>
          Build tokens can read published content. Store new values in the server-side site
          configuration; they cannot be shown again.
        </p>
        <form
          className={formClass}
          onSubmit={(event) => {
            event.preventDefault();
            setIssued(undefined);
            setNotice(undefined);
            creation.mutate();
          }}
        >
          <TextField
            label="Token name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
          <Button disabled={creation.isPending} type="submit">
            {creation.isPending ? "Creating…" : "Create build token"}
          </Button>
        </form>
        {creation.error === null ? undefined : (
          <ErrorState
            description={errorDescription(creation.error)}
            technicalDetails={technicalDetails(creation.error)}
          />
        )}
        {issued === undefined ? undefined : (
          <div className={panelClass} role="status">
            <h3>Copy this token now</h3>
            <p>It will not be shown again.</p>
            <code className="font-mono wrap-anywhere select-all" data-testid="issued-token-value">
              {issued.token}
            </code>
            <div className={actionsClass}>
              <Button
                onClick={() => {
                  void navigator.clipboard
                    .writeText(issued.token)
                    .then(() => setNotice("Token copied."))
                    .catch(() => setNotice("Copy failed. Select the token text manually."));
                }}
                variant="outline"
              >
                Copy token
              </Button>
              <Button onClick={() => setIssued(undefined)} variant="ghost">
                Dismiss token
              </Button>
            </div>
          </div>
        )}
        {revocation.error === null ? undefined : (
          <ErrorState
            description={errorDescription(revocation.error)}
            technicalDetails={technicalDetails(revocation.error)}
          />
        )}
        {notice === undefined ? undefined : <p role="status">{notice}</p>}
        {tokens.isPending ? (
          <LoadingState label="Loading tokens" />
        ) : tokens.error !== null ? (
          <ErrorState
            description={errorDescription(tokens.error)}
            technicalDetails={technicalDetails(tokens.error)}
          />
        ) : tokens.data?.items.length === 0 ? (
          <EmptyState
            description="Create a token to connect the local Astro site."
            title="No build tokens"
          />
        ) : (
          <Table aria-label="Build tokens">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.data?.items.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>{token.name}</TableCell>
                  <TableCell>
                    <code>{token.tokenPrefix}</code>
                  </TableCell>
                  <TableCell>{new Date(token.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {token.lastUsedAt === undefined
                      ? "Never"
                      : new Date(token.lastUsedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{token.revokedAt === undefined ? "Active" : "Revoked"}</TableCell>
                  <TableCell>
                    {token.revokedAt === undefined ? (
                      <Button
                        disabled={revocation.isPending}
                        onClick={() => {
                          if (window.confirm(`Revoke ${token.name}?`)) revocation.mutate(token.id);
                        }}
                        variant="ghost"
                      >
                        Revoke {token.name}
                      </Button>
                    ) : undefined}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </section>
  );
}
