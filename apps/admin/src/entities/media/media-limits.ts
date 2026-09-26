/** Largest media upload the admin accepts before sending it to the API. */
export const maxMediaBytes = 10 * 1024 * 1024;

/** Image types the admin accepts for upload; the API verifies the content itself. */
export const mediaTypes: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
