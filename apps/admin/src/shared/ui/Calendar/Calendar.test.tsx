import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Calendar } from "./index.js";

test("selects a day from a month grid", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  render(<Calendar defaultMonth={new Date(2026, 8, 1)} mode="single" onSelect={select} />);

  expect(screen.getByRole("grid")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /September 15th, 2026/u }));
  expect(select).toHaveBeenCalledTimes(1);
  const selected = select.mock.calls[0]?.[0] as Date | undefined;
  expect(selected?.getDate()).toBe(15);
});
