/** Describes publication success separately from the build it may have requested. */
export function buildDispatchDescription(
  status: "accepted" | "not-dispatched" | "rejected" | "unavailable",
) {
  switch (status) {
    case "accepted":
      return "Published. Build pending.";
    case "not-dispatched":
      return "Publication was already accepted; no new build was requested.";
    case "rejected":
      return "Published, but the build request was rejected.";
    case "unavailable":
      return "Published, but build dispatch is currently unavailable.";
  }
}
