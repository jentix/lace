import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { RichTextEditor } from "./index.js";

const paragraph = {
  content: [{ content: [{ text: "Hello", type: "text" }], type: "paragraph" }],
  type: "doc",
};

test("renders a labelled editable document with a named formatting toolbar", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <RichTextEditor
      id="field-body"
      label="Body"
      onBlur={() => undefined}
      onChange={change}
      value={paragraph}
    />,
  );

  const toolbar = await screen.findByRole("toolbar", { name: "Rich text formatting" });
  expect(toolbar).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Body" })).toHaveTextContent("Hello");
  await user.click(screen.getByRole("button", { name: "Heading" }));
  await waitFor(() =>
    expect(change).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: [expect.objectContaining({ type: "heading" })],
      }),
    ),
  );
});

test("reports an unsafe link as an invalid document instead of applying it", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  vi.spyOn(window, "prompt").mockReturnValue("javascript:alert(1)");
  render(
    <RichTextEditor
      id="field-body"
      label="Body"
      onBlur={() => undefined}
      onChange={change}
      value={paragraph}
    />,
  );

  await user.click(await screen.findByRole("button", { name: "Link" }));
  expect(change).toHaveBeenCalledWith({ type: "invalid" });
  vi.restoreAllMocks();
});
