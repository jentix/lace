import { expect, test } from "vitest";
import { parseBuildSiteIdentity } from "../dist/index.js";
import { buildSiteSelectionSchema } from "@lacecms/contracts";
import * as v from "valibot";

test("current identity is explicitly configured or absent", () => {
  expect(parseBuildSiteIdentity({})).toBe(null);
  const site = parseBuildSiteIdentity({
    LACE_BUILD_SITE_ID: "main-site",
    LACE_BUILD_SITE_LABEL: "Main site",
  });
  expect(v.parse(buildSiteSelectionSchema, { site })).toEqual({
    site: { id: "main-site", label: "Main site" },
  });
  expect(v.safeParse(buildSiteSelectionSchema, { site, source: "/private" }).success).toBe(false);
});
test.each([
  { LACE_BUILD_SITE_ID: "site" },
  { LACE_BUILD_SITE_LABEL: "Site" },
  { LACE_BUILD_SITE_ID: "/private", LACE_BUILD_SITE_LABEL: "Site" },
  { LACE_BUILD_SITE_ID: "site", LACE_BUILD_SITE_LABEL: "https://user:secret@host/" },
  { LACE_BUILD_SITE_ID: "site", LACE_BUILD_SITE_LABEL: "a".repeat(81) },
  { LACE_BUILD_SITE_ID: "a".repeat(65), LACE_BUILD_SITE_LABEL: "Site" },
  { LACE_BUILD_SITE_ID: "site", LACE_BUILD_SITE_LABEL: " Site " },
])("startup rejects unsafe identity without supplied values", (env) => {
  expect(() => parseBuildSiteIdentity(env)).toThrow(
    "Invalid build site configuration: LACE_BUILD_SITE_ID, LACE_BUILD_SITE_LABEL.",
  );
});
