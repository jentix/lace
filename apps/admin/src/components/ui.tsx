import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useId } from "react";

function join(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      className={join("lace-button", `lace-button--${variant}`, className)}
      type="button"
      {...props}
    />
  );
}

export function Input({
  className,
  id: suppliedId,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { readonly label: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <label className="lace-field" htmlFor={id}>
      <span>{label}</span>
      <input className={join("lace-input", className)} id={id} {...props} />
    </label>
  );
}

export function Select({
  label,
  options,
  value,
  onValueChange,
}: {
  readonly label: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly { readonly label: string; readonly value: string }[];
  readonly value?: string;
}) {
  const labelId = useId();
  return (
    <div className="lace-field">
      <span id={labelId}>{label}</span>
      <SelectPrimitive.Root
        onValueChange={onValueChange}
        {...(value === undefined ? {} : { value })}
      >
        <SelectPrimitive.Trigger
          aria-labelledby={labelId}
          className="lace-input lace-select-trigger"
        >
          <SelectPrimitive.Value placeholder="Select an option" />
          <SelectPrimitive.Icon aria-hidden="true">⌄</SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="lace-select-content" position="popper">
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  className="lace-select-item"
                  key={option.value}
                  value={option.value}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

export function Dialog({
  children,
  description,
  onOpenChange,
  open,
  title,
  trigger,
}: {
  readonly children: ReactNode;
  readonly description?: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly title: string;
  readonly trigger: ReactNode;
}) {
  return (
    <DialogPrimitive.Root
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
      {...(open === undefined ? {} : { open })}
    >
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="lace-dialog-overlay" />
        <DialogPrimitive.Content className="lace-dialog-content">
          <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          {description === undefined ? undefined : (
            <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
          )}
          {children}
          <DialogPrimitive.Close asChild>
            <Button aria-label="Close dialog" variant="quiet">
              Close
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Toast({
  description,
  onOpenChange,
  open,
  title,
}: {
  readonly description?: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}) {
  return (
    <ToastPrimitive.Provider>
      <ToastPrimitive.Root
        className="lace-toast"
        open={open}
        {...(onOpenChange === undefined ? {} : { onOpenChange })}
      >
        <ToastPrimitive.Title>{title}</ToastPrimitive.Title>
        {description === undefined ? undefined : (
          <ToastPrimitive.Description>{description}</ToastPrimitive.Description>
        )}
        <ToastPrimitive.Close aria-label="Dismiss notification">×</ToastPrimitive.Close>
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="lace-toast-viewport" />
    </ToastPrimitive.Provider>
  );
}

export function Table({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <div className="lace-table-wrap">
      <table aria-label={label} className="lace-table">
        {children}
      </table>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  readonly children: ReactNode;
  readonly tone?: "neutral" | "positive" | "warning";
}) {
  return <span className={`lace-badge lace-badge--${tone}`}>{children}</span>;
}

export function Skeleton({
  label = "Loading",
  lines = 2,
}: {
  readonly label?: string;
  readonly lines?: number;
}) {
  return (
    <div aria-busy="true" aria-label={label} className="lace-skeleton" role="status">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  readonly action?: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <section className="lace-state" aria-labelledby="empty-state-title">
      <h2 id="empty-state-title">{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function ErrorState({
  description,
  technicalDetails,
  title = "Something went wrong",
}: {
  readonly description: string;
  readonly technicalDetails?: string | undefined;
  readonly title?: string;
}) {
  return (
    <section
      className="lace-state lace-state--error"
      aria-labelledby="error-state-title"
      role="alert"
    >
      <h2 id="error-state-title">{title}</h2>
      <p>{description}</p>
      {technicalDetails === undefined ? undefined : (
        <details>
          <summary>Technical details</summary>
          <p>Request ID: {technicalDetails}</p>
        </details>
      )}
    </section>
  );
}
