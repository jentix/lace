import { CircleAlertIcon } from "lucide-react";
import type { Ref } from "react";
import type { ProblemTarget, ValidationProblem } from "../../../entities/content/index.js";

const focusableSelector =
  'input:not([type="hidden"]), textarea, select, button, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function targetElement(target: ProblemTarget): HTMLElement | null {
  if (target.kind === "blocks") return document.getElementById("blocks-title");
  if (target.kind === "block")
    return (
      [...document.querySelectorAll<HTMLElement>("[data-block-key]")].find(
        (element) => element.dataset.blockKey === target.key,
      ) ?? null
    );
  const element = document.getElementById(target.id);
  // Grouped controls (media) carry the id on their wrapper.
  if (element === null || element.matches(focusableSelector)) return element;
  return element.querySelector<HTMLElement>(focusableSelector) ?? element;
}

/** Moves focus to a problem's location and scrolls it into view. */
export function focusProblemTarget(target: ProblemTarget): void {
  const element = targetElement(target);
  if (element === null) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "center" });
}

/**
 * The editor's validation summary: how many problems block the draft, each
 * linked to its location in reading order. It receives focus when shown.
 */
export function EntryValidationSummary({
  problems,
  ref,
}: {
  readonly problems: readonly ValidationProblem[];
  readonly ref?: Ref<HTMLElement>;
}) {
  const heading =
    problems.length === 1
      ? "There is 1 problem to fix"
      : `There are ${problems.length} problems to fix`;
  return (
    <section
      aria-labelledby="validation-summary-title"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-lg border border-destructive/50 bg-card p-4 text-sm text-card-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
      ref={ref}
      role="alert"
      tabIndex={-1}
    >
      <CircleAlertIcon aria-hidden className="mt-0.5 size-4 text-destructive" />
      <div className="grid gap-2">
        <h2 className="m-0 text-sm font-semibold text-destructive" id="validation-summary-title">
          {heading}
        </h2>
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {problems.map((problem) => (
            <li key={problem.id}>
              {problem.target === undefined ? (
                <span className="font-medium">{problem.label}</span>
              ) : (
                <a
                  className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                  href={
                    problem.target.kind === "control"
                      ? `#${problem.target.id}`
                      : problem.target.kind === "blocks"
                        ? "#blocks-title"
                        : `#block-${problem.target.key}`
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (problem.target !== undefined) focusProblemTarget(problem.target);
                  }}
                >
                  {problem.label}
                </a>
              )}{" "}
              <span className="text-muted-foreground">{problem.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
