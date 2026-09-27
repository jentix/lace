import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { useForm } from "react-hook-form";
import { expect, test, vi } from "vitest";
import type { DraftEditorValues } from "../../../entities/content/index.js";
import type { BlockDefinitionDto } from "../block-presentation.js";
import { BlockCard } from "./index.js";

const hero: BlockDefinitionDto = {
  fields: {
    eyebrow: { required: false, type: "text" },
    heading: { required: true, type: "text" },
  },
  label: "Hero",
  type: "hero",
  version: 1,
};

const defaultValues: DraftEditorValues = {
  blocks: [
    {
      data: { eyebrow: "News", heading: "Welcome home" },
      key: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      position: 100,
      schemaVersion: 1,
      type: "hero",
    },
  ],
  fields: {},
  title: "Home",
};

type CardProps = Omit<ComponentProps<typeof BlockCard>, "blockKey" | "control" | "definition">;

function Harness(props: CardProps) {
  const form = useForm<DraftEditorValues, unknown, DraftEditorValues>({
    defaultValues: { blocks: [], fields: {}, title: "" },
  });
  // Loading values through reset, as the entry page does, keeps react-hook-form's
  // DeepPartial default-value type off the recursive JSON block data.
  useState(() => form.reset(defaultValues));
  return (
    <DndContext>
      <SortableContext items={["01ARZ3NDEKTSV4RRFFQ69G5FAV"]}>
        <BlockCard
          {...props}
          blockKey="01ARZ3NDEKTSV4RRFFQ69G5FAV"
          control={form.control}
          definition={hero}
        />
      </SortableContext>
    </DndContext>
  );
}

function mount(overrides: Partial<CardProps> = {}) {
  const props: CardProps = {
    active: false,
    collapsed: false,
    error: undefined,
    index: 0,
    onActivate: vi.fn(),
    onDuplicate: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    onToggleCollapsed: vi.fn(),
    total: 1,
    ...overrides,
  };
  const view = render(<Harness {...props} />);
  return {
    props,
    rerender: (next: Partial<CardProps>) => view.rerender(<Harness {...props} {...next} />),
  };
}

test("shows the icon, label, and a summary from data, and hides only fields when collapsed", async () => {
  const user = userEvent.setup();
  const { props, rerender } = mount();
  const card = screen.getByRole("article", { name: "Hero" });
  expect(card).toHaveTextContent("Welcome home");
  expect(screen.getByRole("textbox", { name: "Heading" })).toBeVisible();
  const toggle = screen.getByRole("button", { name: "Collapse Hero block" });
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  await user.click(toggle);
  expect(props.onToggleCollapsed).toHaveBeenCalledOnce();

  rerender({ collapsed: true });
  expect(screen.getByRole("button", { name: "Expand Hero block" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(screen.getByRole("heading", { name: "Hero" })).toBeVisible();
  expect(screen.getByText("Welcome home")).toBeVisible();
  expect(screen.getByLabelText("Heading")).not.toBeVisible();
});

test("keeps a block with an error expanded and shows the error", () => {
  mount({ collapsed: true, error: { data: { heading: { message: "Heading is required." } } } });
  expect(screen.getByLabelText("Heading")).toBeVisible();
  expect(screen.getByText("Heading is required.")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Expand Hero block/u })).not.toBeInTheDocument();
});

test("shows block-level problems and a text marker", () => {
  mount({
    error: {
      data: { extra: { message: "This block has data for the undefined field “extra”." } },
      schemaVersion: { message: "This block version is not current." },
    },
  });
  const card = screen.getByRole("article", { name: "Hero" });
  expect(card).toHaveAttribute("data-invalid", "true");
  expect(card).toHaveTextContent("Has problems");
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("This block version is not current.");
  expect(alert).toHaveTextContent("This block has data for the undefined field “extra”.");
  expect(card).toHaveAccessibleDescription(
    "This block version is not current. This block has data for the undefined field “extra”.",
  );
});

test("marks the active block and reports activation on focus", async () => {
  const user = userEvent.setup();
  const { props, rerender } = mount();
  const card = screen.getByRole("article", { name: "Hero" });
  expect(card).not.toHaveAttribute("data-active");
  await user.click(screen.getByLabelText("Heading"));
  expect(props.onActivate).toHaveBeenCalled();
  rerender({ active: true });
  expect(card).toHaveAttribute("data-active", "true");
});

test("offers move, duplicate, and remove actions with moves disabled at the ends", async () => {
  const user = userEvent.setup();
  const { props } = mount({ index: 0, total: 2 });
  // Radix menus open from the keyboard in jsdom; pointer opening needs real pointer events.
  const openMenu = async () => {
    screen.getByRole("button", { name: "Actions for Hero block" }).focus();
    await user.keyboard("{Enter}");
  };
  await openMenu();
  expect(screen.getByRole("menuitem", { name: "Move up" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await user.click(screen.getByRole("menuitem", { name: "Move down" }));
  expect(props.onMove).toHaveBeenCalledWith(1);
  await openMenu();
  await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
  expect(props.onDuplicate).toHaveBeenCalledOnce();
  await openMenu();
  await user.click(screen.getByRole("menuitem", { name: "Remove" }));
  expect(props.onRemove).toHaveBeenCalledOnce();
});

test("exposes a keyboard reorder handle", () => {
  mount();
  const handle = screen.getByRole("button", { name: "Reorder Hero block" });
  expect(handle).toHaveAttribute("aria-roledescription", "sortable");
});
