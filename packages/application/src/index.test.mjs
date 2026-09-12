import { expect, test } from "vitest";
import {
  dispatcherEventId,
  dispatcherLeaseId,
  opaqueCursor,
  opaqueTokenSecret,
  opaqueTokenVerifier,
  packageName,
} from "../dist/index.js";
test("exports its package identity", () => expect(packageName).toBe("@lacecms/application"));

test("brands portable opaque values without exposing runtime dependencies", () => {
  expect(opaqueCursor("next-page")).toBe("next-page");
  expect(opaqueTokenSecret("secret")).toBe("secret");
  expect(opaqueTokenVerifier("verifier")).toBe("verifier");
  expect(dispatcherEventId("event-1")).toBe("event-1");
  expect(dispatcherLeaseId("lease-1")).toBe("lease-1");
  expect(() => opaqueCursor("")).toThrow(TypeError);
});
