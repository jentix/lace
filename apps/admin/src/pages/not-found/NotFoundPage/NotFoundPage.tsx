import { ErrorState } from "../../../shared/ui/ErrorState/index.js";
import { mainClass } from "../../../shared/ui/layout/index.js";

export function NotFoundPage() {
  return (
    <main className={mainClass}>
      <ErrorState description="This route does not exist in Lace admin." title="Page not found" />
    </main>
  );
}
