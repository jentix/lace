import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";
import { generateProject } from "../dist/index.js";

const exec = promisify(execFile);
const workspace = fileURLToPath(new URL("../../../", import.meta.url));
const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function project() {
  const parent = await mkdtemp(join(tmpdir(), "lace-onboarding-test-"));
  roots.push(parent);
  const result = await generateProject({ target: join(parent, "site") });
  // Focused template tests reuse installed tools; packaged isolation is checked by acceptance.
  await symlink(join(workspace, "apps/site/node_modules"), join(result.path, "site/node_modules"));
  return result;
}

test("generated renderer files retain reference safety and user ownership", async () => {
  const generated = await project();
  for (const [path, ownership] of Object.entries(generated.manifest.files)) {
    if (!/site\/src\/(components|lib\/(rich-text|rendering))/u.test(path)) continue;
    expect(ownership).toEqual({ owner: "user" });
    expect(await readFile(join(generated.path, path), "utf8")).toBe(
      await readFile(join(workspace, "apps", path), "utf8"),
    );
  }
});

test("generated live loader shares exports, retries failures and isolates build credentials", async () => {
  const generated = await project();
  const fixturePath = join(workspace, "apps/site/src/fixtures/published-export.json");
  const code = `
    import assert from 'node:assert/strict';
    import { readFile } from 'node:fs/promises';
    import { createSiteDataLoader, loadSiteData } from './src/lib/site-data.ts';
    const fixture = JSON.parse(await readFile(${JSON.stringify(fixturePath)}, 'utf8'));
    const environment = { LACE_API_BASE_URL: 'http://api:3000/', LACE_BUILD_TOKEN: 'private-build-credential', LACE_PUBLIC_BASE_URL: 'https://media.example/lace/' };
    let calls = 0;
    const loader = createSiteDataLoader({ environment, fetch: async (url, init) => {
      calls++;
      assert.equal(String(url), 'http://api:3000/api/v1/public/build-export');
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer private-build-credential');
      if (calls === 1) throw new Error('connection refused');
      return new Response(JSON.stringify(fixture), { headers: { etag: '"7"' } });
    }});
    await assert.rejects(loader(), /API is unavailable/);
    const [left, right] = await Promise.all([loader(), loader()]);
    assert.equal(left, right); assert.equal(calls, 2);
    assert.equal(left.mediaUrl('post-media'), 'https://media.example/lace/api/v1/public/media/post-media');
    assert.equal(left.posts[0].title, 'First published post');
    assert.ok(!JSON.stringify(left).includes('DRAFT ONLY'));
    await assert.rejects(loadSiteData({ environment: {} }), /LACE_BUILD_TOKEN.*Admin Settings/);
    await assert.rejects(loadSiteData({ environment, fetch: async () => new Response(JSON.stringify({ error: { code: 'AUTHORIZATION_DENIED', message: 'Rejected' }}), {status: 403}) }), error => /rejected LACE_BUILD_TOKEN/.test(error.message) && !error.message.includes(environment.LACE_BUILD_TOKEN));
    await assert.rejects(loadSiteData({ environment: { ...environment, LACE_EXPECTED_PUBLISHED_VERSION: '8' }, fetch: async () => new Response(JSON.stringify(fixture), { headers: { etag: '"7"' } }) }), /published-state version changed/);
    await assert.rejects(loadSiteData({ environment, fetch: async () => new Response(JSON.stringify({ ...fixture, entries: [] }), { headers: { etag: '"7"' } }) }), /publish the home page/);
  `;
  await exec(process.execPath, ["--input-type=module", "-e", code], {
    cwd: join(generated.path, "site"),
  });
});

test("generated dev loader revalidates exports with their ETag", async () => {
  const generated = await project();
  const fixturePath = join(workspace, "apps/site/src/fixtures/published-export.json");
  const code = `
    import assert from 'node:assert/strict';
    import { readFile } from 'node:fs/promises';
    import { createSiteDataLoader } from './src/lib/site-data.ts';
    const fixture = JSON.parse(await readFile(${JSON.stringify(fixturePath)}, 'utf8'));
    const environment = { LACE_API_BASE_URL: 'http://api:3000/', LACE_BUILD_TOKEN: 'private-build-credential' };
    const conditions = [];
    let version = 7;
    let failNext = false;
    const loader = createSiteDataLoader({ environment, revalidate: true, fetch: async (_url, init) => {
      conditions.push(new Headers(init.headers).get('if-none-match'));
      if (failNext) { failNext = false; throw new Error('connection refused'); }
      const etag = '"' + version + '"';
      if (new Headers(init.headers).get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } });
      const exported = structuredClone(fixture);
      exported.entries[0].entry.published.title = 'Home v' + version;
      return new Response(JSON.stringify(exported), { headers: { etag } });
    }});
    const [left, right] = await Promise.all([loader(), loader()]);
    assert.equal(left, right);
    assert.deepEqual(conditions, [null]);
    assert.equal(await loader(), left);
    assert.deepEqual(conditions, [null, '"7"']);
    version = 8;
    const changed = await loader();
    assert.notEqual(changed, left);
    assert.equal(changed.home.title, 'Home v8');
    failNext = true;
    await assert.rejects(loader(), /API is unavailable/);
    assert.equal((await loader()).home.title, 'Home v8');
    assert.deepEqual(conditions, [null, '"7"', '"7"', '"8"', '"8"']);
  `;
  await exec(process.execPath, ["--input-type=module", "-e", code], {
    cwd: join(generated.path, "site"),
  });
});

test("generated Astro builds all five blocks from one export and rejects unsupported content", async () => {
  const generated = await project();
  const fixture = JSON.parse(
    await readFile(join(workspace, "apps/site/src/fixtures/published-export.json"), "utf8"),
  );
  fixture.entries = fixture.entries.slice(0, 2);
  let calls = 0;
  const token = "private-test-build-credential";
  const server = createServer((req, res) => {
    calls++;
    if (
      req.url !== "/api/v1/public/build-export" ||
      req.headers.authorization !== `Bearer ${token}`
    ) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(200, { "content-type": "application/json", etag: '"7"' });
    res.end(JSON.stringify(fixture));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const env = {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: "1",
    LACE_API_BASE_URL: `http://127.0.0.1:${server.address().port}/`,
    LACE_PUBLIC_BASE_URL: "https://public.example/lace/",
    LACE_BUILD_TOKEN: token,
  };
  const build = () =>
    exec(
      process.execPath,
      [join(workspace, "apps/site/node_modules/astro/bin/astro.mjs"), "build"],
      { cwd: join(generated.path, "site"), env },
    );
  try {
    await build();
    expect(calls).toBe(1);
    const home = await readFile(join(generated.path, "site/dist/index.html"), "utf8");
    const post = await readFile(
      join(generated.path, "site/dist/blog/first-post/index.html"),
      "utf8",
    );
    expect([...home.matchAll(/data-lace-block="([^"]+)"/gu)].map((match) => match[1])).toEqual([
      "hero",
      "cta",
    ]);
    expect([...post.matchAll(/data-lace-block="([^"]+)"/gu)].map((match) => match[1])).toEqual([
      "richText",
      "image",
      "quote",
    ]);
    expect(home).toContain('data-lace-model="home" data-lace-entry="home-entry"');
    expect(post).toContain('data-lace-block-key="post-image"');
    expect(post).toContain('data-lace-part="caption"');
    expect(post).toContain("Content belongs in the CMS");
    expect(post).toContain("https://public.example/lace/api/v1/public/media/post-media");
    expect(`${home}${post}`).not.toContain(token);
    expect(`${home}${post}`).not.toContain("DRAFT ONLY");
    expect(`${home}${post}`).not.toContain("javascript:");
    fixture.entries[0].entry.published.blocks[0].type = "unknownBlock";
    await expect(build()).rejects.toThrow(/unsupported block type unknownBlock/);
    fixture.entries[0].entry.published.blocks[0].type = "hero";
    fixture.entries[1].entry.published.blocks[0].data.content.content[0].content[0].marks = [
      { type: "link", attrs: { href: "javascript:alert(1)" } },
    ];
    await expect(build()).rejects.toThrow(/allowed URL/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}, 60_000);
