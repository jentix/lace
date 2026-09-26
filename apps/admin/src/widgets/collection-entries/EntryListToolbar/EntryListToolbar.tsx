import type { ContentEntryStatusDto, ContentEntryStatusTotalsDto } from "@lacecms/contracts";
import { MAX_ENTRY_SEARCH_LENGTH } from "@lacecms/contracts";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../../shared/lib/index.js";
import { Button } from "../../../shared/ui/Button/index.js";
import { Input } from "../../../shared/ui/Input/index.js";

const SEARCH_DEBOUNCE_MS = 300;

const statusOptions = [
  { label: "All", total: "all", value: undefined },
  { label: "Draft", total: "draft", value: "draft" },
  { label: "Published", total: "published", value: "published" },
  { label: "Changed", total: "changed", value: "changed" },
] as const;

/**
 * Search box and status filter of a collection list. Typing updates the
 * search after a pause; the status buttons show the totals for the search.
 */
export function EntryListToolbar({
  onClear,
  onSearchChange,
  onStatusChange,
  search,
  status,
  totals,
}: {
  readonly onClear: () => void;
  readonly onSearchChange: (search: string) => void;
  readonly onStatusChange: (status: ContentEntryStatusDto | undefined) => void;
  readonly search: string;
  readonly status: ContentEntryStatusDto | undefined;
  readonly totals: ContentEntryStatusTotalsDto | undefined;
}) {
  const [draft, setDraft] = useState(search);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(onSearchChange);
  latest.current = onSearchChange;

  // Adopt searches applied from outside (clear filters, history navigation)
  // without trimming what the user is still typing.
  useEffect(() => {
    setDraft((current) => (current.trim() === search ? current : search));
  }, [search]);
  useEffect(() => () => clearTimeout(pending.current), []);

  function changeDraft(next: string) {
    setDraft(next);
    clearTimeout(pending.current);
    pending.current = setTimeout(() => latest.current(next), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        className="relative w-full sm:w-72"
        onSubmit={(event) => {
          event.preventDefault();
          clearTimeout(pending.current);
          onSearchChange(draft);
        }}
        role="search"
      >
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search entries"
          className="pl-8"
          maxLength={MAX_ENTRY_SEARCH_LENGTH}
          onChange={(event) => changeDraft(event.currentTarget.value)}
          placeholder="Search title or slug"
          type="search"
          value={draft}
        />
      </form>
      <div aria-label="Filter by status" className="flex flex-wrap gap-1" role="group">
        {statusOptions.map((option) => {
          const pressed = status === option.value;
          return (
            <Button
              aria-pressed={pressed}
              className={cn(pressed ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
              key={option.label}
              onClick={() => onStatusChange(option.value)}
              size="sm"
              variant="ghost"
            >
              {option.label}
              {totals === undefined ? undefined : (
                <>
                  {" "}
                  <span className="text-xs tabular-nums opacity-80">{totals[option.total]}</span>
                </>
              )}
            </Button>
          );
        })}
      </div>
      {search.length > 0 || status !== undefined ? (
        <Button onClick={onClear} size="sm" variant="ghost">
          <X aria-hidden="true" />
          Clear filters
        </Button>
      ) : undefined}
    </div>
  );
}
