import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { mediaItem, renderRoute, stubClient as client } from "../../../app/testing/index.js";
import { createStaticSessionSource } from "../../../entities/session/index.js";
import { AdminClientError } from "../../../shared/api/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

test("media upload shows rejection, pending state, and confirmed result", async () => {
  let finish: (item: typeof mediaItem) => void = () => undefined;
  const pending = new Promise<typeof mediaItem>((resolve) => {
    finish = resolve;
  });
  const uploadMedia = vi.fn(async () => pending);
  renderRoute(
    "/media",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({ uploadMedia }),
  );
  await screen.findByRole("heading", { name: "No media yet" });
  const input = screen.getByLabelText("Upload image");
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
  expect(await screen.findByText("cover.png")).toBeInTheDocument();
  expect(screen.getByText(/Uploaded cover.png/)).toBeInTheDocument();
});

test("server-rejected and interrupted uploads retain a usable library", async () => {
  const uploadMedia = vi
    .fn()
    .mockRejectedValueOnce(
      new AdminClientError({ message: "Image bytes are invalid", status: 422 }),
    )
    .mockRejectedValueOnce(new AdminClientError({ message: "The Lace API could not be reached." }));
  renderRoute(
    "/media",
    createStaticSessionSource({ id: "editor-1", role: "editor" }),
    client({
      listMedia: async () => ({ items: [mediaItem] }),
      uploadMedia,
    }),
  );
  await screen.findByText("cover.png");
  const input = screen.getByLabelText("Upload image");
  fireEvent.change(input, {
    target: { files: [new File(["bad"], "bad.png", { type: "image/png" })] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Image bytes are invalid");
  expect(screen.getByText("cover.png")).toBeInTheDocument();
  fireEvent.change(input, {
    target: { files: [new File(["retry"], "retry.png", { type: "image/png" })] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be reached");
  expect(uploadMedia).toHaveBeenCalledTimes(2);
});
