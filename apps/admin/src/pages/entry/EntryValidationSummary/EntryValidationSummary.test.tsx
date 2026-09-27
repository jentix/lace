import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import type { ValidationProblem } from "../../../entities/content/index.js";
import { EntryValidationSummary } from "./index.js";

const problems: ValidationProblem[] = [
  {
    id: "field",
    label: "Heading in Hero block 2",
    message: "Enter at least 5 characters.",
    target: { id: "field-blocks-1-data-heading", kind: "control" },
  },
  {
    id: "block",
    label: "Legacy block 3",
    message: "This block type is not allowed by the model.",
    target: { key: "BLOCK", kind: "block" },
  },
  {
    id: "media",
    label: "Cover",
    message: "Choose a media item.",
    target: { id: "field-fields-cover", kind: "control" },
  },
  { id: "unmapped", label: "Draft", message: "Something else was rejected.", target: undefined },
];

function Page() {
  return (
    <>
      <EntryValidationSummary problems={problems} />
      <input aria-label="Heading" id="field-blocks-1-data-heading" />
      <article data-block-key="BLOCK" tabIndex={-1}>
        Legacy
      </article>
      <div id="field-fields-cover">
        <button type="button">Choose media</button>
      </div>
    </>
  );
}

test("states the count and links each located problem to its control", async () => {
  const user = userEvent.setup();
  render(<Page />);
  const summary = screen.getByRole("alert");
  expect(summary).toHaveAttribute("tabindex", "-1");
  expect(screen.getByRole("heading", { name: "There are 4 problems to fix" })).toBeInTheDocument();
  expect(summary).toHaveTextContent("Heading in Hero block 2 Enter at least 5 characters.");

  await user.click(screen.getByRole("link", { name: "Heading in Hero block 2" }));
  expect(screen.getByLabelText("Heading")).toHaveFocus();
  await user.click(screen.getByRole("link", { name: "Legacy block 3" }));
  expect(screen.getByRole("article")).toHaveFocus();
  await user.click(screen.getByRole("link", { name: "Cover" }));
  expect(screen.getByRole("button", { name: "Choose media" })).toHaveFocus();
  expect(window.location.hash).toBe("");

  expect(screen.queryByRole("link", { name: "Draft" })).toBe(null);
  expect(summary).toHaveTextContent("Draft Something else was rejected.");
});

test("uses the singular heading for one problem", () => {
  render(<EntryValidationSummary problems={problems.slice(0, 1)} />);
  expect(screen.getByRole("heading", { name: "There is 1 problem to fix" })).toBeInTheDocument();
});
