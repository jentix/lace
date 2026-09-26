export function Inline({ size }: { readonly size: number }) {
  return (
    <div className={`p-${size} shadow-[0_0_0_1px_rgb(0_0_0)]`} style={{ color: "white" }}>
      Inline
    </div>
  );
}
