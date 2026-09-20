import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
  redirect,
  type RouterHistory,
  useRouteContext,
} from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { EmptyState, ErrorState, Skeleton } from "./components/ui.js";
import type { AdminRole, AdminSession, AdminSessionSource } from "./session.js";

export interface AdminRouterContext {
  readonly sessionSource: AdminSessionSource;
}

const modelKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function safeReturnPath(href: string): string {
  return href.startsWith("/") && !href.startsWith("//") ? href : "/content";
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
    const session = await context.sessionSource.get();
    if (session !== null) throw redirect({ to: "/content" });
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
  component: () => (
    <RoutePlaceholder
      description="Choose a model to begin managing structured content."
      title="Content"
    />
  ),
  getParentRoute: () => protectedRoute,
  path: "/content",
});

const modelRoute = createRoute({
  component: () => (
    <RoutePlaceholder
      description="Model navigation and entry lists arrive in Session 11B."
      title="Content model"
    />
  ),
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
  component: () => (
    <RoutePlaceholder
      description="The draft editor is introduced in the next admin sessions."
      title="Entry"
    />
  ),
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
      description="Media browsing and upload are connected in Session 11B."
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

export function createAdminRouter(sessionSource: AdminSessionSource, history?: RouterHistory) {
  return createRouter({
    context: { sessionSource },
    defaultPendingComponent: PendingRoute,
    defaultPendingMs: 0,
    ...(history === undefined ? {} : { history }),
    routeTree,
  });
}

function LoginPage() {
  return (
    <main className="lace-main">
      <section className="lace-page" aria-labelledby="login-title">
        <p>Lace</p>
        <h1 id="login-title">Sign in</h1>
        <EmptyState
          description="Sign-in controls will connect to the authenticated API in Session 11B."
          title="Your admin session is required"
        />
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
  const [navOpen, setNavOpen] = useState(false);
  const items = navigationFor(session.role);
  return (
    <div className="lace-shell" data-nav-open={navOpen}>
      <aside className="lace-sidebar" aria-label="Admin navigation">
        <Link className="lace-brand" onClick={() => setNavOpen(false)} to="/content">
          Lace
        </Link>
        <nav className="lace-nav" id="admin-navigation">
          {items.map((item) => (
            <Link key={item.path} onClick={() => setNavOpen(false)} to={item.path as never}>
              {item.label}
            </Link>
          ))}
        </nav>
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
        {children}
      </main>
    </div>
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
      <Skeleton lines={3} />
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
  if (!permitted)
    return (
      <section className="lace-page" aria-labelledby="access-denied-title">
        <ErrorState
          description="Your role does not have permission to view this route."
          title="Access denied"
        />
      </section>
    );
  return <RoutePlaceholder description={description} title={title} />;
}

function UsersPage() {
  const { permitted } = useRouteContext({ from: usersRoute.id });
  return (
    <AdminRoutePage
      description="User administration is connected in Session 11B."
      permitted={permitted}
      title="Users"
    />
  );
}

function SettingsPage() {
  const { permitted } = useRouteContext({ from: settingsRoute.id });
  return (
    <AdminRoutePage
      description="Settings are connected in Session 11B."
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

export function AdminApp({ sessionSource }: { readonly sessionSource: AdminSessionSource }) {
  const router = createAdminRouter(sessionSource);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
