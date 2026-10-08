import assert from "node:assert";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { test } from "node:test";
import { fetchState, StatusBar } from "../../src/statusBar";
import { items, mockState } from "../mock/vscode";

const real = fs.readFileSync(path.join(__dirname, "../../../test/fixtures/api-state.json"), "utf8");

async function serve(handler: http.RequestListener): Promise<{ server: http.Server; port: number; close: () => void }> {
  const s = http.createServer(handler);
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  return { server: s, port: (s.address() as AddressInfo).port, close: () => (s.closeAllConnections(), s.close()) };
}

test("fetchState: parsed body from a real-shaped response", async () => {
  const s = await serve((_q, r) => r.end(real));
  try {
    assert.deepStrictEqual(await fetchState(s.port), JSON.parse(real));
  } finally {
    s.close();
  }
});

test("fetchState: absent server, invalid JSON, non-200, redirect and timeout give undefined", async () => {
  const down = await serve(() => {});
  down.server.removeAllListeners("request");
  down.server.on("connection", (c) => c.destroy()); // port stays ours: no free-port reuse race
  assert.strictEqual(await fetchState(down.port, 2000), undefined);
  down.close();
  for (const h of [
    (_q: http.IncomingMessage, r: http.ServerResponse) => r.end("not json"),
    (_q: http.IncomingMessage, r: http.ServerResponse) => ((r.statusCode = 500), r.end("{}")),
    (_q: http.IncomingMessage, r: http.ServerResponse) => ((r.statusCode = 302), r.setHeader("location", "http://example.invalid/"), r.end()),
    () => {}, // never answers
  ]) {
    const s = await serve(h);
    try {
      assert.strictEqual(await fetchState(s.port, 500), undefined);
    } finally {
      s.close();
    }
  }
});

test("StatusBar: shows state, falls back to dashboard parado, no notification, dispose stops the timer", async () => {
  mockState.warnings.length = 0;
  mockState.errors.length = 0;
  let answer: unknown = JSON.parse(real);
  const sb = new StatusBar(async () => answer);
  const item = items.at(-1)!;
  assert.strictEqual(item.command, "dh.showDashboard");
  assert.strictEqual(item.shown, true);
  await sb.refresh();
  assert.strictEqual(item.text, "dh · trabalhando · 5h 13% · sem 14%");
  answer = undefined;
  await sb.refresh();
  assert.strictEqual(item.text, "dh · dashboard parado");
  answer = { avatar: {} };
  await sb.refresh();
  assert.strictEqual(item.text, "dh · dashboard parado");
  assert.deepStrictEqual([mockState.warnings, mockState.errors], [[], []]);
  sb.start();
  sb.dispose();
  assert.strictEqual(item.disposed, true);
});

test("StatusBar: in-flight guard: a second refresh while one is pending does not call fetch again", async () => {
  let calls = 0;
  let release!: (v: unknown) => void;
  const sb = new StatusBar(() => (calls++, new Promise((r) => (release = r))));
  const a = sb.refresh();
  const b = sb.refresh();
  await b;
  assert.strictEqual(calls, 1);
  release(undefined);
  await a;
  const c = sb.refresh();
  release(undefined);
  await c;
  assert.strictEqual(calls, 2); // guard released after completion
  sb.dispose();
});

test("StatusBar: dispose clears the interval timer", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let calls = 0;
  const sb = new StatusBar(async () => (calls++, undefined));
  sb.start();
  await new Promise((r) => setImmediate(r)); // let the first refresh finish so the guard is free
  t.mock.timers.tick(5000);
  const before = calls;
  assert.ok(before >= 2, `calls ${before}`);
  sb.dispose();
  t.mock.timers.tick(20000);
  assert.strictEqual(calls, before);
});

test("StatusBar: a throwing fetch does not throw", async () => {
  const sb = new StatusBar(async () => {
    throw new Error("boom");
  });
  await assert.doesNotReject(sb.refresh());
  sb.dispose();
});

test("R9: src never reads the snapshots directory", () => {
  const dir = path.join(__dirname, "../../../src");
  for (const f of fs.readdirSync(dir)) {
    assert.ok(!fs.readFileSync(path.join(dir, f), "utf8").includes("dev-harness/sessions"), f);
  }
});
