import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useId, useState } from "react";
import { Button } from "../Button/index.js";
import { Input } from "../Input/index.js";
import { fieldClass } from "../layout/index.js";

/**
 * A labelled password input with a toggle that reveals or hides the typed
 * value, and an optional rule shown beneath it as the input's description.
 */
export function PasswordField({
  description,
  label,
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & {
  readonly description?: string;
  readonly label: string;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const [visible, setVisible] = useState(false);
  return (
    <div className={fieldClass}>
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <Input
          aria-describedby={description === undefined ? undefined : descriptionId}
          className="pr-9"
          id={id}
          type={visible ? "text" : "password"}
          {...props}
        />
        <Button
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-0.5 right-0.5 text-muted-foreground"
          onClick={() => setVisible((value) => !value)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
      {description === undefined ? undefined : <small id={descriptionId}>{description}</small>}
    </div>
  );
}
