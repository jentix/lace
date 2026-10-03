import type { AdminClient } from "../../shared/api/index.js";

/** Always reads durable state afresh; completion is never inferred from users or a cache. */
export function readSetupState(client: AdminClient) {
  return client.loadSetupState();
}
