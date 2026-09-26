import { expect, test, vi } from "vitest";
import { createBrowserSessionSource } from "./session.js";

test("invalidating browser session state fetches a fresh same-origin session", async () => {
  const fetcher = vi.fn(async () => Response.json({ user: { id: "editor-1", role: "editor" } }));
  const source = createBrowserSessionSource(fetcher);

  await source.get();
  await source.get();
  expect(fetcher).toHaveBeenCalledTimes(1);
  source.invalidate();
  await source.get();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("session adapter fails closed and uses same-origin credentials", async () => {
  const fetcher = vi.fn(async () => Response.json({ user: { id: "editor-1", role: "editor" } }));
  await expect(createBrowserSessionSource(fetcher).get()).resolves.toEqual({
    id: "editor-1",
    role: "editor",
  });
  expect(fetcher).toHaveBeenCalledWith("/api/auth/get-session", {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  await expect(
    createBrowserSessionSource(async () => new Response("bad", { status: 500 })).get(),
  ).resolves.toBeNull();
});

test("session display name prefers the user name, then email, and never the ID", async () => {
  const read = (user: Record<string, unknown>) =>
    createBrowserSessionSource(async () => Response.json({ user })).get();
  await expect(
    read({ email: "ada@lace.test", id: "u-1", name: " Ada Editor ", role: "editor" }),
  ).resolves.toEqual({ displayName: "Ada Editor", id: "u-1", role: "editor" });
  await expect(
    read({ email: "ada@lace.test", id: "u-1", name: "", role: "editor" }),
  ).resolves.toEqual({ displayName: "ada@lace.test", id: "u-1", role: "editor" });
  const anonymous = await read({ id: "u-1", role: "viewer" });
  expect(anonymous).toEqual({ id: "u-1", role: "viewer" });
  expect(anonymous).not.toHaveProperty("displayName");
});
