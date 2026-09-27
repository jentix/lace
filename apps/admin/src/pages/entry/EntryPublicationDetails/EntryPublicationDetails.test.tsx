import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { draftEntry, models, renderInRouter } from "../../../app/testing/index.js";
import { EntryPublicationDetails } from "./index.js";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

test("publication details read in plain language without IDs or ISO timestamps", async () => {
  const updatedAt = minutesAgo(5);
  const publishedAt = minutesAgo(120);
  renderInRouter(
    <EntryPublicationDetails
      entry={{
        ...draftEntry,
        draft: { ...draftEntry.draft, revision: 4, slug: "draft-post", updatedAt },
        published: {
          ...draftEntry.draft,
          id: "published-1",
          revision: 3,
          slug: "published-post",
          state: "published",
          updatedAt: publishedAt,
        },
        updatedBy: { displayName: "Ada Lovelace", id: "editor-1" },
      }}
      latestBuild={undefined}
      model={models.items[1]!}
    />,
  );
  const region = await screen.findByRole("region", { name: "Publication status" });
  expect(region).toHaveTextContent(/^PublicationChanged/u);
  expect(region).toHaveTextContent("LiveRevision 3 · published 2 hours ago");
  expect(region).toHaveTextContent("DraftRevision 4");
  expect(region).toHaveTextContent("Last editedAda Lovelace · 5 minutes ago");
  expect(region).toHaveTextContent("/posts/published-post");
  expect(region).toHaveTextContent("No build requested from this editor.");
  expect(within(region).getByRole("link", { name: "View builds" })).toHaveAttribute(
    "href",
    "/builds",
  );
  expect(region).not.toHaveTextContent("editor-1");
  expect(region).not.toHaveTextContent(updatedAt);
  expect(region.querySelector(`time[datetime="${updatedAt}"]`)).toHaveAttribute("title");
});

test("an unpublished entry and a requested build are described without claiming success", async () => {
  renderInRouter(
    <EntryPublicationDetails
      entry={{ ...draftEntry, model: { key: "home", kind: "page", path: "/" } }}
      latestBuild="accepted"
      model={models.items[0]!}
    />,
  );
  const region = await screen.findByRole("region", { name: "Publication status" });
  expect(region).toHaveTextContent(/^PublicationDraft/u);
  expect(region).toHaveTextContent("LiveNot published");
  expect(within(region).getByRole("status")).toHaveTextContent("Published. Build pending.");
  expect(within(region).queryByRole("link", { name: "View builds" })).not.toBeInTheDocument();
});
