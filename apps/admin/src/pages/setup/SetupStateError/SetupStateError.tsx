import { useRouter } from "@tanstack/react-router";
import { ErrorState } from "../../../shared/ui/ErrorState/index.js";

/** A failed guard reveals neither setup fields nor protected content. Retry reads only. */
export function SetupStateError() {
  const router = useRouter();
  return (
    <main className="grid min-h-screen place-items-center bg-sidebar p-4">
      <ErrorState
        title="Could not check setup"
        description="Installation state is unavailable. Try again."
        onRetry={() => {
          void router.invalidate();
        }}
      />
    </main>
  );
}
