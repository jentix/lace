import type { ContentModelDto } from "@lacecms/contracts";
import { type ComponentType, createContext, type ReactNode, useContext } from "react";
import { Controller, type Control } from "react-hook-form";
import { Input } from "../../../shared/ui/Input/index.js";
import { controlClass, fieldClass, fieldErrorClass } from "../../../shared/ui/layout/index.js";
import { Textarea } from "../../../shared/ui/Textarea/index.js";
import type { DraftEditorValues } from "../editor-form.js";
import { fieldLabel } from "../draft.js";
import { RichTextEditor } from "../RichTextEditor/index.js";

export type FieldDefinition = ContentModelDto["fields"][string];

/** Everything a field control needs; the surrounding label, help, and error are shared. */
export interface FieldRendererProps {
  readonly definition: FieldDefinition;
  readonly describedBy: string | undefined;
  readonly fieldKey: string;
  readonly id: string;
  readonly label: string;
  readonly onBlur: () => void;
  readonly onChange: (value: unknown) => void;
  readonly value: unknown;
}

/**
 * Maps field types to their controls. Higher layers provide renderers that need
 * their own data or actions (the media picker) through `FieldRendererProvider`.
 */
export type FieldRendererRegistry = Partial<
  Record<FieldDefinition["type"], ComponentType<FieldRendererProps>>
>;

function BooleanField({ describedBy, id, onChange, value }: FieldRendererProps) {
  return (
    <input
      aria-describedby={describedBy}
      checked={value === true}
      className="size-4 justify-self-start accent-primary"
      id={id}
      onChange={(event) => onChange(event.currentTarget.checked)}
      type="checkbox"
    />
  );
}

function SelectField({ definition, describedBy, id, onBlur, onChange, value }: FieldRendererProps) {
  return (
    <select
      aria-describedby={describedBy}
      className={controlClass}
      id={id}
      onBlur={onBlur}
      onChange={(event) => onChange(event.currentTarget.value || undefined)}
      value={typeof value === "string" ? value : ""}
    >
      <option value="">Select an option</option>
      {definition.type === "select"
        ? definition.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))
        : undefined}
    </select>
  );
}

function RichTextField({ describedBy, id, label, onBlur, onChange, value }: FieldRendererProps) {
  return (
    <RichTextEditor
      {...(describedBy === undefined ? {} : { describedBy })}
      id={id}
      label={label}
      onBlur={onBlur}
      onChange={onChange}
      value={value}
    />
  );
}

function TextareaField({
  definition,
  describedBy,
  id,
  onBlur,
  onChange,
  value,
}: FieldRendererProps) {
  return (
    <Textarea
      aria-describedby={describedBy}
      id={id}
      maxLength={definition.type === "textarea" ? definition.maxLength : undefined}
      minLength={definition.type === "textarea" ? definition.minLength : undefined}
      onBlur={onBlur}
      onChange={(event) => onChange(event.currentTarget.value || undefined)}
      rows={5}
      value={typeof value === "string" ? value : ""}
    />
  );
}

function InputField({ definition, describedBy, id, onBlur, onChange, value }: FieldRendererProps) {
  return (
    <Input
      aria-describedby={describedBy}
      id={id}
      max={definition.type === "number" ? definition.max : undefined}
      maxLength={definition.type === "text" ? definition.maxLength : undefined}
      min={definition.type === "number" ? definition.min : undefined}
      minLength={definition.type === "text" ? definition.minLength : undefined}
      onBlur={onBlur}
      onChange={(event) =>
        onChange(
          definition.type === "number"
            ? event.currentTarget.value === ""
              ? undefined
              : Number(event.currentTarget.value)
            : event.currentTarget.value || undefined,
        )
      }
      type={
        definition.type === "date"
          ? "date"
          : definition.type === "number"
            ? "number"
            : definition.type === "url"
              ? "url"
              : "text"
      }
      value={typeof value === "string" || typeof value === "number" ? value : ""}
    />
  );
}

function UnavailableMediaField() {
  return <p>Media selection is not available here.</p>;
}

const builtInRenderers: Record<FieldDefinition["type"], ComponentType<FieldRendererProps>> = {
  boolean: BooleanField,
  date: InputField,
  datetime: InputField,
  media: UnavailableMediaField,
  number: InputField,
  richText: RichTextField,
  select: SelectField,
  text: InputField,
  textarea: TextareaField,
  url: InputField,
};

const FieldRendererRegistryContext = createContext<FieldRendererRegistry>({});

export function FieldRendererProvider({
  children,
  renderers,
}: {
  readonly children: ReactNode;
  readonly renderers: FieldRendererRegistry;
}) {
  return (
    <FieldRendererRegistryContext.Provider value={renderers}>
      {children}
    </FieldRendererRegistryContext.Provider>
  );
}

/** Renders one model or block field with its label, description, control, and error. */
export function FieldRenderer({
  control,
  definition,
  error,
  fieldKey,
  name,
}: {
  readonly control: Control<DraftEditorValues, unknown, DraftEditorValues>;
  readonly definition: FieldDefinition;
  readonly error: string | undefined;
  readonly fieldKey: string;
  readonly name: `blocks.${number}.data.${string}` | `fields.${string}`;
}) {
  const registry = useContext(FieldRendererRegistryContext);
  const Renderer = registry[definition.type] ?? builtInRenderers[definition.type];
  const id = `field-${name.replaceAll(".", "-")}`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const describedBy =
    [
      definition.description === undefined ? undefined : descriptionId,
      error === undefined ? undefined : errorId,
    ]
      .filter((value): value is string => value !== undefined)
      .join(" ") || undefined;
  const label = fieldLabel(fieldKey, definition.label);
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field }) => (
        <div className={fieldClass}>
          {definition.type === "richText" || definition.type === "media" ? (
            <span>{label}</span>
          ) : (
            <label htmlFor={id}>{label}</label>
          )}
          {definition.description === undefined ? undefined : (
            <small id={descriptionId}>{definition.description}</small>
          )}
          <Renderer
            definition={definition}
            describedBy={describedBy}
            fieldKey={fieldKey}
            id={id}
            label={label}
            onBlur={field.onBlur}
            onChange={field.onChange}
            value={field.value}
          />
          {error === undefined ? undefined : (
            <p className={fieldErrorClass} id={errorId} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    />
  );
}
