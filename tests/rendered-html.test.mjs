import assert from "node:assert/strict";
import test from "node:test";

test("serves the Korean login experience", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /오늘 뭐 할 사람/);
  assert.match(html, /로그인하고 시작하기/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});
