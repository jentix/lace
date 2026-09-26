import { type ComponentProps, useId } from "react";
import { Input } from "../Input/index.js";
import { fieldClass } from "../layout/index.js";

/** A labelled single-line text input; the label wraps the control. */
export function TextField({
  id: suppliedId,
  label,
  ...props
}: ComponentProps<typeof Input> & { readonly label: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <label className={fieldClass} htmlFor={id}>
      <span>{label}</span>
      <Input id={id} {...props} />
    </label>
  );
}
