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
