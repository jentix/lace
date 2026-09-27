const pattern = /"#fff"/;

export function TokenCard({ tone }: { readonly tone: string }) {
  const root = document.querySelector("#root");
  return (
    <div className={`rounded-md border border-border bg-card ${tone} text-card-foreground`}>
      <p className="text-muted-foreground hover:bg-accent">Don't use raw colors here.</p>
      <span className="grid min-w-[8rem] grid-cols-[auto_1fr] rounded-xs text-sm duration-[var(--duration-fast)] shadow-[var(--shadow-card)]">
        <span className="rounded-[inherit] data-[state=open]:text-[length:var(--text-sm)]" />
      </span>
      <span data-root={root === null ? "missing" : "present"}>{pattern.source}</span>
    </div>
  );
}
