// Utility-class recipes for repeated admin screen layouts. Every value resolves
// to a theme token; Session 16B replaces these with layered shared UI.

export const mainClass = "min-w-0 p-4 md:p-[clamp(1rem,4vw,2rem)]";

export const pageClass =
  "grid max-w-[70rem] gap-6 [&_h1]:m-0 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&>p]:-mt-4 [&>p]:text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold";

export const pageHeadingClass = "flex flex-wrap items-center justify-between gap-4";

export const formClass = "grid max-w-md gap-4";

export const actionsClass = "flex flex-wrap items-center gap-2";

export const panelClass =
  "grid justify-items-start gap-2 rounded-lg border border-dashed border-border bg-card p-6 text-card-foreground *:m-0 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold";

export const panelErrorClass = "border-destructive text-destructive";

export const cardClass = "grid gap-3 rounded-lg border border-border bg-card p-3 shadow-xs";

export const fieldClass =
  "grid gap-1.5 font-medium [&_small]:font-normal [&_small]:text-muted-foreground";

export const fieldErrorClass = "m-0 font-normal text-destructive";

export const controlClass =
  "min-h-8 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-normal text-foreground shadow-xs transition-[border-color,box-shadow] duration-(--duration-fast) ease-standard placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

export const checkboxClass = "flex items-center gap-2 font-normal";

export const listClass = "m-0 grid list-none gap-2 p-0";
