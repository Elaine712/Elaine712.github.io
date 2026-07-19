import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the complete Chinese birthday experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>张晓丹老师生日快乐<\/title>/);
  assert.match(html, /一份特别的生日祝福/);
  assert.match(html, /张晓丹老师，生日快乐！/);
  assert.match(html, /吹灭蜡烛/);
  assert.match(html, /再放一场烟花/);
  assert.match(html, /王舒仪、张光旭 敬上/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Lorem ipsum/i);
});

test("keeps editable content centralized and removes the starter", async () => {
  const [page, config, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../config.js", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /import config from "\.\.\/config"/);
  assert.match(config, /recipient:\s*"张晓丹老师"/);
  assert.match(config, /birthdayMonth:\s*7/);
  assert.match(config, /birthdayDay:\s*23/);
  assert.match(config, /musicSrc:\s*"\.\/assets\/music\/birthday\.wav"/);
  assert.match(config, /showPhotos:\s*false/);
  assert.match(page, /audio\.preload = "auto"/);
  assert.match(page, /primeFallbackAudio\(\)/);
  assert.match(page, /devicePixelRatio/);
  assert.match(page, /visibilitychange/);
  assert.match(page, /particleCap/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  await access(new URL("../public/assets/music/birthday.wav", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
