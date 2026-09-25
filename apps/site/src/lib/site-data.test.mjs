import { expect, test, vi } from "vitest";
import fixture from "../fixtures/published-export.json";
import { createSiteDataLoader, loadSiteData } from "./site-data.ts";

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
      LACE_PUBLIC_BASE_URL: "http://127.0.0.1:3000/",
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
  expect(first.mediaUrl("post-media")).toBe("http://127.0.0.1:3000/api/v1/public/media/post-media");
});

test("live mode reports absent and rejected tokens without revealing them", async () => {
  await expect(
    loadSiteData({
      environment: { LACE_API_BASE_URL: "http://api:3000", LACE_SITE_DATA_MODE: "live" },
    }),
  ).rejects.toThrow(/LACE_BUILD_TOKEN.*POST \/api\/v1\/admin\/api-tokens/);

  const token = "secret-build-token";
  const fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ error: { code: "AUTHORIZATION_DENIED", message: "Token invalid." } }),
        { status: 403 },
      ),
  );
  let failure;
  try {
    await loadSiteData({
      environment: {
        LACE_API_BASE_URL: "http://api:3000",
        LACE_BUILD_TOKEN: token,
        LACE_SITE_DATA_MODE: "live",
      },
      fetch,
    });
  } catch (error) {
    failure = error;
  }
  expect(failure.message).toMatch(/rejected LACE_BUILD_TOKEN.*POST \/api\/v1\/admin\/api-tokens/);
  expect(failure.message).not.toContain(token);
});

test("live mode identifies an unavailable API and an unpublished home", async () => {
  const environment = {
    LACE_API_BASE_URL: "http://api:3000",
    LACE_BUILD_TOKEN: "test-token",
    LACE_SITE_DATA_MODE: "live",
  };
  await expect(
    loadSiteData({
      environment,
      fetch: async () => {
        throw new Error("connection refused");
      },
    }),
  ).rejects.toThrow(/API is unavailable.*LACE_API_BASE_URL/);

  await expect(
    loadSiteData({
      environment,
      fetch: async () =>
        new Response(JSON.stringify({ ...fixture, entries: [] }), {
          headers: { etag: '"8"' },
          status: 200,
        }),
    }),
  ).rejects.toThrow(/published home entry.*pnpm content:sync.*publish the home page/);
});

test("live loader retries a failed first export after the API becomes available", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error("connection refused"))
    .mockResolvedValue(
      new Response(JSON.stringify(fixture), { headers: { etag: '"9"' }, status: 200 }),
    );
  const getSiteData = createSiteDataLoader({
    environment: {
      LACE_API_BASE_URL: "http://api:3000",
      LACE_BUILD_TOKEN: "test-token",
      LACE_SITE_DATA_MODE: "live",
    },
    fetch,
  });

  await expect(getSiteData()).rejects.toThrow(/API is unavailable/);
  const recovered = await getSiteData();
  expect(recovered.home.title).toBe("Lace starter");
  expect(await getSiteData()).toBe(recovered);
  expect(fetch).toHaveBeenCalledTimes(2);
});
