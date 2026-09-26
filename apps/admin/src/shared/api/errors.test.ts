import { expect, test } from "vitest";
import { AdminClientError } from "./admin-client.js";
import { errorDescription, technicalDetails } from "./errors.js";

test("maps request failures to a sanitized message and request identifier", () => {
  const failure = new AdminClientError({ message: "Draft is stale.", requestId: "req-1" });
  expect(errorDescription(failure)).toBe("Draft is stale.");
  expect(technicalDetails(failure)).toBe("req-1");
  expect(errorDescription("offline")).toBe("The Lace admin request failed.");
  expect(technicalDetails(new Error("boom"))).toBeUndefined();
});
