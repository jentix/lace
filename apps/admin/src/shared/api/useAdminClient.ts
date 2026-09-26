import { getRouteApi, rootRouteId } from "@tanstack/react-router";
import type { AdminClient } from "./admin-client.js";

const rootRoute = getRouteApi(rootRouteId);

/** Returns the admin client the application router was created with. */
export function useAdminClient(): AdminClient {
  return rootRoute.useRouteContext().client;
}
