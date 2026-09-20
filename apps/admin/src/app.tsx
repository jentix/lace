import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { ContentEntryDto, ContentEntryListDto, ContentModelDto } from "@lacecms/contracts";
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
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
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
  component: () => (
    <RoutePlaceholder
      description="Media browsing and upload are connected in a later session."
      title="Media"
    />
  ),
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
      {models.data === undefined ? undefined : (
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
    <ErrorState
      description="The configured page has no singleton entry."
      title="Page unavailable"
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
          description="Create the first entry for this collection."
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
    blocks: [...entry.draft.blocks],
    fields: initialModelFieldValues(model, entry.draft.fields),
    ...(entry.draft.slug === undefined ? {} : { slug: entry.draft.slug }),
    title: entry.draft.title,
  };
}

function fieldLabel(key: string, label: string | undefined): string {
  return label ?? key.replace(/([A-Z])/gu, " $1").replace(/^./u, (value) => value.toUpperCase());
}

function MetadataField({
  control,
  definition,
  error,
  fieldKey,
}: {
  readonly control: Control<DraftEditorValues, unknown, DraftEditorValues>;
  readonly definition: ContentModelDto["fields"][string];
  readonly error: string | undefined;
  readonly fieldKey: string;
}) {
  const id = `field-${fieldKey}`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const describedBy = [
    definition.description === undefined ? undefined : descriptionId,
    error === undefined ? undefined : errorId,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");
  return (
    <Controller
      control={control}
      name={`fields.${fieldKey}` as never}
      render={({ field }) => (
        <div className="lace-field">
          <label htmlFor={id}>{fieldLabel(fieldKey, definition.label)}</label>
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
            <textarea
              aria-describedby={describedBy || undefined}
              id={id}
              onBlur={field.onBlur}
              onChange={(event) => {
                try {
                  field.onChange(JSON.parse(event.currentTarget.value));
                } catch {
                  field.onChange(event.currentTarget.value);
                }
              }}
              rows={8}
              value={field.value === undefined ? "" : JSON.stringify(field.value, null, 2)}
            />
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

function EntryEditor() {
  const { entryId, modelKey } = entryRoute.useParams();
  const { client } = useRouteContext({ from: rootRoute.id });
  const queryClient = useQueryClient();
  const models = useQuery({ queryFn: client.listModels, queryKey: adminQueryKeys.models });
  const entry = useQuery({
    queryFn: () => client.loadEntry(entryId),
    queryKey: adminQueryKeys.entry(entryId),
  });
  const [savedEntry, setSavedEntry] = useState<ContentEntryDto | undefined>(undefined);
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
  useEffect(() => setSavedEntry(undefined), [entryId]);
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
      for (const issue of error.issues ?? []) {
        const name = pointerToFormField(issue.path);
        if (name !== undefined)
          form.setError(name as never, { message: issue.message, type: "server" });
      }
    },
    onSuccess: async (saved) => {
      const savedModel = modelRef.current;
      if (savedModel === undefined) return;
      const values = draftValues(savedModel, saved);
      queryClient.setQueryData(adminQueryKeys.entry(entryId), saved);
      setSavedEntry(saved);
      loaded.current = `${saved.id}:${saved.draft.revision}`;
      suggestingSlugRef.current = false;
      form.reset(values);
      setSuggestingSlug(false);
      setSlugManuallyEdited(false);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.entries(modelKey) });
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
        <Button
          disabled={save.isPending || !form.formState.isDirty}
          onClick={form.handleSubmit((values) => save.mutate(values))}
        >
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
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
          />
        ))}
        <Button disabled={save.isPending || !form.formState.isDirty} type="submit">
          {save.isPending ? "Saving…" : "Save draft"}
        </Button>
      </form>
      {save.error === null ? undefined : <RouteError error={save.error} />}
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
