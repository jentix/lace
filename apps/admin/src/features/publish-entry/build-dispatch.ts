import type { SiteBuildRecordDto } from "@lacecms/contracts";

/** Describes publication success separately from the build it may have requested. */
export function buildDispatchDescription(status: "queued" | "not-dispatched") {
  switch (status) {
    case "queued":
      return "Published. Build pending.";
    case "not-dispatched":
      return "Publication was already accepted; no new build was requested.";
  }
}

/** A publication's build as known from persisted history, or not yet recorded. */
export type PublicationBuildState = SiteBuildRecordDto["status"] | "waiting";

/**
 * Coalesced builds target the latest published version, so any build whose
 * target is at least the publication's version covers it.
 */
export function coveringBuildState(
  builds: readonly SiteBuildRecordDto[],
  publishedVersion: number,
): PublicationBuildState {
  const covering = builds.filter((build) => build.targetVersion >= publishedVersion);
  for (const status of ["succeeded", "running", "pending", "failed"] as const)
    if (covering.some((build) => build.status === status)) return status;
  return "waiting";
}

export function isTerminalBuildState(state: PublicationBuildState) {
  return state === "succeeded" || state === "failed";
}

/** States only what persisted history shows; never claims a dev or manual deployment. */
export function publicationBuildDescription(
  state: PublicationBuildState,
  version: number,
  siteLabel?: string,
) {
  const build = `Build for version ${version}${siteLabel === undefined ? "" : ` of ${siteLabel}`}`;
  switch (state) {
    case "waiting":
      return `Published. ${build} is queued and not yet recorded.`;
    case "pending":
      return `Published. ${build} is pending (queued or building).`;
    case "running":
      return `Published. ${build} is running.`;
    case "succeeded":
      return `Published. ${build} succeeded.`;
    case "failed":
      return `Published. ${build} failed; the previous release stays served.`;
  }
}

/** Verified Step 29 behavior, shared by Builds and the introduction. */
export const publicationVisibilityModes = [
  {
    mode: "Drafts",
    detail: "Saving a draft never changes the site and never requests a build.",
  },
  {
    mode: "Astro dev",
    detail:
      "Reload to see published changes to existing pages. Restart dev for new or renamed URLs.",
  },
  {
    mode: "Manual static build",
    detail: "Run a fresh build after publishing, then deploy its output yourself.",
  },
  {
    mode: "Automatic builds",
    detail:
      "The site changes after a build covering the publication succeeds. A failed build keeps the previous release.",
  },
] as const;
