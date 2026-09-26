import { getRouteApi } from "@tanstack/react-router";
import { MediaLibrary } from "../../../widgets/media-library/index.js";

const mediaRoute = getRouteApi("/_protected/media");

export function MediaPage() {
  const search = mediaRoute.useSearch();
  const navigate = mediaRoute.useNavigate();
  return (
    <MediaLibrary
      onQueryChange={(query) => navigate({ replace: true, search: query })}
      query={search}
    />
  );
}
