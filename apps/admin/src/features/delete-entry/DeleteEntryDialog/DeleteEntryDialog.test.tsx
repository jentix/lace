import { screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { renderInRouter, stubClient } from "../../../app/testing/index.js";
import { AdminClientError } from "../../../shared/api/index.js";
import { DeleteEntryDialog } from "./index.js";

test("deletes only after confirmation with the expected revision and keeps failures visible", async () => {
  const user = userEvent.setup();
  const onDeleted = vi.fn();
  const deleteEntry = vi
    .fn()
    .mockRejectedValueOnce(new AdminClientError({ message: "Draft changed.", status: 409 }))
    .mockResolvedValueOnce(undefined);
  renderInRouter(
    <DeleteEntryDialog
      entryId="entry-1"
      expectedRevision={4}
      modelKey="posts"
      onDeleted={onDeleted}
      title="First"
    />,
    { client: stubClient({ deleteEntry }) },
  );

  await user.click(await screen.findByRole("button", { name: "Delete First" }));
  const dialog = screen.getByRole("dialog", { name: "Delete entry?" });
  expect(dialog).toHaveAccessibleDescription(
    "“First” will be permanently deleted. This cannot be undone.",
  );
  expect(deleteEntry).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Delete entry" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Draft changed.");
  expect(onDeleted).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Delete entry" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(deleteEntry).toHaveBeenCalledWith("entry-1", 4);
  await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
});

test("cancelling sends no request and returns focus to the trigger", async () => {
  const user = userEvent.setup();
  const deleteEntry = vi.fn(async () => undefined);
  renderInRouter(
    <DeleteEntryDialog entryId="entry-1" expectedRevision={4} modelKey="posts" title="First" />,
    { client: stubClient({ deleteEntry }) },
  );

  const trigger = await screen.findByRole("button", { name: "Delete First" });
  await user.click(trigger);
  await user.click(
    within(screen.getByRole("dialog", { name: "Delete entry?" })).getByRole("button", {
      name: "Cancel",
    }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
  expect(deleteEntry).not.toHaveBeenCalled();
});
