/** Keeps only same-origin absolute paths as post-login destinations. */
export function safeReturnPath(href: string): string {
  return href.startsWith("/") && !href.startsWith("//") ? href : "/content";
}
