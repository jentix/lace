import { expect, test, type Page, type Route } from "@playwright/test";

type Role = "admin" | "editor";

const model = {
  blockDefinitions: [
    {
      defaultValue: { heading: "Hero" },
      fields: { heading: { required: true, type: "text" } },
      type: "hero",
      version: 1,
    },
    {
      defaultValue: { quote: "Quote" },
      fields: { quote: { required: true, type: "text" } },
      type: "quote",
      version: 1,
    },
  ],
  blocks: ["hero", "quote"],
  fields: {},
  key: "posts",
  kind: "collection",
  route: "/posts/:slug",
  version: 1,
};

function entry(title = "First post") {
  return {
    draft: {
      blocks: [],
      createdAt: "2026-09-20T00:00:00.000Z",
      entryId: "entry-1",
      fields: {},
      id: "snapshot-1",
      revision: 2,
      slug: "first-post",
      state: "draft",
      title,
      updatedAt: "2026-09-20T00:00:00.000Z",
      updatedBy: { id: "editor-1", role: "editor" },
    },
    id: "entry-1",
    model: { key: "posts", kind: "collection", route: "/posts/:slug" },
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ contentType: "application/json", status, body: JSON.stringify(body) });
}

async function mockEditor(page: Page, role: Role, onRequest?: (route: Route) => Promise<boolean>) {
  let current: ReturnType<typeof entry> & { published?: Record<string, unknown> } = entry();
  await page.route("**/api/**", async (route) => {
    if (onRequest !== undefined && (await onRequest(route))) return;
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/auth/get-session")
      return json(route, { user: { id: `${role}-1`, role } });
    if (url.pathname === "/api/v1/admin/content-models") return json(route, { items: [model] });
    if (url.pathname === "/api/v1/admin/entries/entry-1" && request.method() === "GET")
      return json(route, current);
    if (url.pathname === "/api/v1/admin/entries/entry-1/draft" && request.method() === "PUT") {
      const { expectedRevision: _expectedRevision, ...draft } =
        request.postDataJSON() as typeof current.draft & {
          expectedRevision: number;
        };
      current = {
        ...current,
        draft: { ...current.draft, ...draft, revision: current.draft.revision + 1 },
      };
      return json(route, current);
    }
    if (url.pathname === "/api/v1/admin/entries/entry-1/publish" && request.method() === "POST") {
      current = {
        ...current,
        published: { ...current.draft, id: "published-1", state: "published" },
      };
      return json(route, {
        build: { status: "accepted" },
        entry: current,
        publication: "published",
      });
    }
    return route.fallback();
  });
}

test("authors, reorders, and saves blocks through the browser", async ({ page }) => {
  let savedTypes: string[] = [];
  await mockEditor(page, "editor", async (route) => {
    if (new URL(route.request().url()).pathname !== "/api/v1/admin/entries/entry-1/draft")
      return false;
    savedTypes = (route.request().postDataJSON() as { blocks: Array<{ type: string }> }).blocks.map(
      (block) => block.type,
    );
    return false;
  });
  await page.goto("/admin/content/posts/entry-1");
  await page.getByRole("heading", { name: "Edit posts" }).waitFor();
  await page.getByRole("button", { name: "Add Hero" }).click();
  await page.getByRole("button", { name: "Add Quote" }).click();
  await page.getByRole("button", { name: "Move up" }).nth(1).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Saved revision 3")).toBeVisible();
  expect(savedTypes).toEqual(["quote", "hero"]);
});

test("offers only explicit conflict recovery after a concurrent save", async ({ page }) => {
  let conflicted = false;
  await mockEditor(page, "editor", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/admin/entries/entry-1/draft" && request.method() === "PUT") {
      conflicted = true;
      await json(route, { error: { code: "CONTENT_REVISION_CONFLICT", message: "Changed" } }, 409);
      return true;
    }
    if (
      url.pathname === "/api/v1/admin/entries/entry-1" &&
      request.method() === "GET" &&
      conflicted
    ) {
      await json(route, entry("Server draft"));
      return true;
    }
    return false;
  });
  await page.goto("/admin/content/posts/entry-1");
  await page.getByRole("textbox", { name: "Title" }).fill("Local draft");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("alert")).toContainText("Draft changed elsewhere");
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue("Local draft");
  await page.getByRole("button", { name: "Reload server draft" }).click();
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue("Server draft");
});

test("limits publication to admins and preserves public output after a later draft save", async ({
  page,
  browser,
}) => {
  await mockEditor(page, "editor");
  await page.goto("/admin/content/posts/entry-1");
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);

  const admin = await browser.newPage();
  await mockEditor(admin, "admin");
  await admin.goto("/admin/content/posts/entry-1");
  await admin.getByRole("button", { name: "Publish" }).click();
  await admin.getByRole("button", { name: "Confirm publication" }).click();
  await expect(admin.getByText("Published. Build pending.")).toBeVisible();
  await admin.getByRole("textbox", { name: "Title" }).fill("Later private draft");
  await admin.getByRole("button", { name: "Save draft" }).click();
  await expect(admin.getByRole("region", { name: "Publication status" })).toContainText(
    "Public path: /posts/first-post",
  );
  await admin.close();
});
