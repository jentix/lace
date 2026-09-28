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

  for (const [html, modelKey, entryId] of [
    [home, "home", "home-entry"],
    [post, "posts", "first-post-entry"],
    [about, "about", "about-entry"],
    [note, "notes", "first-note-entry"],
  ]) {
    expect(html.match(/<main\b/gu)).toHaveLength(1);
    expect(html).toContain(`<main data-lace-model="${modelKey}" data-lace-entry="${entryId}">`);
  }

  for (const [html, expected] of [
    [
      home,
      [
        ["hero", "home-hero"],
        ["cta", "home-cta"],
      ],
    ],
    [
      post,
      [
        ["richText", "post-rich-text"],
        ["image", "post-image"],
        ["quote", "post-quote"],
      ],
    ],
    [about, [["hero", "about-hero"]]],
    [note, [["quote", "note-quote"]]],
  ]) {
    const roots = [
      ...html.matchAll(
        /<(?:section|figure|blockquote|aside)\b[^>]*data-lace-block="([^"]+)"[^>]*data-lace-block-key="([^"]+)"/gu,
      ),
    ].map((match) => [match[1], match[2]]);
    expect(roots).toEqual(expected);
  }

  for (const [html, expected] of [
    [home, ["eyebrow", "heading", "body", "media", "action", "heading", "body", "action"]],
    [post, ["content", "media", "caption", "text", "attribution"]],
    [about, ["heading"]],
    [note, ["text", "attribution"]],
  ]) {
    expect([...html.matchAll(/data-lace-part="([^"]+)"/gu)].map((match) => match[1])).toEqual(
      expected,
    );
  }

  expect(home).toMatch(
    /<main data-lace-model="home" data-lace-entry="home-entry"><section class="hero" data-lace-block="hero" data-lace-block-key="home-hero">.*?<h1 data-lace-part="heading">/su,
  );
  expect(post).toMatch(
    /<main data-lace-model="posts" data-lace-entry="first-post-entry">.*?<figure data-lace-block="image" data-lace-block-key="post-image">/su,
  );

  expect(home).toContain("The static Lace starter");
  expect(home).toContain("[data-lace-block=hero]");
  expect(home).toContain("padding-block:2rem");
  expect(about).toContain("[data-lace-block=hero]");
  expect(home).toContain("https://unreachable.example/lace/api/v1/public/media/hero-media");
  expect(post).toContain("First published post");
  expect(post).toContain("Content belongs in the CMS");
  expect(about).toContain("Built with Lace");
  expect(note).toContain("Notes render from the published export.");
  expect(`${home}${post}${about}${note}`).not.toContain("DRAFT ONLY");
  expect(`${home}${post}${about}${note}`).not.toContain("javascript:");
}, 30_000);
