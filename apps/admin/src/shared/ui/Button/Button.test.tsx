import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Button } from "./index.js";

test("defaults to a non-submitting keyboard-operable button styled by tokens", async () => {
  const user = userEvent.setup();
  const submit = vi.fn((event: SubmitEvent) => event.preventDefault());
  const click = vi.fn();
  render(
    <form onSubmit={(event) => submit(event.nativeEvent as SubmitEvent)}>
      <Button onClick={click}>Save draft</Button>
      <Button variant="outline">Secondary action</Button>
      <Button type="submit">Submit form</Button>
    </form>,
  );

  const primary = screen.getByRole("button", { name: "Save draft" });
  expect(primary).toHaveAttribute("type", "button");
  expect(primary).toHaveClass("bg-primary", "text-primary-foreground");
  expect(screen.getByRole("button", { name: "Secondary action" })).toHaveClass(
    "border-border",
    "bg-background",
  );
  await user.tab();
  expect(primary).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(click).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Submit form" }));
  expect(submit).toHaveBeenCalledTimes(1);
});

test("renders its child element when used as a slot", () => {
  render(
    <Button asChild variant="link">
      <a href="/admin/content">Content</a>
    </Button>,
  );
  const link = screen.getByRole("link", { name: "Content" });
  expect(link).not.toHaveAttribute("type");
  expect(link).toHaveClass("text-primary");
});
