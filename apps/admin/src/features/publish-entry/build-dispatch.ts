/** Describes publication success separately from the build it may have requested. */
export function buildDispatchDescription(status: "queued" | "not-dispatched") {
  switch (status) {
    case "queued":
      return "Published. Build pending.";
    case "not-dispatched":
      return "Publication was already accepted; no new build was requested.";
  }
}
