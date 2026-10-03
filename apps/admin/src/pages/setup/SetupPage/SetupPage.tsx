import { getRouteApi } from "@tanstack/react-router";
import { SetupAdminForm } from "../../../features/setup-admin/index.js";
const setupRoute = getRouteApi("/setup");

/** Pre-authentication installation setup, outside the protected shell. */
export function SetupPage() {
  const search = setupRoute.useSearch();
  return (
    <main className="grid min-h-screen place-items-center bg-sidebar p-4">
      <section
        aria-labelledby="setup-title"
        className="grid w-full max-w-sm gap-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8"
      >
        <div className="grid gap-2 text-center">
          <p className="font-semibold">Lace</p>
          <h1 id="setup-title" className="text-xl font-semibold tracking-tight">
            Create your administrator
          </h1>
          <p className="text-sm text-muted-foreground">
            Use the one-time token from your installation operator.
          </p>
        </div>
        <SetupAdminForm redirectTo={search.redirect ?? "/content"} />
      </section>
    </main>
  );
}
