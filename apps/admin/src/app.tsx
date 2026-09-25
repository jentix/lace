import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type {
  ContentBlockDto,
  ContentEntryDto,
  ContentEntryListDto,
  ContentModelDto,
  MediaListDto,
  MediaMetadataDto,
} from "@lacecms/contracts";
import { canonicalizeJson, type JsonValue } from "@lacecms/content";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
  redirect,
  useNavigate,
  useBlocker,
  useRouteContext,
  useRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, type Control } from "react-hook-form";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ulid } from "ulid";
import {
  AdminClientError,
  adminQueryKeys,
  createAdminClient,
  isSessionExpiredError,
  type AdminClient,
} from "./admin-client.js";
import {
  createDraftResolver,
  initialModelFieldValues,
  pointerToFormField,
  suggestSlug,
  type DraftEditorValues,
} from "./editor-form.js";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Table,
} from "./components/ui.js";
import type { AdminRole, AdminSession, AdminSessionSource } from "./session.js";
import { RichTextEditor } from "./rich-text-editor.js";
import { MediaPreview } from "./media-preview.js";

export interface AdminRouterContext {
  readonly client: AdminClient;
  readonly sessionSource: AdminSessionSource;
}
const modelKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
export function safeReturnPath(href: string): string {
  return href.startsWith("/") && !href.startsWith("//") ? href : "/content";
}
function errorDescription(error: unknown): string {
  return error instanceof Error ? error.message : "The Lace admin request failed.";
}
function technicalDetails(error: unknown): string | undefined {
  return error instanceof AdminClientError ? error.requestId : undefined;
}
function mediaDeletionDescription(error: unknown): string {
  return error instanceof AdminClientError && error.code === "CONTENT_INVALID_STATE"
    ? "Deletion was refused. This media may be referenced by content or no longer active. Remove references and refresh before retrying."
    : errorDescription(error);
}

const rootRoute = createRootRouteWithContext<AdminRouterContext>()({
  component: Outlet,
  notFoundComponent: () => (
    <main className="lace-main">
      <ErrorState description="This route does not exist in Lace admin." title="Page not found" />
    </main>
  ),
});
const loginRoute = createRoute({
  beforeLoad: async ({ context }) => {
    if ((await context.sessionSource.get()) !== null) throw redirect({ to: "/content" });
  },
  component: LoginPage,
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? safeReturnPath(search.redirect) : undefined,
  }),
});
const protectedRoute = createRoute({
  beforeLoad: async ({ context, location }) => {
    const session = await context.sessionSource.get();
    if (session === null)
      throw redirect({
        search: { redirect: safeReturnPath(`${location.pathname}${location.searchStr}`) },
        to: "/login",
      });
    return { session };
  },
  component: ProtectedLayout,
  getParentRoute: () => rootRoute,
  id: "_protected",
});
const contentRoute = createRoute({
  component: ContentPage,
  getParentRoute: () => protectedRoute,
  path: "/content",
});
const modelRoute = createRoute({
  component: ModelPage,
  getParentRoute: () => protectedRoute,
  params: {
    parse: (parameters) => {
      if (!modelKeyPattern.test(parameters.modelKey)) throw notFound();
      return { modelKey: parameters.modelKey };
    },
    stringify: (parameters) => ({ modelKey: parameters.modelKey }),
  },
  path: "/content/$modelKey",
});
const entryRoute = createRoute({
  component: EntryEditor,
  getParentRoute: () => protectedRoute,
  params: {
    parse: (parameters) => {
      if (!modelKeyPattern.test(parameters.modelKey) || parameters.entryId.length === 0)
        throw notFound();
      return { entryId: parameters.entryId, modelKey: parameters.modelKey };
    },
    stringify: (parameters) => ({ entryId: parameters.entryId, modelKey: parameters.modelKey }),
  },
  path: "/content/$modelKey/$entryId",
});
const mediaRoute = createRoute({
  component: MediaPage,
  getParentRoute: () => protectedRoute,
  path: "/media",
});
const buildsRoute = createRoute({
  component: () => (
    <RoutePlaceholder
      description="Build status will be connected to remote state in a later session."
      title="Builds"
    />
  ),
  getParentRoute: () => protectedRoute,
  path: "/builds",
});
const usersRoute = createRoute({
  beforeLoad: ({ context }) => ({ permitted: context.session.role === "admin" }),
  component: UsersPage,
  getParentRoute: () => protectedRoute,
  path: "/users",
});
const settingsRoute = createRoute({
  beforeLoad: ({ context }) => ({ permitted: context.session.role === "admin" }),
  component: SettingsPage,
  getParentRoute: () => protectedRoute,
  path: "/settings",
});
const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    contentRoute,
    modelRoute,
    entryRoute,
    mediaRoute,
    buildsRoute,
    usersRoute,
    settingsRoute,
  ]),
]);

export function createAdminRouter(
  sessionSource: AdminSessionSource,
  history?: RouterHistory,
  client: AdminClient = createAdminClient(),
) {
  return createRouter({
    basepath: "/admin",
    context: { client, sessionSource },
    defaultPendingComponent: PendingRoute,
    defaultPendingMs: 0,
    ...(history === undefined ? {} : { history }),
    routeTree,
  });
}

function useSessionRecovery(error: unknown) {
  const { sessionSource } = useRouteContext({ from: rootRoute.id });
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!isSessionExpiredError(error)) return;
    void (async () => {
      sessionSource.invalidate();
      if ((await sessionSource.get()) !== null) return;
      queryClient.clear();
      await router.navigate({ search: { redirect: "/content" }, to: "/login" });
    })();
  }, [error, queryClient, router, sessionSource]);
}

function LoginPage() {
  const { client, sessionSource } = useRouteContext({ from: rootRoute.id });
  const search = loginRoute.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useMutation({
    mutationFn: () => client.signIn(email, password),
    onSuccess: async () => {
      sessionSource.invalidate();
      await sessionSource.get();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.session });
      await navigate({ to: search.redirect ?? "/content" });
    },
  });
  return (
    <main className="lace-main">
      <section className="lace-page" aria-labelledby="login-title">
        <p>Lace</p>
        <h1 id="login-title">Sign in</h1>
        <form
          className="lace-form"
          onSubmit={(event) => {
            event.preventDefault();
            signIn.mutate();
          }}
        >
          <Input
            autoComplete="email"
            label="Email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
          <Input
            autoComplete="current-password"
            label="Password"
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            type="password"
            value={password}
          />
          <Button disabled={signIn.isPending} type="submit">
            {signIn.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        {signIn.error === null ? undefined : (
          <ErrorState
            description={errorDescription(signIn.error)}
            technicalDetails={technicalDetails(signIn.error)}
          />
        )}
      </section>
    </main>
  );
}
function PendingRoute() {
  return (
    <main className="lace-main" aria-label="Checking access">
      <Skeleton label="Checking access" lines={3} />
    </main>
  );
}
function ProtectedLayout() {
  const { session } = useRouteContext({ from: protectedRoute.id });
  return (
    <AdminShell session={session}>
      <Outlet />
    </AdminShell>
  );
}
function AdminShell({
  children,
  session,
}: {
  readonly children: ReactNode;
  readonly session: AdminSession;
}) {
  const { client, sessionSource } = useRouteContext({ from: rootRoute.id });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [navOpen, setNavOpen] = useState(false);
  const signOut = useMutation({
    mutationFn: client.signOut,
    onSuccess: async () => {
      sessionSource.invalidate();
      queryClient.clear();
      await navigate({ search: { redirect: "/content" }, to: "/login" });
    },
  });
  return (
    <div className="lace-shell" data-nav-open={navOpen}>
      <aside className="lace-sidebar" aria-label="Admin navigation">
        <Link className="lace-brand" onClick={() => setNavOpen(false)} to="/content">
          Lace
        </Link>
        <nav className="lace-nav" id="admin-navigation">
          {navigationFor(session.role).map((item) => (
            <Link key={item.path} onClick={() => setNavOpen(false)} to={item.path as never}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Button disabled={signOut.isPending} onClick={() => signOut.mutate()} variant="quiet">
          {signOut.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </aside>
      <main className="lace-main">
        <button
          aria-controls="admin-navigation"
          aria-expanded={navOpen}
          className="lace-button lace-button--secondary lace-menu-button"
          onClick={() => setNavOpen((open) => !open)}
          type="button"
        >
          Menu
        </button>
        {signOut.error === null ? undefined : (
          <ErrorState
            description={errorDescription(signOut.error)}
            technicalDetails={technicalDetails(signOut.error)}
          />
        )}
        {children}
      </main>
    </div>
  );
}

function ContentPage() {
  const { client } = useRouteContext({ from: rootRoute.id });
  const models = useQuery({ queryFn: client.listModels, queryKey: adminQueryKeys.models });
  useSessionRecovery(models.error);
  return (
    <section className="lace-page" aria-labelledby="content-title">
      <h1 id="content-title">Content</h1>
      {models.isPending ? <Skeleton label="Loading content models" lines={3} /> : undefined}
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
        <div className="lace-model-list">
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
  const { client } = useRouteContext({ from: rootRoute.id });
  const page = useQuery({
    queryFn: () => client.listEntries(modelKey),
    queryKey: adminQueryKeys.entries(modelKey),
  });
  useSessionRecovery(page.error);
  if (page.isPending) return <Skeleton label={`Loading ${modelKey}`} lines={1} />;
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
function ModelPage() {
  const { modelKey } = modelRoute.useParams();
  const { client } = useRouteContext({ from: rootRoute.id });
  const models = useQuery({ queryFn: client.listModels, queryKey: adminQueryKeys.models });
  useSessionRecovery(models.error);
  if (models.isPending) return <RouteLoading label="Loading content model" />;
  if (models.error !== null) return <RouteError error={models.error} />;
  const model = models.data.items.find((item) => item.key === modelKey);
  if (model === undefined)
    return (
      <RoutePlaceholder description="This content model does not exist." title="Page not found" />
    );
  if (model.kind === "page")
    return (
      <RoutePlaceholder
        description="Open this page from the content landing route."
        title={model.label ?? model.key}
      />
    );
  return <CollectionEntries modelKey={modelKey} title={model.label ?? model.key} />;
}
function CollectionEntries({
  modelKey,
  title,
}: {
  readonly modelKey: string;
  readonly title: string;
}) {
  const { client } = useRouteContext({ from: rootRoute.id });
  const { session } = useRouteContext({ from: protectedRoute.id });
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
    <section className="lace-page" aria-labelledby="model-title">
      <div className="lace-page-heading">
        <h1 id="model-title">{title}</h1>
        {canManage ? <CreateEntryDialog modelKey={modelKey} /> : undefined}
      </div>
      {entries.isPending ? <Skeleton label="Loading entries" lines={4} /> : undefined}
      {entries.error === null ? undefined : <RouteError error={entries.error} />}
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
        <Table label={`${title} entries`}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Updated</th>
              {canManage ? <th>Actions</th> : undefined}
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <Link params={{ entryId: entry.id, modelKey }} to="/content/$modelKey/$entryId">
                    {entry.title}
                  </Link>
                </td>
                <td>
                  <Badge tone={entry.publishedSnapshotId === undefined ? "warning" : "positive"}>
                    {entry.publishedSnapshotId === undefined ? "Draft" : "Published"}
                  </Badge>
                </td>
                <td>{entry.updatedAt}</td>
                {canManage ? (
                  <td>
                    <DeleteEntryDialog
                      entryId={entry.id}
                      expectedRevision={entry.draftRevision}
                      modelKey={modelKey}
                      title={entry.title}
                    />
                  </td>
                ) : undefined}
              </tr>
            ))}
          </tbody>
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
function CreateEntryDialog({ modelKey }: { readonly modelKey: string }) {
  const { client } = useRouteContext({ from: rootRoute.id });
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const create = useMutation({
    mutationFn: () => client.createEntry(modelKey, title),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.entries(modelKey) });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.models });
      setOpen(false);
      setTitle("");
    },
  });
  return (
    <Dialog
      onOpenChange={setOpen}
      open={open}
      title="Create entry"
      trigger={<Button>Create entry</Button>}
    >
      <form
        className="lace-form"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <Input
          label="Title"
          onChange={(event) => setTitle(event.currentTarget.value)}
          required
          value={title}
        />
        <Button disabled={create.isPending} type="submit">
          {create.isPending ? "Creating…" : "Create entry"}
        </Button>
      </form>
      {create.error === null ? undefined : (
        <ErrorState
          description={errorDescription(create.error)}
          technicalDetails={technicalDetails(create.error)}
        />
      )}
    </Dialog>
  );
}
function DeleteEntryDialog({
  entryId,
  expectedRevision,
  modelKey,
  title,
}: {
  readonly entryId: string;
  readonly expectedRevision: number;
  readonly modelKey: string;
  readonly title: string;
}) {
  const { client } = useRouteContext({ from: rootRoute.id });
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => client.deleteEntry(entryId, expectedRevision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.entries(modelKey) });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.models });
      setOpen(false);
    },
  });
  return (
    <Dialog
      description={`Delete “${title}”? This cannot be undone.`}
      onOpenChange={setOpen}
      open={open}
      title="Delete entry"
      trigger={<Button variant="quiet">Delete</Button>}
    >
      <Button disabled={remove.isPending} onClick={() => remove.mutate()}>
        {remove.isPending ? "Deleting…" : "Confirm deletion"}
      </Button>
      {remove.error === null ? undefined : (
        <ErrorState
          description={errorDescription(remove.error)}
          technicalDetails={technicalDetails(remove.error)}
        />
      )}
    </Dialog>
  );
}

function draftValues(model: ContentModelDto, entry: ContentEntryDto): DraftEditorValues {
  return {
    blocks: entry.draft.blocks.map((block) => {
      const definition = model.blockDefinitions?.find((item) => item.type === block.type);
      if (definition === undefined) return block;
      return {
        ...block,
        data: Object.fromEntries(
          Object.entries(definition.fields).map(([key, field]) => [
            key,
            block.data[key] ?? ("defaultValue" in field ? field.defaultValue : undefined),
          ]),
        ) as ContentBlockDto["data"],
      };
    }),
    fields: initialModelFieldValues(model, entry.draft.fields),
    ...(entry.draft.slug === undefined ? {} : { slug: entry.draft.slug }),
    title: entry.draft.title,
  };
}

export function resolvedPublicPath(
  model: ContentModelDto,
  entry: ContentEntryDto,
): string | undefined {
  if (model.kind === "page") return model.path;
  const slug = (entry.published ?? entry.draft).slug;
  return slug === undefined ? undefined : model.route?.replace(":slug", slug);
}

function localDraftJson(values: DraftEditorValues): string {
  return canonicalizeJson({
    blocks: values.blocks,
    fields: values.fields,
    ...(values.slug === undefined ? {} : { slug: values.slug }),
    title: values.title,
  } as unknown as JsonValue);
}

function buildDispatchDescription(
  status: "accepted" | "not-dispatched" | "rejected" | "unavailable",
) {
  switch (status) {
    case "accepted":
      return "Published. Build pending.";
    case "not-dispatched":
      return "Publication was already accepted; no new build was requested.";
    case "rejected":
      return "Published, but the build request was rejected.";
    case "unavailable":
      return "Published, but build dispatch is currently unavailable.";
  }
}

function fieldLabel(key: string, label: string | undefined): string {
  return label ?? key.replace(/([A-Z])/gu, " $1").replace(/^./u, (value) => value.toUpperCase());
}

function MediaPicker({
  fieldKey,
  onChange,
  value,
}: {
  readonly fieldKey: string;
  readonly onChange: (value: string | undefined) => void;
  readonly value: unknown;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lace-media-picker">
      <Button
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
        type="button"
        variant="secondary"
      >
        Choose media for {fieldLabel(fieldKey, undefined)}
      </Button>
      {open ? (
        <MediaSurface
          onSelect={(id) => {
            onChange(id);
            setOpen(false);
          }}
          selectionLabel={fieldLabel(fieldKey, undefined)}
          value={typeof value === "string" ? value : undefined}
        />
      ) : (
        <p aria-live="polite">
          {typeof value === "string" ? `Selected: ${value}` : "No media selected"}
        </p>
      )}
    </div>
  );
}

const maxMediaBytes = 10 * 1024 * 1024;
const mediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function MediaPage() {
  return (
    <section className="lace-page" aria-labelledby="media-title">
      <h1 id="media-title">Media</h1>
      <MediaSurface />
    </section>
  );
}

function MediaSurface({
  onSelect,
  selectionLabel,
  value,
}: {
  readonly onSelect?: (id: string | undefined) => void;
  readonly selectionLabel?: string;
  readonly value?: string | undefined;
}) {
  const { client } = useRouteContext({ from: rootRoute.id });
  const { session } = useRouteContext({ from: protectedRoute.id });
  const uploadId = useId();
  const queryClient = useQueryClient();
  const [recent, setRecent] = useState<MediaMetadataDto | undefined>();
  const [updates, setUpdates] = useState<Record<string, MediaMetadataDto>>({});
  const [previewId, setPreviewId] = useState<string | undefined>();
  const [uploadError, setUploadError] = useState<string | undefined>();
  const media = useInfiniteQuery<
    MediaListDto,
    Error,
    InfiniteData<MediaListDto>,
    ReturnType<typeof adminQueryKeys.media>,
    string | undefined
  >({
    getNextPageParam: (page) => page.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => client.listMedia(pageParam),
    queryKey: adminQueryKeys.media(),
  });
  const upload = useMutation({
    mutationFn: (file: File) => client.uploadMedia(file),
    onSuccess: async (item) => {
      setRecent(item);
      setUploadError(undefined);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.media() });
    },
  });
  const deletion = useMutation({
    mutationFn: ({ id, retry }: { id: string; retry: boolean }) =>
      retry ? client.retryMediaDeletion(id) : client.deleteMedia(id),
    onSuccess: async (item) => {
      setUpdates((current) => ({ ...current, [item.id]: item }));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.media() });
    },
  });
  useSessionRecovery(media.error ?? upload.error ?? deletion.error);
  const listed = media.data?.pages.flatMap((page) => page.items) ?? [];
  const items = (
    recent === undefined || listed.some((item) => item.id === recent.id)
      ? listed
      : [recent, ...listed]
  ).map((item) => updates[item.id] ?? item);
  const visible = onSelect === undefined ? items : items.filter((item) => item.status === "active");
  const current = items.find((item) => item.id === value);
  const canWrite = session.role !== "viewer";
  return (
    <div className="lace-media-surface">
      {onSelect === undefined ? undefined : (
        <div aria-live="polite">
          <p>{value === undefined ? "No media selected" : `Selected: ${value}`}</p>
          {value !== undefined && current === undefined ? (
            <p>
              {media.hasNextPage || media.isPending
                ? "Selection not found in loaded pages yet."
                : "Selected media is unavailable or inaccessible."}
            </p>
          ) : current !== undefined && current.status !== "active" ? (
            <p>Selected media is unavailable or inaccessible.</p>
          ) : undefined}
          {value === undefined ? undefined : (
            <Button onClick={() => onSelect(undefined)} type="button" variant="secondary">
              Clear selection
            </Button>
          )}
        </div>
      )}
      {canWrite ? (
        <div className="lace-media-upload">
          <label htmlFor={uploadId}>Upload image</label>
          <p>JPEG, PNG, WebP, or AVIF. Maximum 10 MiB.</p>
          <input
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={upload.isPending}
            id={uploadId}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file === undefined) return;
              if (file.size > maxMediaBytes || (file.type !== "" && !mediaTypes.has(file.type))) {
                setUploadError("Choose a JPEG, PNG, WebP, or AVIF image no larger than 10 MiB.");
                return;
              }
              setUploadError(undefined);
              upload.mutate(file);
            }}
            type="file"
          />
          {upload.isPending ? <p role="status">Uploading image…</p> : undefined}
          {uploadError === undefined && upload.error === null ? undefined : (
            <p role="alert">{uploadError ?? errorDescription(upload.error)}</p>
          )}
          {recent === undefined ? undefined : (
            <p role="status">
              Uploaded {recent.filename}.{onSelect === undefined ? "" : " Select it to use it."}
            </p>
          )}
        </div>
      ) : undefined}
      {media.isPending ? <Skeleton label="Loading media" lines={3} /> : undefined}
      {media.error === null ? undefined : (
        <ErrorState
          description={errorDescription(media.error)}
          technicalDetails={technicalDetails(media.error)}
        />
      )}
      {media.data !== undefined && visible.length === 0 ? (
        <EmptyState
          title={onSelect === undefined ? "No media yet" : "No active media is available"}
          description={
            canWrite ? "Upload an image to get started." : "No images are available to select."
          }
        />
      ) : undefined}
      {visible.length === 0 ? undefined : (
        <ul
          aria-label={
            selectionLabel === undefined ? "Media library" : `Media choices for ${selectionLabel}`
          }
          className="lace-media-list"
        >
          {visible.map((item) => (
            <li className="lace-media-item" key={item.id}>
              <div>
                <strong>{item.filename}</strong>
                <span>
                  {item.mimeType} · {item.size} bytes
                </span>
                <span>
                  {item.status === "deleting"
                    ? "Deletion pending"
                    : item.status === "delete_failed"
                      ? "Deletion failed"
                      : "Active"}
                </span>
              </div>
              <div className="lace-actions">
                {item.status === "active" ? (
                  <Button
                    onClick={() => setPreviewId(previewId === item.id ? undefined : item.id)}
                    type="button"
                    variant="secondary"
                  >
                    {previewId === item.id ? "Hide preview" : `Preview ${item.filename}`}
                  </Button>
                ) : undefined}
                {onSelect === undefined || item.status !== "active" ? undefined : (
                  <button
                    aria-pressed={value === item.id}
                    onClick={() => onSelect(item.id)}
                    type="button"
                  >
                    {item.filename}
                  </button>
                )}
                {onSelect !== undefined || !canWrite || item.status === "deleting" ? undefined : (
                  <Button
                    disabled={deletion.isPending}
                    onClick={() => {
                      if (
                        item.status === "active" &&
                        !window.confirm(`Request deletion of ${item.filename}?`)
                      )
                        return;
                      deletion.mutate({ id: item.id, retry: item.status === "delete_failed" });
                    }}
                    type="button"
                    variant="secondary"
                  >
                    {item.status === "delete_failed"
                      ? `Retry deletion of ${item.filename}`
                      : `Delete ${item.filename}`}
                  </Button>
                )}
              </div>
              {previewId === item.id ? (
                <MediaPreview filename={item.filename} mediaId={item.id} />
              ) : undefined}
            </li>
          ))}
        </ul>
      )}
      {deletion.error === null ? undefined : (
        <p role="alert">{mediaDeletionDescription(deletion.error)}</p>
      )}
      {media.hasNextPage ? (
        <Button
          disabled={media.isFetchingNextPage}
          onClick={() => media.fetchNextPage()}
          type="button"
          variant="secondary"
        >
          {media.isFetchingNextPage ? "Loading more media…" : "Load more media"}
        </Button>
      ) : undefined}
    </div>
  );
}

function MetadataField({
  control,
  definition,
  error,
  fieldKey,
  name,
}: {
  readonly control: Control<DraftEditorValues, unknown, DraftEditorValues>;
  readonly definition: ContentModelDto["fields"][string];
  readonly error: string | undefined;
  readonly fieldKey: string;
  readonly name: `blocks.${number}.data.${string}` | `fields.${string}`;
}) {
  const id = `field-${name.replaceAll(".", "-")}`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const describedBy = [
    definition.description === undefined ? undefined : descriptionId,
    error === undefined ? undefined : errorId,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");
  const label = fieldLabel(fieldKey, definition.label);
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field }) => (
        <div className="lace-field">
          {definition.type === "richText" || definition.type === "media" ? (
            <span>{label}</span>
          ) : (
            <label htmlFor={id}>{label}</label>
          )}
          {definition.description === undefined ? undefined : (
            <small id={descriptionId}>{definition.description}</small>
          )}
          {definition.type === "boolean" ? (
            <input
              aria-describedby={describedBy || undefined}
              checked={field.value === true}
              id={id}
              onChange={(event) => field.onChange(event.currentTarget.checked)}
              type="checkbox"
            />
          ) : definition.type === "select" ? (
            <select
              aria-describedby={describedBy || undefined}
              id={id}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.currentTarget.value || undefined)}
              value={typeof field.value === "string" ? field.value : ""}
            >
              <option value="">Select an option</option>
              {definition.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : definition.type === "richText" ? (
            <RichTextEditor
              {...(describedBy === "" ? {} : { describedBy })}
              id={id}
              label={label}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={field.value}
            />
          ) : definition.type === "media" ? (
            <MediaPicker fieldKey={fieldKey} onChange={field.onChange} value={field.value} />
          ) : definition.type === "textarea" ? (
            <textarea
              aria-describedby={describedBy || undefined}
              id={id}
              maxLength={definition.maxLength}
              minLength={definition.minLength}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.currentTarget.value || undefined)}
              rows={5}
              value={typeof field.value === "string" ? field.value : ""}
            />
          ) : (
            <input
              aria-describedby={describedBy || undefined}
              id={id}
              max={definition.type === "number" ? definition.max : undefined}
              maxLength={definition.type === "text" ? definition.maxLength : undefined}
              min={definition.type === "number" ? definition.min : undefined}
              minLength={definition.type === "text" ? definition.minLength : undefined}
              onBlur={field.onBlur}
              onChange={(event) =>
                field.onChange(
                  definition.type === "number"
                    ? event.currentTarget.value === ""
                      ? undefined
                      : Number(event.currentTarget.value)
                    : event.currentTarget.value || undefined,
                )
              }
              type={
                definition.type === "date"
                  ? "date"
                  : definition.type === "number"
                    ? "number"
                    : definition.type === "url"
                      ? "url"
                      : "text"
              }
              value={
                typeof field.value === "string" || typeof field.value === "number"
                  ? field.value
                  : ""
              }
            />
          )}
          {error === undefined ? undefined : (
            <p className="lace-field-error" id={errorId} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    />
  );
}

function SortableBlockCard({
  block,
  collapsed,
  control,
  definition,
  error,
  index,
  onCollapse,
  onDuplicate,
  onMove,
  onRemove,
  total,
}: {
  readonly block: DraftEditorValues["blocks"][number];
  readonly collapsed: boolean;
  readonly control: Control<DraftEditorValues, unknown, DraftEditorValues>;
  readonly definition: NonNullable<ContentModelDto["blockDefinitions"]>[number];
  readonly error: Record<string, unknown> | undefined;
  readonly index: number;
  readonly onCollapse: () => void;
  readonly onDuplicate: () => void;
  readonly onMove: (target: number) => void;
  readonly total: number;
  readonly onRemove: () => void;
}) {
  const sortable = useSortable({ id: block.key });
  return (
    <article
      className="lace-block-card"
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
    >
      <header className="lace-block-card-header">
        <h2>{definition.label ?? fieldLabel(definition.type, undefined)}</h2>
        <div className="lace-actions">
          <button
            aria-label={`Drag ${definition.type} block`}
            {...sortable.attributes}
            {...sortable.listeners}
            type="button"
          >
            Drag
          </button>
          <button disabled={index === 0} onClick={() => onMove(index - 1)} type="button">
            Move up
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(index + 1)} type="button">
            Move down
          </button>
          <button onClick={onDuplicate} type="button">
            Duplicate
          </button>
          <button onClick={onCollapse} type="button">
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <button onClick={onRemove} type="button">
            Remove
          </button>
        </div>
      </header>
      {collapsed ? undefined : (
        <div className="lace-block-fields">
          {Object.entries(definition.fields).map(([fieldKey, fieldDefinition]) => (
            <MetadataField
              control={control}
              definition={fieldDefinition}
              error={
                (error?.data as Record<string, { readonly message?: string }> | undefined)?.[
                  fieldKey
                ]?.message
              }
              fieldKey={fieldKey}
              key={fieldKey}
              name={`blocks.${index}.data.${fieldKey}`}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function BlockEditor({
  control,
  errors,
  model,
}: {
  readonly control: Control<DraftEditorValues, unknown, DraftEditorValues>;
  readonly errors: Record<string, Record<string, unknown>> | undefined;
  readonly model: ContentModelDto;
}) {
  const { append, fields, move, remove } = useFieldArray({
    control,
    name: "blocks",
    keyName: "formId",
  });
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const definitions = model.blockDefinitions ?? [];
  const add = (definition: (typeof definitions)[number]) => {
    const maximum = Math.max(0, ...fields.map((block) => block.position));
    append({
      data: structuredClone(definition.defaultValue ?? {}) as ContentBlockDto["data"],
      key: ulid(),
      position: maximum + 1_024,
      schemaVersion: definition.version,
      type: definition.type,
    });
  };
  const duplicate = (index: number) => {
    const current = fields[index];
    if (current === undefined) return;
    const { formId: _formId, ...block } = current;
    append({ ...block, data: structuredClone(block.data), key: ulid() });
  };
  return (
    <section aria-labelledby="blocks-title" className="lace-block-editor">
      <h2 id="blocks-title">Blocks</h2>
      {definitions.length === 0 ? (
        <p>This model does not allow blocks.</p>
      ) : (
        <div className="lace-actions" role="group" aria-label="Add a block">
          {definitions.map((definition) => (
            <button key={definition.type} onClick={() => add(definition)} type="button">
              Add {definition.label ?? fieldLabel(definition.type, undefined)}
            </button>
          ))}
        </div>
      )}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over === null || active.id === over.id) return;
          const from = fields.findIndex((block) => block.key === active.id);
          const to = fields.findIndex((block) => block.key === over.id);
          if (from >= 0 && to >= 0) move(from, to);
        }}
        sensors={sensors}
      >
        <SortableContext
          items={fields.map((block) => block.key)}
          strategy={verticalListSortingStrategy}
        >
          {fields.map((block, index) => {
            const definition = definitions.find((item) => item.type === block.type);
            if (definition === undefined) return null;
            return (
              <SortableBlockCard
                block={block}
                collapsed={collapsed.has(block.key)}
                control={control}
                definition={definition}
                error={errors?.[index]}
                index={index}
                key={block.formId}
                onCollapse={() =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(block.key)) next.delete(block.key);
                    else next.add(block.key);
                    return next;
                  })
                }
                onDuplicate={() => duplicate(index)}
                onMove={(target) => target >= 0 && target < fields.length && move(index, target)}
                onRemove={() => remove(index)}
                total={fields.length}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </section>
  );
}

function EntryEditor() {
  const { entryId, modelKey } = entryRoute.useParams();
  const { client } = useRouteContext({ from: rootRoute.id });
  const { session } = useRouteContext({ from: protectedRoute.id });
  const queryClient = useQueryClient();
  const models = useQuery({ queryFn: client.listModels, queryKey: adminQueryKeys.models });
  const entry = useQuery({
    queryFn: () => client.loadEntry(entryId),
    queryKey: adminQueryKeys.entry(entryId),
  });
  const [savedEntry, setSavedEntry] = useState<ContentEntryDto | undefined>(undefined);
  const [conflict, setConflict] = useState<"publish" | "save" | undefined>(undefined);
  const [copyError, setCopyError] = useState<string | undefined>(undefined);
  const [publishAttempt, setPublishAttempt] = useState<
    { readonly idempotencyKey: string; readonly revision: number } | undefined
  >(undefined);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | undefined>(undefined);
  const currentEntry = savedEntry ?? entry.data;
  const model = models.data?.items.find((item) => item.key === modelKey);
  const modelRef = useRef<ContentModelDto | undefined>(undefined);
  modelRef.current = model;
  const form = useForm<DraftEditorValues, unknown, DraftEditorValues>({
    defaultValues: { blocks: [], fields: {}, title: "" },
    ...(model === undefined ? {} : { resolver: createDraftResolver(model) }),
  });
  const loaded = useRef<string | undefined>(undefined);
  const [suggestingSlug, setSuggestingSlug] = useState(false);
  const suggestingSlugRef = useRef(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const titleValue = form.watch("title");
  const initial =
    model === undefined || currentEntry === undefined
      ? undefined
      : draftValues(model, currentEntry);
  useEffect(() => {
    if (initial === undefined || currentEntry === undefined) return;
    const key = `${currentEntry.id}:${currentEntry.draft.revision}`;
    if (loaded.current === key) return;
    suggestingSlugRef.current = false;
    form.reset(initial);
    loaded.current = key;
    setSuggestingSlug(false);
    setSlugManuallyEdited(false);
  }, [currentEntry, form, initial]);
  useEffect(() => {
    setSavedEntry(undefined);
    setConflict(undefined);
    setPublishAttempt(undefined);
    setPublishMessage(undefined);
  }, [entryId]);
  useEffect(() => {
    if (!suggestingSlugRef.current || slugManuallyEdited) return;
    const suggested = suggestSlug(titleValue);
    if (form.getValues("slug") !== suggested)
      form.setValue("slug", suggested, { shouldDirty: true });
  }, [form, slugManuallyEdited, suggestingSlug, titleValue]);
  const blocker = useBlocker({
    enableBeforeUnload: () => form.formState.isDirty,
    shouldBlockFn: () => form.formState.isDirty,
    withResolver: true,
  });
  const save = useMutation({
    mutationFn: (values: DraftEditorValues) => {
      if (currentEntry === undefined) throw new Error("The entry has not loaded.");
      return client.saveDraft(entryId, {
        blocks: values.blocks,
        expectedRevision: currentEntry.draft.revision,
        fields: values.fields,
        ...(modelRef.current?.kind === "collection" && values.slug !== undefined
          ? { slug: values.slug }
          : {}),
        title: values.title,
      });
    },
    onError: (error) => {
      if (!(error instanceof AdminClientError)) return;
      if (error.code === "CONTENT_REVISION_CONFLICT") {
        setConflict("save");
        return;
      }
      for (const issue of error.issues ?? []) {
        const name = pointerToFormField(issue.path, modelRef.current, form.getValues("blocks"));
        if (name !== undefined)
          form.setError(name as never, { message: issue.message, type: "server" });
      }
    },
    onSuccess: async (saved) => {
      const savedModel = modelRef.current;
      if (savedModel === undefined) return;
      queryClient.setQueryData(adminQueryKeys.entry(entryId), saved);
      setSavedEntry(saved);
      suggestingSlugRef.current = false;
      setSuggestingSlug(false);
      setSlugManuallyEdited(false);
      setConflict(undefined);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.entries(modelKey) });
    },
  });
  const publish = useMutation({
    mutationFn: (attempt: { readonly idempotencyKey: string; readonly revision: number }) =>
      client.publishEntry(entryId, {
        expectedRevision: attempt.revision,
        idempotencyKey: attempt.idempotencyKey,
      }),
    onError: (error) => {
      if (error instanceof AdminClientError && error.code === "CONTENT_REVISION_CONFLICT") {
        setConflict("publish");
        setPublishAttempt(undefined);
        return;
      }
      if (error instanceof AdminClientError && error.status !== undefined)
        setPublishAttempt(undefined);
    },
    onSuccess: async (result) => {
      const publishedModel = modelRef.current;
      if (publishedModel === undefined) return;
      const values = draftValues(publishedModel, result.entry);
      queryClient.setQueryData(adminQueryKeys.entry(entryId), result.entry);
      setSavedEntry(result.entry);
      loaded.current = `${result.entry.id}:${result.entry.draft.revision}`;
      form.reset(values);
      setConflict(undefined);
      setPublishAttempt(undefined);
      setPublishMessage(buildDispatchDescription(result.build.status));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.entries(modelKey) });
    },
  });
  const reloadServerDraft = useMutation({
    mutationFn: () => client.loadEntry(entryId),
    onSuccess: (reloaded) => {
      const reloadedModel = modelRef.current;
      if (reloadedModel === undefined) return;
      queryClient.setQueryData(adminQueryKeys.entry(entryId), reloaded);
      setSavedEntry(reloaded);
      loaded.current = `${reloaded.id}:${reloaded.draft.revision}`;
      form.reset(draftValues(reloadedModel, reloaded));
      setConflict(undefined);
      setPublishAttempt(undefined);
    },
  });
  useSessionRecovery(models.error ?? entry.error);
  if (models.isPending || entry.isPending) return <RouteLoading label="Loading draft" />;
  if (models.error !== null) return <RouteError error={models.error} />;
  if (entry.error !== null) return <RouteError error={entry.error} />;
  if (model === undefined || currentEntry === undefined || currentEntry.model.key !== model.key)
    return (
      <RoutePlaceholder
        description="This entry is not available for the requested model."
        title="Entry not found"
      />
    );

  const errors = form.formState.errors.fields as
    | Record<string, { readonly message?: string }>
    | undefined;
  const blockErrors = form.formState.errors.blocks as
    | Record<string, Record<string, unknown>>
    | undefined;
  const publicPath = resolvedPublicPath(model, currentEntry);
  const canPublish = session.role === "admin";
  const retryPublish = () => {
    if (publishAttempt !== undefined) publish.mutate(publishAttempt);
  };
  const copyLocalDraft = async () => {
    try {
      if (navigator.clipboard === undefined) throw new Error("Clipboard is unavailable.");
      await navigator.clipboard.writeText(localDraftJson(form.getValues()));
      setCopyError(undefined);
    } catch {
      setCopyError("Could not copy local JSON. Select and copy it manually from your browser.");
    }
  };
  return (
    <section className="lace-page" aria-labelledby="entry-title">
      <div className="lace-page-heading">
        <div>
          <h1 id="entry-title">Edit {model.label ?? model.key}</h1>
          <p aria-live="polite">
            {save.isPending
              ? "Saving…"
              : form.formState.isDirty
                ? "Unsaved changes"
                : `Saved revision ${currentEntry.draft.revision}`}
          </p>
        </div>
        <div className="lace-actions">
          <Button
            disabled={save.isPending || !form.formState.isDirty}
            onClick={form.handleSubmit((values) => save.mutate(values))}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
          {canPublish ? (
            <Dialog
              description="Publishing makes the current validated draft public. A later draft save will not change it."
              onOpenChange={setPublishDialogOpen}
              open={publishDialogOpen}
              title="Publish this entry?"
              trigger={
                <Button disabled={publish.isPending || form.formState.isDirty}>Publish</Button>
              }
            >
              <div className="lace-actions">
                <Button
                  disabled={publish.isPending}
                  onClick={() => {
                    const attempt = {
                      idempotencyKey: ulid(),
                      revision: currentEntry.draft.revision,
                    };
                    setPublishAttempt(attempt);
                    setPublishDialogOpen(false);
                    publish.mutate(attempt);
                  }}
                >
                  {publish.isPending ? "Publishing…" : "Confirm publication"}
                </Button>
              </div>
            </Dialog>
          ) : undefined}
        </div>
      </div>
      <section aria-label="Publication status" className="lace-state lace-publication-status">
        <h2>Publication</h2>
        <p>Draft revision {currentEntry.draft.revision}</p>
        <p>
          Last edited by {currentEntry.draft.updatedBy.id} at {currentEntry.draft.updatedAt}
        </p>
        <p>{currentEntry.published === undefined ? "Not published" : "Published"}</p>
        {publicPath === undefined ? undefined : <p>Public path: {publicPath}</p>}
        {publishMessage === undefined ? undefined : <p role="status">{publishMessage}</p>}
        {publish.error !== null && publishAttempt !== undefined ? (
          <div className="lace-actions">
            <p role="alert">{errorDescription(publish.error)}</p>
            <Button disabled={publish.isPending} onClick={retryPublish} variant="secondary">
              Retry publish
            </Button>
          </div>
        ) : undefined}
      </section>
      <form
        className="lace-form lace-draft-form"
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
      >
        <label className="lace-field" htmlFor="system-title">
          <span>Title</span>
          <input
            aria-describedby={
              form.formState.errors.title === undefined ? undefined : "system-title-error"
            }
            className="lace-input"
            id="system-title"
            {...form.register("title")}
          />
          {form.formState.errors.title === undefined ? undefined : (
            <p className="lace-field-error" id="system-title-error" role="alert">
              {form.formState.errors.title.message}
            </p>
          )}
        </label>
        {model.kind === "collection" ? (
          <div className="lace-field">
            <label htmlFor="system-slug">Slug</label>
            <input
              aria-describedby={
                form.formState.errors.slug === undefined ? undefined : "system-slug-error"
              }
              className="lace-input"
              id="system-slug"
              {...form.register("slug", {
                onChange: () => {
                  if (suggestingSlug) setSlugManuallyEdited(true);
                },
              })}
            />
            <label className="lace-checkbox">
              <input
                checked={suggestingSlug}
                onChange={(event) => {
                  const enabled = event.currentTarget.checked;
                  suggestingSlugRef.current = enabled;
                  setSuggestingSlug(enabled);
                  setSlugManuallyEdited(false);
                  if (enabled)
                    form.setValue("slug", suggestSlug(form.getValues("title")), {
                      shouldDirty: true,
                    });
                }}
                type="checkbox"
              />
              Suggest from title
            </label>
            {form.formState.errors.slug === undefined ? undefined : (
              <p className="lace-field-error" id="system-slug-error" role="alert">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>
        ) : undefined}
        {Object.entries(model.fields).map(([key, definition]) => (
          <MetadataField
            control={form.control}
            definition={definition}
            error={errors?.[key]?.message}
            fieldKey={key}
            key={key}
            name={`fields.${key}`}
          />
        ))}
        <BlockEditor control={form.control} errors={blockErrors} model={model} />
        <Button disabled={save.isPending || !form.formState.isDirty} type="submit">
          {save.isPending ? "Saving…" : "Save draft"}
        </Button>
      </form>
      {conflict === undefined ? (
        save.error === null ? undefined : (
          <RouteError error={save.error} />
        )
      ) : (
        <section
          aria-labelledby="conflict-title"
          className="lace-state lace-state--error"
          role="alert"
        >
          <h2 id="conflict-title">Draft changed elsewhere</h2>
          <p>
            Your local {conflict} values are still available. Reloading is the only action that
            replaces them.
          </p>
          <div className="lace-actions">
            <Button
              disabled={reloadServerDraft.isPending}
              onClick={() => reloadServerDraft.mutate()}
            >
              {reloadServerDraft.isPending ? "Reloading…" : "Reload server draft"}
            </Button>
            <Button onClick={() => void copyLocalDraft()} variant="secondary">
              Copy my JSON
            </Button>
          </div>
          {copyError === undefined ? undefined : <p role="alert">{copyError}</p>}
          {reloadServerDraft.error === null ? undefined : (
            <p role="alert">{errorDescription(reloadServerDraft.error)}</p>
          )}
        </section>
      )}
      {blocker.status !== "blocked" ? undefined : (
        <div
          aria-labelledby="discard-title"
          className="lace-state lace-state--error"
          role="alertdialog"
        >
          <h2 id="discard-title">Discard unsaved changes?</h2>
          <p>Your draft has not been saved.</p>
          <div className="lace-actions">
            <Button onClick={() => blocker.reset()}>Stay</Button>
            <Button onClick={() => blocker.proceed()} variant="secondary">
              Leave without saving
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function RouteLoading({ label }: { readonly label: string }) {
  return (
    <section className="lace-page">
      <Skeleton label={label} lines={3} />
    </section>
  );
}
function RouteError({ error }: { readonly error: unknown }) {
  return (
    <section className="lace-page">
      <ErrorState
        description={errorDescription(error)}
        technicalDetails={technicalDetails(error)}
      />
    </section>
  );
}
function RoutePlaceholder({
  description,
  title,
}: {
  readonly description: string;
  readonly title: string;
}) {
  return (
    <section className="lace-page" aria-labelledby="route-title">
      <h1 id="route-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}
function AdminRoutePage({
  description,
  permitted,
  title,
}: {
  readonly description: string;
  readonly permitted: boolean;
  readonly title: string;
}) {
  return permitted ? (
    <RoutePlaceholder description={description} title={title} />
  ) : (
    <section className="lace-page" aria-labelledby="access-denied-title">
      <ErrorState
        description="Your role does not have permission to view this route."
        title="Access denied"
      />
    </section>
  );
}
function UsersPage() {
  const { permitted } = useRouteContext({ from: usersRoute.id });
  return (
    <AdminRoutePage
      description="User administration is connected in a later session."
      permitted={permitted}
      title="Users"
    />
  );
}
function SettingsPage() {
  const { permitted } = useRouteContext({ from: settingsRoute.id });
  return (
    <AdminRoutePage
      description="Settings are connected in a later session."
      permitted={permitted}
      title="Settings"
    />
  );
}
const sharedNavigation = [
  { label: "Content", path: "/content" },
  { label: "Media", path: "/media" },
  { label: "Builds", path: "/builds" },
] as const;
const adminNavigation = [
  { label: "Users", path: "/users" },
  { label: "Settings", path: "/settings" },
] as const;
export function navigationFor(role: AdminRole) {
  return role === "admin" ? [...sharedNavigation, ...adminNavigation] : [...sharedNavigation];
}
export function AdminApp({
  client,
  sessionSource,
}: {
  readonly client?: AdminClient;
  readonly sessionSource: AdminSessionSource;
}) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [router] = useState(() => createAdminRouter(sessionSource, undefined, client));
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAdminRouter>;
  }
}
