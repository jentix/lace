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
