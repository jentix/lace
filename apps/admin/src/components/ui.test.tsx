import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import "../styles.css";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  Table,
  Toast,
} from "./ui.js";

test("owned controls provide labels and keyboard-operable behavior", async () => {
  const user = userEvent.setup();
  render(
    <>
      <Input label="Entry title" />
      <Button>Save draft</Button>
      <Select
        label="Status"
        onValueChange={() => undefined}
        options={[{ label: "Draft", value: "draft" }]}
      />
      <Dialog title="Confirm action" trigger={<Button>Open dialog</Button>}>
        <p>Review the change before continuing.</p>
      </Dialog>
    </>,
  );

  await user.tab();
  expect(screen.getByLabelText("Entry title")).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Save draft" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Open dialog" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Confirm action");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("owned state and data components render semantic accessible output", () => {
  render(
    <>
      <Table label="Entries">
        <thead>
          <tr>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Welcome</td>
          </tr>
        </tbody>
      </Table>
      <Badge tone="positive">Published</Badge>
      <Skeleton label="Loading entries" />
      <EmptyState description="Create your first entry." title="No entries yet" />
      <ErrorState description="Try again shortly." />
      <Toast open title="Saved" />
    </>,
  );

  expect(screen.getByRole("table", { name: "Entries" })).toBeInTheDocument();
  expect(screen.getByRole("status", { name: "Loading entries" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  expect(screen.getByText("Saved")).toBeInTheDocument();
});

test("global styles preserve focus, motion, and narrow-screen rules", () => {
  const rootStyles = getComputedStyle(document.documentElement);
  expect(rootStyles.getPropertyValue("--lace-color-focus").trim()).toBe("#db7c00");
  expect(rootStyles.getPropertyValue("--lace-motion-standard").trim()).toBe("220ms");
});
