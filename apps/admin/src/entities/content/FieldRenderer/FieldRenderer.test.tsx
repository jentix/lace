import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { expect, test } from "vitest";
import type { DraftEditorValues } from "../editor-form.js";
import {
  FieldRenderer,
  FieldRendererProvider,
  type FieldDefinition,
  type FieldRendererProps,
} from "./index.js";

function Harness({
  definition,
  error,
  wrap = (children) => children,
}: {
  readonly definition: FieldDefinition;
  readonly error?: string;
  readonly wrap?: (children: ReactNode) => ReactNode;
}) {
  const form = useForm<DraftEditorValues, unknown, DraftEditorValues>({
    defaultValues: { blocks: [], fields: {}, title: "" },
  });
  return wrap(
    <>
      <FieldRenderer
        control={form.control}
        definition={definition}
        error={error}
        fieldKey="heroImage"
        name="fields.heroImage"
      />
      <output data-testid="value">{JSON.stringify(form.watch("fields.heroImage") ?? null)}</output>
    </>,
  );
}

test("renders a labelled built-in control described by its help text and error", async () => {
  const user = userEvent.setup();
  render(
    <Harness
      definition={{ description: "Shown on cards.", maxLength: 40, required: true, type: "text" }}
      error="Required."
    />,
  );

  const input = screen.getByRole("textbox", { name: "Hero Image" });
  expect(input).toHaveAttribute("id", "field-fields-heroImage");
  expect(input).toHaveAccessibleDescription("Shown on cards. Required.");
  expect(screen.getByRole("alert")).toHaveTextContent("Required.");
  await user.type(input, "Cover");
  expect(screen.getByTestId("value")).toHaveTextContent('"Cover"');
});

test("uses a registry-provided renderer for media and explains when none is provided", async () => {
  const user = userEvent.setup();
  function MediaRenderer({ label, onChange }: FieldRendererProps) {
    return (
      <button onClick={() => onChange("media-1")} type="button">
        Choose media for {label}
      </button>
    );
  }
  render(
    <Harness
      definition={{ required: false, type: "media" }}
      wrap={(children) => (
        <FieldRendererProvider renderers={{ media: MediaRenderer }}>
          {children}
        </FieldRendererProvider>
      )}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Choose media for Hero Image" }));
  expect(screen.getByTestId("value")).toHaveTextContent('"media-1"');

  document.body.replaceChildren();
  render(<Harness definition={{ required: false, type: "media" }} />);
  expect(screen.getByText("Media selection is not available here.")).toBeInTheDocument();
});
