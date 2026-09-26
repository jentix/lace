import { Link, Outlet } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useSession } from "../../../entities/session/index.js";
import { useSignOut } from "../../../features/sign-out/index.js";
import { errorDescription, technicalDetails } from "../../../shared/api/index.js";
import { cn } from "../../../shared/lib/index.js";
import { Button, buttonVariants } from "../../../shared/ui/Button/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { mainClass } from "../../../shared/ui/layout/index.js";
import { navigationFor } from "../navigation.js";

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const session = useSession();
  const [navOpen, setNavOpen] = useState(false);
  const signOut = useSignOut();
  return (
    <div
      className="group min-h-screen md:grid md:grid-cols-[16rem_minmax(0,1fr)]"
      data-nav-open={navOpen}
    >
      <aside
        className="hidden grid-rows-[auto_1fr] gap-6 border-r border-sidebar-border bg-sidebar p-6 text-sidebar-foreground md:grid max-md:group-data-[nav-open=true]:fixed max-md:group-data-[nav-open=true]:inset-[0_4rem_0_0] max-md:group-data-[nav-open=true]:z-10 max-md:group-data-[nav-open=true]:grid max-md:group-data-[nav-open=true]:shadow-lg"
        aria-label="Admin navigation"
      >
        <Link
          className="text-xl font-bold text-sidebar-foreground"
          onClick={() => setNavOpen(false)}
          to="/content"
        >
          Lace
        </Link>
        <nav className="grid content-start gap-1" id="admin-navigation">
          {navigationFor(session.role).map((item) => (
            <Link
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground"
              key={item.path}
              onClick={() => setNavOpen(false)}
              to={item.path as never}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className={mainClass}>
        <div className="mb-4 flex justify-end gap-3">
          <button
            aria-controls="admin-navigation"
            aria-expanded={navOpen}
            className={cn(buttonVariants({ variant: "outline" }), "mr-auto md:hidden")}
            onClick={() => setNavOpen((open) => !open)}
            type="button"
          >
            Menu
          </button>
          <Button disabled={signOut.isPending} onClick={() => signOut.mutate()} variant="ghost">
            {signOut.isPending ? "Signing out…" : "Log out"}
          </Button>
        </div>
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

/** Route component for the protected layout: the shell around the matched screen. */
export function AdminShellLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
