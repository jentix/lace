import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Button } from "../../../shared/ui/Button/index.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../shared/ui/Dialog/index.js";
import type { TourStep } from "../tour.js";
import { createTourRecords, type TourScope, type TourStatus } from "../tour-storage.js";

export interface TourHandle {
  start(opener: HTMLElement | null): void;
}

/** One optional tour per authenticated shell; changing identity remounts this controller. */
export function IntroductoryTour({
  steps,
  scope,
  ref,
  fallbackFocus,
  records = createTourRecords(scope),
}: {
  readonly steps: readonly TourStep[];
  readonly scope: TourScope;
  readonly ref?: Ref<TourHandle>;
  readonly fallbackFocus: () => HTMLElement | null;
  readonly records?: ReturnType<typeof createTourRecords>;
}) {
  const [seen, setSeen] = useState(() => records.read() !== undefined);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("content");
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const index = Math.max(
    0,
    steps.findIndex((step) => step.id === active),
  );
  const step = steps[index]!;
  // Commit a removed step's fallback so it cannot silently reappear as active later.
  useEffect(() => {
    if (active !== step.id) setActive(step.id);
  }, [active, step.id]);
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open, step.id]);
  function start(element: HTMLElement | null) {
    opener.current = element;
    setActive(steps[0]!.id);
    setOpen(true);
  }
  useImperativeHandle(ref, () => ({ start }));
  function finish(status: TourStatus) {
    records.write(status);
    setSeen(true);
    setOpen(false);
  }
  return (
    <>
      {!seen && (
        <section
          aria-labelledby="intro-welcome-title"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4"
        >
          <div className="min-w-0">
            <h2 className="text-base font-semibold" id="intro-welcome-title">
              Welcome to Lace
            </h2>
            <p className="text-sm text-muted-foreground">
              Take a short introduction to the tools available to you.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={(event) => start(event.currentTarget)}>Start tour</Button>
            <Button variant="ghost" onClick={() => finish("dismissed")}>
              Skip
            </Button>
          </div>
        </section>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) finish("dismissed");
        }}
      >
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            heading.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const previous = opener.current;
            const visible = previous?.isConnected && previous.getClientRects().length > 0;
            (visible ? previous : fallbackFocus())?.focus();
          }}
        >
          <DialogTitle
            ref={heading}
            tabIndex={-1}
            className="mr-6 rounded-sm outline-none"
            aria-label={`${step.title}, Step ${index + 1} of ${steps.length}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {step.title}
            <span className="sr-only">
              , Step {index + 1} of {steps.length}
            </span>
          </DialogTitle>
          <DialogDescription>
            Introduction · Step {index + 1} of {steps.length}
          </DialogDescription>
          <div className="grid gap-3 text-sm">
            {step.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={() => finish("dismissed")}>
              Skip tour
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={() => setActive(steps[index - 1]!.id)}
              >
                Back
              </Button>
              {index === steps.length - 1 ? (
                <Button onClick={() => finish("completed")}>Finish</Button>
              ) : (
                <Button onClick={() => setActive(steps[index + 1]!.id)}>Next</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
