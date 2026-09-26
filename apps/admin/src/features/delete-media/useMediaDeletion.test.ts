import { expect, test } from "vitest";
import { AdminClientError } from "../../shared/api/index.js";
import { mediaDeletionDescription } from "./useMediaDeletion.js";

test("explains referenced-media refusals and passes other failures through", () => {
  expect(
    mediaDeletionDescription(
      new AdminClientError({ code: "MEDIA_IN_USE", message: "In use.", status: 409 }),
    ),
  ).toContain("content still uses this media");
  expect(
    mediaDeletionDescription(
      new AdminClientError({ code: "CONTENT_INVALID_STATE", message: "Invalid state." }),
    ),
  ).toContain("no longer active");
  expect(mediaDeletionDescription(new Error("Offline."))).toBe("Offline.");
});
