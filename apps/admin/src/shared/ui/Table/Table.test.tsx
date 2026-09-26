import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./index.js";

test("renders a named semantic table inside a horizontal scroll container", () => {
  render(
    <Table aria-label="Entries">
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Welcome</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
  const table = screen.getByRole("table", { name: "Entries" });
  expect(within(table).getByRole("columnheader", { name: "Title" })).toBeInTheDocument();
  expect(within(table).getByRole("cell", { name: "Welcome" })).toBeInTheDocument();
  expect(table.parentElement).toHaveClass("overflow-x-auto");
});
