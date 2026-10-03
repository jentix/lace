import { buildSiteIdentitySchema, type BuildSiteIdentityDto } from "@lacecms/contracts";
import * as v from "valibot";

/** Portable deployment parsing, with no supplied values in startup errors. */
export function parseBuildSiteIdentity(environment: {
  readonly LACE_BUILD_SITE_ID?: unknown;
  readonly LACE_BUILD_SITE_LABEL?: unknown;
}): BuildSiteIdentityDto | null {
  const id = environment.LACE_BUILD_SITE_ID;
  const label = environment.LACE_BUILD_SITE_LABEL;
  if (id === undefined && label === undefined) return null;
  const result = v.safeParse(buildSiteIdentitySchema, { id, label });
  if (!result.success)
    throw new Error("Invalid build site configuration: LACE_BUILD_SITE_ID, LACE_BUILD_SITE_LABEL.");
  return Object.freeze(result.output);
}
