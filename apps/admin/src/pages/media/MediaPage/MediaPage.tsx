import { pageClass } from "../../../shared/ui/layout/index.js";
import { MediaLibrary } from "../../../widgets/media-library/index.js";

export function MediaPage() {
  return (
    <section className={pageClass} aria-labelledby="media-title">
      <h1 id="media-title">Media</h1>
      <MediaLibrary />
    </section>
  );
}
