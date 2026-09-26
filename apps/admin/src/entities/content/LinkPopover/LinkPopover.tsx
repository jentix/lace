import type { Editor } from "@tiptap/core";
import { isSafeUrl } from "@lacecms/content";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "../../../shared/ui/Button/index.js";
import { Input } from "../../../shared/ui/Input/index.js";
import { fieldErrorClass } from "../../../shared/ui/layout/index.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../../shared/ui/Popover/index.js";
import { LINK_URL_MESSAGE } from "../editor-form.js";

/**
 * Edits the link at the editor's selection. Only URLs the shared allowlist
 * permits are applied; closing always returns focus to the text.
 */
export function LinkPopover({
  children,
  editor,
  onOpenChange,
  open,
}: {
  readonly children: ReactNode;
  readonly editor: Editor;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    if (!open) return;
    const href = editor.getAttributes("link").href as unknown;
    setValue(typeof href === "string" ? href : "");
    setError(undefined);
    setLinked(editor.isActive("link"));
  }, [editor, open]);

  const apply = () => {
    const href = value.trim();
    if (!isSafeUrl(href)) {
      setError(LINK_URL_MESSAGE);
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor
        .chain()
        .focus()
        .insertContent({ marks: [{ attrs: { href }, type: "link" }], text: href, type: "text" })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    onOpenChange(false);
  };
  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onOpenChange(false);
  };

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label="Link"
        className="grid gap-2"
        onCloseAutoFocus={(event) => {
          // Return to the text rather than the toolbar trigger.
          event.preventDefault();
          if (!editor.isDestroyed) editor.commands.focus();
        }}
      >
        <label className="text-sm font-medium" htmlFor={`${id}-url`}>
          Link URL
        </label>
        <Input
          aria-describedby={error === undefined ? undefined : `${id}-error`}
          aria-invalid={error === undefined ? undefined : true}
          id={`${id}-url`}
          inputMode="url"
          onChange={(event) => {
            setValue(event.currentTarget.value);
            setError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            apply();
          }}
          placeholder="https://"
          value={value}
        />
        {error === undefined ? undefined : (
          <p className={`${fieldErrorClass} text-xs`} id={`${id}-error`} role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          {linked ? (
            <Button onClick={removeLink} size="sm" variant="ghost">
              Remove link
            </Button>
          ) : undefined}
          <Button onClick={apply} size="sm">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
