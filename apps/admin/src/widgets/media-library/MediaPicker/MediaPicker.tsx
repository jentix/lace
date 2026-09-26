import { useState } from "react";
import { fieldLabel, type FieldRendererProps } from "../../../entities/content/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { cardClass } from "../../../shared/ui/layout/index.js";
import { MediaLibrary } from "../MediaLibrary/index.js";

/** The media field renderer: opens the library as a chooser for one media item. */
export function MediaPicker({
  fieldKey,
  onChange,
  value,
}: Pick<FieldRendererProps, "fieldKey" | "onChange" | "value">) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cardClass}>
      <Button
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
        type="button"
        variant="outline"
      >
        Choose media for {fieldLabel(fieldKey, undefined)}
      </Button>
      {open ? (
        <MediaLibrary
          onSelect={(id) => {
            onChange(id);
            setOpen(false);
          }}
          selectionLabel={fieldLabel(fieldKey, undefined)}
          value={typeof value === "string" ? value : undefined}
        />
      ) : (
        <p aria-live="polite">
          {typeof value === "string" ? `Selected: ${value}` : "No media selected"}
        </p>
      )}
    </div>
  );
}
