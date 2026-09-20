import { expect, test, vi } from "vitest";
import fixture from "../fixtures/published-export.json";
import { createSiteDataLoader } from "./site-data.ts";

test("fixture mode validates the committed export without issuing a CMS request", async () => {
  const fetch = vi.fn(async () => {
    throw new Error("fixture mode must not fetch");
  });
  const getSiteData = createSiteDataLoader({
    environment: {
      LACE_API_BASE_URL: "https://unreachable.example/lace",
      LACE_SITE_DATA_MODE: "fixture",
    },
    fetch,
  });

  const site = await getSiteData();

  expect(fetch).not.toHaveBeenCalled();
  expect(site.home.title).toBe("Lace starter");
  expect(site.posts.map((post) => post.slug)).toEqual(["first-post"]);
  expect(site.mediaUrl("post-media")).toBe(
    "https://unreachable.example/lace/api/v1/public/media/post-media",
  );
});

test("live mode shares one authenticated export request across all route consumers", async () => {
  const fetch = vi.fn(
    async () => new Response(JSON.stringify(fixture), { headers: { etag: '"7"' }, status: 200 }),
  );
  const getSiteData = createSiteDataLoader({
    environment: {
      LACE_API_BASE_URL: "https://cms.example/lace",
      LACE_BUILD_TOKEN: "build-token",
      LACE_SITE_DATA_MODE: "live",
    },
    fetch,
  });

  const [first, second] = await Promise.all([getSiteData(), getSiteData()]);

  expect(first).toBe(second);
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0];
  expect(url.toString()).toBe("https://cms.example/lace/api/v1/public/build-export");
  expect(new Headers(init.headers).get("authorization")).toBe("Bearer build-token");
});
