import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const siteRoot = fileURLToPath(new URL("..", import.meta.url));

test("the fixture build emits published static routes without CMS access", () => {
  execFileSync("pnpm", ["run", "build"], {
    cwd: siteRoot,
    env: {
      ...process.env,
      LACE_API_BASE_URL: "https://unreachable.example/lace",
      LACE_SITE_DATA_MODE: "fixture",
    },
    stdio: "pipe",
  });

  const home = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  const post = readFileSync(new URL("../dist/blog/first-post/index.html", import.meta.url), "utf8");
  const about = readFileSync(new URL("../dist/about/index.html", import.meta.url), "utf8");
  const note = readFileSync(
    new URL("../dist/notes/first-note/index.html", import.meta.url),
    "utf8",
  );

  expect(home).toContain("The static Lace starter");
  expect(home).toContain("https://unreachable.example/lace/api/v1/public/media/hero-media");
  expect(post).toContain("First published post");
  expect(post).toContain("Content belongs in the CMS");
  expect(about).toContain("Built with Lace");
  expect(note).toContain("Notes render from the published export.");
  expect(`${home}${post}${about}${note}`).not.toContain("DRAFT ONLY");
  expect(`${home}${post}${about}${note}`).not.toContain("javascript:");
});
