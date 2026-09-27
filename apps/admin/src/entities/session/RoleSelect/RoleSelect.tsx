import { useId } from "react";
import { fieldClass } from "../../../shared/ui/layout/index.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/ui/Select/index.js";
import { isAdminRole, roleDescription, roleLabel, roleOptions } from "../roles.js";
import type { AdminRole } from "../session.js";

/** A labelled role picker that describes what the chosen role can do. */
export function RoleSelect({
  disabled = false,
  label = "Role",
  onValueChange,
  value,
}: {
  readonly disabled?: boolean;
  readonly label?: string;
  readonly onValueChange: (role: AdminRole) => void;
  readonly value: AdminRole;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className={fieldClass}>
      <label htmlFor={id}>{label}</label>
      <Select
        disabled={disabled}
        onValueChange={(next) => {
          if (isAdminRole(next)) onValueChange(next);
        }}
        value={value}
      >
        <SelectTrigger aria-describedby={descriptionId} className="w-full font-normal" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((role) => (
            <SelectItem key={role} value={role}>
              {roleLabel(role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <small id={descriptionId}>{roleDescription(value)}</small>
    </div>
  );
}
