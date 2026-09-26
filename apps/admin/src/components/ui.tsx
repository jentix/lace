import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useId } from "react";
import { cn } from "./cn.js";
import { controlClass, fieldClass, panelClass, panelErrorClass } from "./layout.js";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border font-medium whitespace-nowrap transition-colors duration-(--duration-fast) ease-standard disabled:cursor-not-allowed disabled:opacity-50",
  {
    defaultVariants: { size: "default", variant: "primary" },
    variants: {
      size: {
        default: "min-h-8 px-3 py-1.5 text-sm",
        sm: "min-h-7 px-2.5 py-1 text-xs",
      },
      variant: {
        primary:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        quiet:
          "border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border-border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground",
      },
    },
  },
);

export function Button({
  className,
  size,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ size, variant }), className)} type="button" {...props} />
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
    <label className={fieldClass} htmlFor={id}>
      <span>{label}</span>
      <input className={cn(controlClass, className)} id={id} {...props} />
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
    <div className={fieldClass}>
      <span id={labelId}>{label}</span>
      <SelectPrimitive.Root
        onValueChange={onValueChange}
        {...(value === undefined ? {} : { value })}
      >
        <SelectPrimitive.Trigger
          aria-labelledby={labelId}
          className={cn(controlClass, "flex items-center justify-between gap-2")}
        >
          <SelectPrimitive.Value placeholder="Select an option" />
          <SelectPrimitive.Icon aria-hidden="true">⌄</SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  className="relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 text-foreground shadow-lg">
          <DialogPrimitive.Title className="m-0 text-lg font-semibold">
            {title}
          </DialogPrimitive.Title>
          {description === undefined ? undefined : (
            <DialogPrimitive.Description className="m-0 text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
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
        className="grid gap-1 rounded-md bg-foreground p-4 text-background shadow-lg"
        open={open}
        {...(onOpenChange === undefined ? {} : { onOpenChange })}
      >
        <ToastPrimitive.Title className="font-semibold">{title}</ToastPrimitive.Title>
        {description === undefined ? undefined : (
          <ToastPrimitive.Description>{description}</ToastPrimitive.Description>
        )}
        <ToastPrimitive.Close
          aria-label="Dismiss notification"
          className="cursor-pointer justify-self-end rounded-sm px-1"
        >
          ×
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-50 m-0 grid w-[min(24rem,calc(100vw-2rem))] list-none gap-2 p-0" />
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
    <div className="overflow-x-auto">
      <table
        aria-label={label}
        className="w-full min-w-[32rem] border-collapse text-sm [&_td]:border-b [&_td]:border-border [&_td]:p-3 [&_td]:text-left [&_th]:border-b [&_th]:border-border [&_th]:p-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground"
      >
        {children}
      </table>
    </div>
  );
}

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
  {
    defaultVariants: { tone: "neutral" },
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        positive: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
      },
    },
  },
);

export function Badge({
  children,
  tone,
}: {
  readonly children: ReactNode;
} & VariantProps<typeof badgeVariants>) {
  return <span className={badgeVariants({ tone })}>{children}</span>;
}

export function Skeleton({
  label = "Loading",
  lines = 2,
}: {
  readonly label?: string;
  readonly lines?: number;
}) {
  return (
    <div aria-busy="true" aria-label={label} className="grid gap-2" role="status">
      {Array.from({ length: lines }, (_, index) => (
        <span
          className="block h-4 max-w-96 animate-pulse rounded-sm bg-border even:max-w-68"
          key={index}
        />
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
    <section className={panelClass} aria-labelledby="empty-state-title">
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
      className={cn(panelClass, panelErrorClass)}
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
