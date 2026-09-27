import * as React from "react";
import { cn } from "../../lib/index.js";

/**
 * A two-state switch built on a native button with `role="switch"`, so Space
 * and Enter toggle it and a surrounding disabled fieldset disables it.
 */
function Switch({
  checked,
  className,
  onCheckedChange,
  onClick,
  ...props
}: Omit<React.ComponentProps<"button">, "children" | "role" | "type"> & {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors duration-(--duration-fast) ease-standard focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
      role="switch"
      type="button"
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-xs transition-transform duration-(--duration-fast) ease-standard",
          checked ? "translate-x-4" : "translate-x-0",
        )}
        data-slot="switch-thumb"
      />
    </button>
  );
}

export { Switch };
