import { mainClass } from "../../../shared/ui/layout/index.js";
import { LoadingState } from "../../../shared/ui/LoadingState/index.js";

/** Shown while a route guard resolves, so protected content never flashes. */
export function PendingPage() {
  return (
    <main className={mainClass} aria-label="Checking access">
      <LoadingState label="Checking access" lines={3} />
    </main>
  );
}
