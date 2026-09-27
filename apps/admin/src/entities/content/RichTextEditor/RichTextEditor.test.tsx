import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { validateRichTextDocument } from "@lacecms/content";
import { expect, test, vi } from "vitest";
import { RichTextEditor } from "./index.js";

const paragraph = {
  content: [{ content: [{ text: "Hello", type: "text" }], type: "paragraph" }],
  type: "doc",
};

test("renders a labelled textbox with its field id, description, and toolbar", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const { rerender } = render(
    <RichTextEditor
      describedBy="body-help"
      id="field-body"
      label="Body"
      onBlur={() => undefined}
      onChange={change}
      value={paragraph}
    />,
  );

  expect(await screen.findByRole("toolbar", { name: "Body formatting" })).toBeInTheDocument();
  const textbox = screen.getByRole("textbox", { name: "Body" });
  expect(textbox).toHaveAttribute("id", "field-body");
  expect(textbox).toHaveAttribute("aria-describedby", "body-help");
  expect(textbox).toHaveAttribute("aria-multiline", "true");
  expect(textbox).not.toHaveAttribute("aria-invalid");
  expect(textbox).toHaveTextContent("Hello");

  rerender(
    <RichTextEditor
      describedBy="body-help body-error"
      id="field-body"
      invalid
      label="Body"
      onBlur={() => undefined}
      onChange={change}
      value={paragraph}
    />,
  );
  await waitFor(() => expect(textbox).toHaveAttribute("aria-invalid", "true"));
  expect(textbox).toHaveAttribute("aria-describedby", "body-help body-error");

  await user.click(screen.getByRole("button", { name: "Numbered list" }));
  await waitFor(() =>
    expect(change).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: [expect.objectContaining({ type: "orderedList" })] }),
    ),
  );
  expect(() => validateRichTextDocument(change.mock.lastCall?.[0])).not.toThrow();
});

test("an empty editor shows an accessible placeholder", async () => {
  render(
    <RichTextEditor
      id="field-body"
      label="Body"
      onBlur={() => undefined}
      onChange={() => undefined}
      value={undefined}
    />,
  );
  const textbox = await screen.findByRole("textbox", { name: "Body" });
  expect(textbox).toHaveAttribute("aria-placeholder", "Write something…");
  await waitFor(() =>
    expect(textbox.querySelector("p")).toHaveAttribute("data-placeholder", "Write something…"),
  );
});

test("a read-only editor has no toolbar and no placeholder", async () => {
  render(
    <RichTextEditor
      id="field-body"
      label="Body"
      onBlur={() => undefined}
      onChange={() => undefined}
      readOnly
      value={undefined}
    />,
  );
  const textbox = await screen.findByRole("textbox", { name: "Body" });
  expect(textbox).toHaveAttribute("contenteditable", "false");
  expect(textbox).not.toHaveAttribute("aria-placeholder");
  expect(textbox.querySelector("[data-placeholder]")).toBe(null);
  expect(screen.queryByRole("toolbar")).toBe(null);
});

test("keyboard shortcuts open the link control and focus the toolbar", async () => {
  render(
    <RichTextEditor
      id="field-body"
      label="Body"
      onBlur={() => undefined}
      onChange={() => undefined}
      value={paragraph}
    />,
  );
  const textbox = await screen.findByRole("textbox", { name: "Body" });
  fireEvent.keyDown(textbox, { altKey: true, key: "F10" });
  expect(screen.getByRole("combobox", { name: "Text style" })).toHaveFocus();

  fireEvent.keyDown(textbox, { ctrlKey: true, key: "k" });
  expect(await screen.findByLabelText("Link URL")).toHaveFocus();
});
