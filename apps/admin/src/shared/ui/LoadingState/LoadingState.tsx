import { Skeleton } from "../Skeleton/index.js";

/** A named busy status with placeholder lines for content that is loading. */
export function LoadingState({
  label = "Loading",
  lines = 2,
}: {
  readonly label?: string;
  readonly lines?: number;
}) {
  return (
    <div aria-busy="true" aria-label={label} className="grid gap-2" role="status">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton className="block h-4 max-w-96 rounded-sm bg-border even:max-w-68" key={index} />
      ))}
    </div>
  );
}
