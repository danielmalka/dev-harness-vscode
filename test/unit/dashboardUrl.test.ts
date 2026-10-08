import assert from "node:assert";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, test } from "node:test";
import { iframeUrl, localUrl, probe } from "../../src/dashboardUrl";
import { mockState } from "../mock/vscode";

const sockets = new Set<import("node:net").Socket>();
function listen(handler: http.RequestListener): Promise<http.Server> {
  const s = http.createServer(handler);
  s.on("connection", (c) => (sockets.add(c), c.on("close", () => sockets.delete(c))));
  return new Promise((r) => s.listen(0, "127.0.0.1", () => r(s)));
}
const port = (s: http.Server) => (s.address() as AddressInfo).port;
after(() => sockets.forEach((c) => c.destroy()));

test("localUrl is the 127.0.0.1 form", () => assert.strictEqual(localUrl(4747), "http://127.0.0.1:4747"));

test("iframeUrl passes the local URL through asExternalUri", async () => {
  const seen: string[] = [];
  mockState.externalize = (u) => (seen.push(u), "https://forwarded.example/");
  assert.strictEqual(await iframeUrl(4800), "https://forwarded.example/");
  assert.deepStrictEqual(seen, ["http://127.0.0.1:4800"]);
});

test("the dashboard URL is built in one place only", () => {
  const dir = path.join(__dirname, "../../../src");
  const hits = fs.readdirSync(dir).filter((f) => fs.readFileSync(path.join(dir, f), "utf8").includes("127.0.0.1"));
  assert.deepStrictEqual(hits, ["dashboardUrl.ts"]);
  assert.strictEqual(fs.readFileSync(path.join(dir, "dashboardUrl.ts"), "utf8").split("http://127.0.0.1").length - 1, 1);
});

test("probe: 200 on /api/state is ok", async () => {
  let asked = "";
  const s = await listen((req, res) => ((asked = req.url ?? ""), res.end("{}")));
  assert.deepStrictEqual(await probe(port(s)), { ok: true });
  assert.strictEqual(asked, "/api/state");
  s.close();
});

test("probe: non-200 and refused are not ok, with a reason", async () => {
  const s = await listen((_req, res) => ((res.statusCode = 500), res.end()));
  const p = port(s);
  const r = await probe(p);
  assert.ok(!r.ok && r.reason.includes("HTTP 500"));
  s.close();
  await new Promise((r) => s.on("close", r));
  const refused = await probe(p);
  assert.ok(!refused.ok && refused.reason.includes(`127.0.0.1:${p}`));
});

test("probe: gives up after 2 s on a server that never answers", async () => {
  const s = await listen(() => {});
  const t0 = Date.now();
  const r = await probe(port(s));
  const dt = Date.now() - t0;
  assert.ok(!r.ok && r.reason.includes("em 2 s"), JSON.stringify(r));
  assert.ok(dt >= 1900 && dt < 3000, `elapsed ${dt}`);
  s.close();
});
