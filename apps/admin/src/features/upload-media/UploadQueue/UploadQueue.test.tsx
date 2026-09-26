import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { mediaItem } from "../../../app/testing/index.js";
import type { MediaUploadEntry } from "../useMediaUploads.js";
import { UploadQueue } from "./index.js";

const file = (name: string, size = 2048) =>
  new File([new Uint8Array(size)], name, { type: "image/png" });

const uploads: readonly MediaUploadEntry[] = [
  { file: file("a.png"), item: mediaItem, key: "a", progress: 1, state: "uploaded" },
  { file: file("b.png"), key: "b", progress: 0.5, state: "uploading" },
  { file: file("c.png"), key: "c", message: "Invalid image", state: "failed" },
  { file: file("d.pdf"), key: "d", message: "This file type is not supported.", state: "rejected" },
  { file: file("e.png"), key: "e", state: "queued" },
];

test("rows show per-file progress, errors, and a live summary", () => {
  render(
    <UploadQueue
      onClearFinished={vi.fn()}
      onDismiss={vi.fn()}
      onRetry={vi.fn()}
      uploads={uploads}
    />,
  );
  expect(screen.getByText("1 of 5 uploaded, 2 failed, 2 in progress")).toBeInTheDocument();
  const progress = screen.getByRole("progressbar", { name: "Upload progress for b.png" });
  expect(progress).toHaveAttribute("aria-valuenow", "50");
  expect(screen.getByText("Uploading 50%")).toBeInTheDocument();
  expect(screen.getByText("Waiting to upload")).toBeInTheDocument();
  const alerts = screen.getAllByRole("alert").map((alert) => alert.textContent);
  expect(alerts).toEqual(["Invalid image", "This file type is not supported."]);
  const rows = within(screen.getByRole("list", { name: "Upload queue" })).getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("a.png2 KBUploaded");
});

test("only server failures retry and only finished rows dismiss", async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  const onDismiss = vi.fn();
  const onClearFinished = vi.fn();
  render(
    <UploadQueue
      onClearFinished={onClearFinished}
      onDismiss={onDismiss}
      onRetry={onRetry}
      uploads={uploads}
    />,
  );
  expect(screen.getAllByRole("button", { name: /Retry upload/ })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Retry upload of c.png" }));
  expect(onRetry).toHaveBeenCalledWith("c");
  expect(screen.queryByRole("button", { name: "Dismiss b.png" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Dismiss e.png" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Dismiss d.pdf" }));
  expect(onDismiss).toHaveBeenCalledWith("d");
  await user.click(screen.getByRole("button", { name: "Clear finished" }));
  expect(onClearFinished).toHaveBeenCalled();
});

test("an empty queue renders nothing", () => {
  const { container } = render(
    <UploadQueue onClearFinished={vi.fn()} onDismiss={vi.fn()} onRetry={vi.fn()} uploads={[]} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test("uploaded rows offer their item only when the caller can choose it", async () => {
  const user = userEvent.setup();
  const onChoose = vi.fn();
  const { rerender } = render(
    <UploadQueue
      onClearFinished={vi.fn()}
      onDismiss={vi.fn()}
      onRetry={vi.fn()}
      uploads={uploads}
    />,
  );
  expect(screen.queryByRole("button", { name: /^Use / })).not.toBeInTheDocument();
  rerender(
    <UploadQueue
      onChoose={onChoose}
      onClearFinished={vi.fn()}
      onDismiss={vi.fn()}
      onRetry={vi.fn()}
      uploads={uploads}
    />,
  );
  expect(screen.getAllByRole("button", { name: /^Use / })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Use a.png" }));
  expect(onChoose).toHaveBeenCalledWith(mediaItem);
});
