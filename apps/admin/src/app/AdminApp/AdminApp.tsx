import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useState } from "react";
import type { AdminSessionSource } from "../../entities/session/index.js";
import type { AdminClient } from "../../shared/api/index.js";
import { Toaster } from "../../shared/ui/Toaster/index.js";
import { TooltipProvider } from "../../shared/ui/Tooltip/index.js";
import { createAdminRouter } from "../router/index.js";

export function AdminApp({
  client,
  sessionSource,
}: {
  readonly client?: AdminClient;
  readonly sessionSource: AdminSessionSource;
}) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [router] = useState(() => createAdminRouter(sessionSource, undefined, client));
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
