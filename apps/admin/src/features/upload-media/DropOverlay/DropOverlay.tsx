import { Upload } from "lucide-react";
import { mediaConstraintsText } from "../../../entities/media/index.js";

/** The visible drop target shown over the library while files are dragged onto it. */
export function DropOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed border-primary bg-background/90"
      role="presentation"
    >
      <div className="grid justify-items-center gap-2 text-center">
        <Upload aria-hidden="true" className="size-8 text-primary" />
        <p className="m-0 text-base font-semibold">Drop images to upload</p>
        <p className="m-0 text-sm text-muted-foreground">{mediaConstraintsText}</p>
      </div>
    </div>
  );
}
