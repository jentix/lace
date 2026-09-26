import { getRouteApi } from "@tanstack/react-router";
import { SignInForm } from "../../../features/sign-in/index.js";
import { mainClass, pageClass } from "../../../shared/ui/layout/index.js";

const loginRoute = getRouteApi("/login");

export function LoginPage() {
  const search = loginRoute.useSearch();
  return (
    <main className={mainClass}>
      <section className={pageClass} aria-labelledby="login-title">
        <p>Lace</p>
        <h1 id="login-title">Sign in</h1>
        <SignInForm redirectTo={search.redirect ?? "/content"} />
      </section>
    </main>
  );
}
