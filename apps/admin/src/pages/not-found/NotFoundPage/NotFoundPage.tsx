import { SearchX } from "lucide-react";
import { mainClass } from "../../../shared/ui/layout/index.js";
import { PageDeadEnd } from "../../../shared/ui/PageState/index.js";

/** An unknown admin route inside the shell, with the way back to Content. */
export function NotFoundPage() {
  return (
    <PageDeadEnd
      description="This address does not match any screen in Lace admin. Check the link or go back to Content."
      icon={SearchX}
      title="Page not found"
    />
  );
}

/** The router-level fallback, rendered without the shell, so it supplies its own landmark. */
export function StandaloneNotFoundPage() {
  return (
    <main className={mainClass}>
      <NotFoundPage />
    </main>
  );
}
