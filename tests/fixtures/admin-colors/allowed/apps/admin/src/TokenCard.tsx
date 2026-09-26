const pattern = /"#fff"/;

export function TokenCard({ tone }: { readonly tone: string }) {
  const root = document.querySelector("#root");
  return (
    <div className={`rounded-md border border-border bg-card ${tone} text-card-foreground`}>
      <p className="text-muted-foreground hover:bg-accent">Don't use raw colors here.</p>
      <span data-root={root === null ? "missing" : "present"}>{pattern.source}</span>
    </div>
  );
}
