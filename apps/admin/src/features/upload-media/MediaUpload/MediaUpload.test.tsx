import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { mediaItem, renderInRouter, stubClient as client } from "../../../app/testing/index.js";
import { AdminClientError } from "../../../shared/api/index.js";
import { MediaUpload } from "./index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("media upload shows rejection, pending state, and confirmed result", async () => {
  let finish: (item: typeof mediaItem) => void = () => undefined;
  const pending = new Promise<typeof mediaItem>((resolve) => {
    finish = resolve;
  });
  const uploadMedia = vi.fn(async () => pending);
  const onUploaded = vi.fn();
  renderInRouter(<MediaUpload onUploaded={onUploaded} selectable />, {
    client: client({ uploadMedia }),
  });
  const input = await screen.findByLabelText("Upload image");
  fireEvent.change(input, {
    target: { files: [new File(["bad"], "bad.txt", { type: "text/plain" })] },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPEG");
  expect(uploadMedia).not.toHaveBeenCalled();
  fireEvent.change(input, {
    target: { files: [new File(["png"], "cover.png", { type: "image/png" })] },
  });
  expect(screen.getByText("Uploading image…")).toBeInTheDocument();
  finish(mediaItem);
  expect(await screen.findByText(/Uploaded cover.png\. Select it to use it\./)).toBeInTheDocument();
  expect(onUploaded).toHaveBeenCalledWith(mediaItem);
});

test("server-rejected and interrupted uploads stay retryable", async () => {
  const uploadMedia = vi
    .fn()
    .mockRejectedValueOnce(
      new AdminClientError({ message: "Image bytes are invalid", status: 422 }),
    )
    .mockRejectedValueOnce(new AdminClientError({ message: "The Lace API could not be reached." }));
  renderInRouter(<MediaUpload onUploaded={vi.fn()} selectable={false} />, {
    client: client({ uploadMedia }),
  });
  const input = await screen.findByLabelText("Upload image");
  fireEvent.change(input, {
    target: { files: [new File(["bad"], "bad.png", { type: "image/png" })] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Image bytes are invalid");
  fireEvent.change(input, {
    target: { files: [new File(["retry"], "retry.png", { type: "image/png" })] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be reached");
  expect(uploadMedia).toHaveBeenCalledTimes(2);
});
