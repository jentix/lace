import { AdminClientError } from "./admin-client.js";

/** Maps any admin request failure to the sanitized message shown to the user. */
export function errorDescription(error: unknown): string {
  return error instanceof Error ? error.message : "The Lace admin request failed.";
}

/** Returns the request identifier support can correlate, when the API reported one. */
export function technicalDetails(error: unknown): string | undefined {
  return error instanceof AdminClientError ? error.requestId : undefined;
}
