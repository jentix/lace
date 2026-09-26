import type { MediaMetadataDto } from "@lacecms/contracts";
import { ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fieldLabel, type FieldRendererProps } from "../../../entities/content/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { MediaPickerDialog } from "../MediaPickerDialog/index.js";
import { SelectedMedia } from "../SelectedMedia/index.js";

/**
 * The media field renderer: shows the selected item as a card with Replace and
 * Remove, or a Choose media action, and chooses through the picker dialog.
 * Focus returns to whichever of those actions remains after a change.
 */
export function MediaPicker({
  fieldKey,
  onChange,
  value,
}: Pick<FieldRendererProps, "fieldKey" | "onChange" | "value">) {
  const label = fieldLabel(fieldKey, undefined);
  const mediaId = typeof value === "string" ? value : undefined;
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<MediaMetadataDto | undefined>();
  const action = useRef<HTMLButtonElement>(null);
  const focusAfterRemove = useRef(false);

  useEffect(() => {
    if (!focusAfterRemove.current || mediaId !== undefined) return;
    focusAfterRemove.current = false;
    action.current?.focus();
  }, [mediaId]);

  return (
    <div className="grid gap-2">
      {mediaId === undefined ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            aria-haspopup="dialog"
            aria-label={`Choose media for ${label}`}
            onClick={() => setOpen(true)}
            ref={action}
            variant="outline"
          >
            <ImagePlus aria-hidden="true" />
            Choose media
          </Button>
          <p className="m-0 text-sm text-muted-foreground">No media selected</p>
        </div>
      ) : (
        <SelectedMedia
          actionRef={action}
          label={label}
          mediaId={mediaId}
          onRemove={() => {
            focusAfterRemove.current = true;
            onChange(undefined);
          }}
          onReplace={() => setOpen(true)}
          placeholder={chosen}
        />
      )}
      <MediaPickerDialog
        currentId={mediaId}
        label={label}
        onChoose={(item) => {
          setChosen(item);
          onChange(item.id);
          setOpen(false);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          action.current?.focus();
        }}
        onOpenChange={setOpen}
        open={open}
      />
    </div>
  );
}
