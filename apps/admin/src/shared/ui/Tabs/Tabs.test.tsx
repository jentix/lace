import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./index.js";

test("switches panels with arrow keys", async () => {
  const user = userEvent.setup();
  render(
    <Tabs defaultValue="grid">
      <TabsList aria-label="Layout">
        <TabsTrigger value="grid">Grid</TabsTrigger>
        <TabsTrigger value="list">List</TabsTrigger>
      </TabsList>
      <TabsContent value="grid">Grid view</TabsContent>
      <TabsContent value="list">List view</TabsContent>
    </Tabs>,
  );

  expect(screen.getByRole("tabpanel")).toHaveTextContent("Grid view");
  await user.tab();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "List" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel")).toHaveTextContent("List view");
});
