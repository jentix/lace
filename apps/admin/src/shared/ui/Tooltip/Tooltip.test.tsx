import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Button } from "../Button/index.js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./index.js";

test("describes its trigger when the trigger receives keyboard focus", async () => {
  const user = userEvent.setup();
  render(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button aria-label="Duplicate block" size="icon" />
        </TooltipTrigger>
        <TooltipContent>Duplicate</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );

  await user.tab();
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Duplicate");
  expect(screen.getByRole("button", { name: "Duplicate block" })).toHaveAccessibleDescription(
    "Duplicate",
  );
});
