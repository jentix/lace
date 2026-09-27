import { expect, test } from "vitest";
import { isAdminRole, roleDescription, roleLabel, roleOptions } from "./roles.js";

test("role vocabulary names and describes every role in access order", () => {
  expect(roleOptions).toEqual(["admin", "editor", "viewer"]);
  expect(roleOptions.map(roleLabel)).toEqual(["Admin", "Editor", "Viewer"]);
  for (const role of roleOptions) expect(roleDescription(role)).toMatch(/\.$/u);
  expect(isAdminRole("editor")).toBe(true);
  expect(isAdminRole("owner")).toBe(false);
});
