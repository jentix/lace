import { expect, test } from "vitest";
import { NodeBuilderSiteBuildTrigger, NodeSiteBuildDispatcher } from "../dist/index.js";

const secret = "s".repeat(32);
const input = { buildId: "build-1", targetVersion: 8 };

function trigger(fetch) {
  return new NodeBuilderSiteBuildTrigger({
    baseUrl: new URL("http://builder:8788/"),
    secret,
    fetch,
  });
}

test("sends only build identity and version with dedicated auth", async () => {
  const calls = [];
  const adapter = trigger(async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body), auth: init.headers.authorization });
    return Response.json({ status: "succeeded", log: "Static build succeeded." });
  });
  expect(await adapter.trigger(input)).toEqual({ status: "succeeded" });
  expect(calls).toEqual([
    { url: "http://builder:8788/build", body: input, auth: `Bearer ${secret}` },
  ]);
});

test("maps fixed failures and treats malformed or unavailable responses as retryable", async () => {
  expect(
    await trigger(async () =>
      Response.json(
        { status: "failed", reason: "build_failed", log: "Static build failed: build_failed." },
        { status: 503 },
      ),
    ).trigger(input),
  ).toEqual({ status: "failed", reason: "build_failed" });
  for (const response of [
    Response.json({ status: "succeeded", path: "/tmp" }),
    Response.json({ status: "failed", reason: "secret" }, { status: 503 }),
    new Response("not json", { status: 200 }),
  ]) {
    expect(await trigger(async () => response).trigger(input)).toEqual({
      status: "failed",
      reason: "trigger_unavailable",
    });
  }
  expect(
    await trigger(async () => {
      throw new Error("secret");
    }).trigger(input),
  ).toEqual({ status: "failed", reason: "trigger_unavailable" });
});

test("dispatcher renews a long trigger and discards a result after lease loss", async () => {
  for (const ownsLease of [true, false]) {
    let renewals = 0;
    let successes = 0;
    const work = {
      claimSiteBuilds: async () => [
        { id: "lease", buildId: "build", targetVersion: 1, event: { attempts: 0 } },
      ],
      renewSiteBuildLease: async () => {
        renewals += 1;
        return ownsLease;
      },
      recordSiteBuildSuccess: async () => {
        successes += 1;
      },
    };
    const dispatcher = new NodeSiteBuildDispatcher({
      clock: { now: () => Date.now() },
      logger: { error: () => undefined },
      leaseRenewIntervalMs: 5,
      trigger: {
        trigger: async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return { status: "succeeded" };
        },
      },
      work,
    });
    await dispatcher.runOnce();
    expect(renewals).toBeGreaterThan(0);
    expect(successes).toBe(ownsLease ? 1 : 0);
  }
});
