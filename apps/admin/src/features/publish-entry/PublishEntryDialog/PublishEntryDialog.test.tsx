import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { buildDispatchDescription } from "../build-dispatch.js";
import { PublishEntryDialog } from "./index.js";

function Harness({ onConfirm, pending = false }: { onConfirm: () => void; pending?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <PublishEntryDialog
      disabled={false}
      onConfirm={onConfirm}
      onOpenChange={setOpen}
      open={open}
      pending={pending}
    />
  );
}

test("confirms publication only from the explained dialog", async () => {
  const user = userEvent.setup();
  const confirm = vi.fn();
  render(<Harness onConfirm={confirm} />);

  await user.click(screen.getByRole("button", { name: "Publish" }));
  const dialog = screen.getByRole("dialog", { name: "Publish this entry?" });
  expect(dialog).toHaveAccessibleDescription(/A later draft save will not change it/u);
  expect(confirm).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Confirm publication" }));
  expect(confirm).toHaveBeenCalledTimes(1);
});

test("disables the trigger and describes build dispatch outcomes separately", () => {
  render(
    <PublishEntryDialog
      disabled
      onConfirm={() => undefined}
      onOpenChange={() => undefined}
      open={false}
      pending={false}
    />,
  );
  expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  expect(buildDispatchDescription("accepted")).toBe("Published. Build pending.");
  expect(buildDispatchDescription("unavailable")).toContain(
    "build dispatch is currently unavailable",
  );
});
