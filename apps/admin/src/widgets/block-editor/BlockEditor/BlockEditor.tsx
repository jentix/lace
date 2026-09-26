import type { ContentBlockDto, ContentModelDto } from "@lacecms/contracts";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import { ulid } from "ulid";
import {
  FieldRenderer,
  fieldLabel,
  type DraftEditorValues,
} from "../../../entities/content/index.js";
import { cn } from "../../../shared/lib/index.js";
import { buttonVariants } from "../../../shared/ui/Button/index.js";
import { actionsClass, cardClass } from "../../../shared/ui/layout/index.js";

const compactButtonClass = buttonVariants({ size: "sm", variant: "outline" });

function SortableBlockCard({
  block,
  collapsed,
  control,
  definition,
  error,
  index,
  onCollapse,
  onDuplicate,
  onMove,
  onRemove,
  total,
}: {
  readonly block: DraftEditorValues["blocks"][number];
  readonly collapsed: boolean;
  readonly control: Control<DraftEditorValues, unknown, DraftEditorValues>;
  readonly definition: NonNullable<ContentModelDto["blockDefinitions"]>[number];
  readonly error: Record<string, unknown> | undefined;
  readonly index: number;
  readonly onCollapse: () => void;
  readonly onDuplicate: () => void;
  readonly onMove: (target: number) => void;
  readonly total: number;
  readonly onRemove: () => void;
}) {
  const sortable = useSortable({ id: block.key });
  return (
    <article
      className={cardClass}
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 [&_h2]:m-0 [&_h2]:text-base [&_h2]:font-semibold">
        <h2>{definition.label ?? fieldLabel(definition.type, undefined)}</h2>
        <div className={actionsClass}>
          <button
            aria-label={`Drag ${definition.type} block`}
            className={cn(compactButtonClass, "cursor-grab")}
            {...sortable.attributes}
            {...sortable.listeners}
            type="button"
          >
            Drag
          </button>
          <button
            className={compactButtonClass}
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
            type="button"
          >
            Move up
          </button>
          <button
            className={compactButtonClass}
            disabled={index === total - 1}
            onClick={() => onMove(index + 1)}
            type="button"
          >
            Move down
          </button>
          <button className={compactButtonClass} onClick={onDuplicate} type="button">
            Duplicate
          </button>
          <button className={compactButtonClass} onClick={onCollapse} type="button">
            {collapsed ? "Expand" : "Collapse"}
          </button>
          <button className={compactButtonClass} onClick={onRemove} type="button">
            Remove
          </button>
        </div>
      </header>
      {collapsed ? undefined : (
        <div className="grid gap-3">
          {Object.entries(definition.fields).map(([fieldKey, fieldDefinition]) => (
            <FieldRenderer
              control={control}
              definition={fieldDefinition}
              error={
                (error?.data as Record<string, { readonly message?: string }> | undefined)?.[
                  fieldKey
                ]?.message
              }
              fieldKey={fieldKey}
              key={fieldKey}
              name={`blocks.${index}.data.${fieldKey}`}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export function BlockEditor({
  control,
  errors,
  model,
}: {
  readonly control: Control<DraftEditorValues, unknown, DraftEditorValues>;
  readonly errors: Record<string, Record<string, unknown>> | undefined;
  readonly model: ContentModelDto;
}) {
  const { append, fields, move, remove } = useFieldArray({
    control,
    name: "blocks",
    keyName: "formId",
  });
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const definitions = model.blockDefinitions ?? [];
  const add = (definition: (typeof definitions)[number]) => {
    const maximum = Math.max(0, ...fields.map((block) => block.position));
    append({
      data: structuredClone(definition.defaultValue ?? {}) as ContentBlockDto["data"],
      key: ulid(),
      position: maximum + 1_024,
      schemaVersion: definition.version,
      type: definition.type,
    });
  };
  const duplicate = (index: number) => {
    const current = fields[index];
    if (current === undefined) return;
    const { formId: _formId, ...block } = current;
    append({ ...block, data: structuredClone(block.data), key: ulid() });
  };
  return (
    <section
      aria-labelledby="blocks-title"
      className="mt-6 grid gap-3 [&>h2]:m-0 [&>h2]:text-lg [&>h2]:font-semibold"
    >
      <h2 id="blocks-title">Blocks</h2>
      {definitions.length === 0 ? (
        <p>This model does not allow blocks.</p>
      ) : (
        <div className={actionsClass} role="group" aria-label="Add a block">
          {definitions.map((definition) => (
            <button
              className={compactButtonClass}
              key={definition.type}
              onClick={() => add(definition)}
              type="button"
            >
              Add {definition.label ?? fieldLabel(definition.type, undefined)}
            </button>
          ))}
        </div>
      )}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over === null || active.id === over.id) return;
          const from = fields.findIndex((block) => block.key === active.id);
          const to = fields.findIndex((block) => block.key === over.id);
          if (from >= 0 && to >= 0) move(from, to);
        }}
        sensors={sensors}
      >
        <SortableContext
          items={fields.map((block) => block.key)}
          strategy={verticalListSortingStrategy}
        >
          {fields.map((block, index) => {
            const definition = definitions.find((item) => item.type === block.type);
            if (definition === undefined) return null;
            return (
              <SortableBlockCard
                block={block}
                collapsed={collapsed.has(block.key)}
                control={control}
                definition={definition}
                error={errors?.[index]}
                index={index}
                key={block.formId}
                onCollapse={() =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(block.key)) next.delete(block.key);
                    else next.add(block.key);
                    return next;
                  })
                }
                onDuplicate={() => duplicate(index)}
                onMove={(target) => target >= 0 && target < fields.length && move(index, target)}
                onRemove={() => remove(index)}
                total={fields.length}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </section>
  );
}
