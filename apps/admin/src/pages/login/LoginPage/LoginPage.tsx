import { getRouteApi } from "@tanstack/react-router";
import { SignInForm } from "../../../features/sign-in/index.js";

const loginRoute = getRouteApi("/login");

/** The unauthenticated entry point: one centered card on the shell's sidebar surface. */
export function LoginPage() {
  const search = loginRoute.useSearch();
  return (
    <main className="grid min-h-screen place-items-center bg-sidebar p-4">
      <section
        aria-labelledby="login-title"
        className="grid w-full max-w-sm gap-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8"
      >
        <div className="grid justify-items-center gap-3 text-center">
          <p className="m-0 flex items-center gap-2 text-base font-semibold">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-md bg-primary text-sm text-primary-foreground"
            >
              L
            </span>
            Lace
          </p>
          <div className="grid gap-1">
            <h1 className="m-0 text-xl font-semibold tracking-tight" id="login-title">
              Sign in
            </h1>
            <p className="m-0 text-sm text-muted-foreground">
              Use your Lace account to manage site content.
            </p>
          </div>
        </div>
        <SignInForm redirectTo={search.redirect ?? "/content"} />
      </section>
    </main>
  );
}
