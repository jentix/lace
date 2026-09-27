import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { SiteStatusCards } from "./index.js";

test("shows readiness, models, and active tokens with a refresh action", async () => {
  const onRefresh = vi.fn();
  render(
    <SiteStatusCards
      activeTokens={3}
      error={null}
      onRefresh={onRefresh}
      refreshing={false}
      status={{ configuredModels: 4, ready: true }}
    />,
  );
  expect(screen.getByRole("group", { name: "API" })).toHaveTextContent("Ready");
  expect(screen.getByRole("group", { name: "Content models" })).toHaveTextContent("4");
  expect(screen.getByRole("group", { name: "Active build tokens" })).toHaveTextContent("3");
  await userEvent.setup().click(screen.getByRole("button", { name: "Refresh status" }));
  expect(onRefresh).toHaveBeenCalledOnce();
});

test("marks cards busy while loading", () => {
  render(
    <SiteStatusCards
      activeTokens={undefined}
      error={null}
      onRefresh={() => undefined}
      refreshing
      status={undefined}
    />,
  );
  expect(screen.getByRole("group", { name: "API" })).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("button", { name: "Refresh status" })).toBeDisabled();
});
