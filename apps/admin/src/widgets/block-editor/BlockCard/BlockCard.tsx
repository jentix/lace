import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CopyIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { useId, useRef } from "react";
import { useWatch, type Control } from "react-hook-form";
import { FieldRenderer, type DraftEditorValues } from "../../../entities/content/index.js";
import { cn } from "../../../shared/lib/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../shared/ui/DropdownMenu/index.js";
import {
  blockIcon,
  blockLabel,
  blockSummary,
  type BlockDefinitionDto,
} from "../block-presentation.js";

type BlockErrors = Record<string, unknown> | undefined;

function fieldError(error: BlockErrors, fieldKey: string): string | undefined {
  return (error?.data as Record<string, { readonly message?: string }> | undefined)?.[fieldKey]
    ?.message;
}

/**
 * One block as a sortable card: a header that stays recognizable when
 * collapsed, and the block's fields. Fields stay mounted while collapsed so
 * rich-text and media controls keep their state.
 */
export function BlockCard({
  active,
  blockKey,
  collapsed,
  control,
  definition,
  error,
  index,
  onActivate,
  onDuplicate,
  onMove,
  onRemove,
  onToggleCollapsed,
  total,
}: {
  readonly active: boolean;
  readonly blockKey: string;
  readonly collapsed: boolean;
  readonly control: Control<DraftEditorValues, unknown, DraftEditorValues>;
  readonly definition: BlockDefinitionDto;
  readonly error: BlockErrors;
  readonly index: number;
  readonly onActivate: () => void;
  readonly onDuplicate: () => void;
  readonly onMove: (target: number) => void;
  readonly onRemove: () => void;
  readonly onToggleCollapsed: () => void;
  readonly total: number;
}) {
  const id = useId();
  const sortable = useSortable({ id: blockKey });
  // Duplicate and Remove move focus elsewhere. They run once the menu has
  // closed, so its focus trap and focus return cannot take focus back.
  const afterClose = useRef<() => void>(undefined);
  const data = useWatch({ control, name: `blocks.${index}.data` });
  const label = blockLabel(definition);
  const Icon = blockIcon(definition.type);
  // A block with an error stays open so the error is never hidden.
  const hasError = error !== undefined && Object.keys(error).length > 0;
  const hidden = collapsed && !hasError;
  return (
    <article
      aria-labelledby={`${id}-title`}
      className={cn(
        "grid gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-xs transition-[border-color,box-shadow] duration-(--duration-fast) ease-standard outline-hidden",
        active && "border-primary ring-2 ring-ring/30",
        sortable.isDragging && "relative z-10 shadow-md",
      )}
      data-active={active ? "true" : undefined}
      data-block-key={blockKey}
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      tabIndex={-1}
    >
      <header className="flex min-w-0 items-center gap-2">
        <Button
          aria-label={`Reorder ${label} block`}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          size="icon-sm"
          variant="ghost"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVerticalIcon aria-hidden />
        </Button>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
        <div className="grid min-w-0 flex-1">
          <h3 className="m-0 truncate text-sm font-semibold" id={`${id}-title`}>
            {label}
          </h3>
          <p className="m-0 truncate text-xs text-muted-foreground">
            {blockSummary(definition, data)}
          </p>
        </div>
        {hasError ? undefined : (
          <Button
            aria-controls={`${id}-fields`}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${label} block`}
            onClick={onToggleCollapsed}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronDownIcon
              aria-hidden
              className={cn(
                "transition-transform duration-(--duration-fast) ease-standard",
                collapsed && "-rotate-90",
              )}
            />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Actions for ${label} block`} size="icon-sm" variant="ghost">
              <MoreHorizontalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(event) => {
              const action = afterClose.current;
              if (action === undefined) return;
              afterClose.current = undefined;
              event.preventDefault();
              action();
            }}
          >
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(index - 1)}>
              <ArrowUpIcon aria-hidden />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === total - 1} onSelect={() => onMove(index + 1)}>
              <ArrowDownIcon aria-hidden />
              Move down
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                afterClose.current = onDuplicate;
              }}
            >
              <CopyIcon aria-hidden />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                afterClose.current = onRemove;
              }}
              variant="destructive"
            >
              <Trash2Icon aria-hidden />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="grid gap-3" hidden={hidden} id={`${id}-fields`}>
        {Object.entries(definition.fields).map(([fieldKey, fieldDefinition]) => (
          <FieldRenderer
            control={control}
            definition={fieldDefinition}
            error={fieldError(error, fieldKey)}
            fieldKey={fieldKey}
            key={fieldKey}
            name={`blocks.${index}.data.${fieldKey}`}
          />
        ))}
      </div>
    </article>
  );
}
