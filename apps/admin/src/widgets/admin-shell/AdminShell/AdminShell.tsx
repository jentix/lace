import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSignOut } from "../../../features/sign-out/index.js";
import { errorDescription, technicalDetails } from "../../../shared/api/index.js";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { ShellHeader } from "../ShellHeader/index.js";
import { SidebarNav } from "../SidebarNav/index.js";

/**
 * The inset-panel shell: a persistent sidebar from `md` up, a sheet below it,
 * and the route content in a raised panel under breadcrumbs.
 */
export function AdminShell({ children }: { readonly children: ReactNode }) {
  const signOut = useSignOut();
  const signOutProps = { onSignOut: () => signOut.mutate(), signingOut: signOut.isPending };
  return (
    <div className="min-h-screen bg-sidebar md:flex">
      <a
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        href="#main-content"
      >
        Skip to content
      </a>
      <aside
        aria-label="Admin navigation"
        className="hidden w-60 shrink-0 md:sticky md:top-0 md:block md:h-screen"
      >
        <SidebarNav {...signOutProps} />
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-background md:m-2 md:ml-0 md:min-h-[calc(100vh-1rem)] md:rounded-xl md:border md:border-border md:shadow-xs">
        <ShellHeader {...signOutProps} />
        <main className="min-w-0 flex-1 p-4 outline-none md:p-6" id="main-content" tabIndex={-1}>
          {signOut.error === null ? undefined : (
            <div className="mb-4">
              <ErrorState
                description={errorDescription(signOut.error)}
                technicalDetails={technicalDetails(signOut.error)}
              />
            </div>
          )}
          {children}
        </main>
      </div>
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
