import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { expect, test } from "vitest";
import type { AdminRole } from "../session.js";
import { RoleSelect } from "./index.js";

function Harness() {
  const [role, setRole] = useState<AdminRole>("viewer");
  return <RoleSelect onValueChange={setRole} value={role} />;
}

test("picks a role by label and describes the chosen role", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const trigger = screen.getByRole("combobox", { name: "Role" });
  expect(trigger).toHaveTextContent("Viewer");
  expect(trigger).toHaveAccessibleDescription("Reads content and media without making changes.");
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: "Editor" }));
  expect(screen.getByRole("combobox", { name: "Role" })).toHaveTextContent("Editor");
  expect(screen.getByText("Edits drafts and uploads media.")).toBeInTheDocument();
});
