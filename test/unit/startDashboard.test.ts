import assert from "node:assert";
import type * as cp from "node:child_process";
import { EventEmitter } from "node:events";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { spawnSpec, startDashboard, waitForDashboard } from "../../src/startDashboard";

const cfg = { port: 4800, roots: ["/p/a", "/p/b"], sprites: "/s" };

type FakeChild = EventEmitter & { stderr: EventEmitter; killed: boolean; kill: () => boolean };
function fakeSpawn(behave: (child: FakeChild) => void) {
  const calls: { cmd: string; args: readonly string[]; opts: cp.SpawnOptions; child: FakeChild }[] = [];
  const spawn = ((cmd: string, args: readonly string[], opts: cp.SpawnOptions) => {
    const child: FakeChild = Object.assign(new EventEmitter(), {
      stderr: new EventEmitter(),
      killed: false,
      kill: () => (child.killed = true),
    });
    calls.push({ cmd, args, opts, child });
    setImmediate(() => behave(child));
    return child;
  }) as unknown as typeof cp.spawn;
  return { spawn, calls };
}

test("spawnSpec: argv array and the two env vars from non-empty settings", () => {
  const { args, env } = spawnSpec(cfg, { PATH: "/bin", DH_DASHBOARD_ROOTS: "/old" });
  assert.deepStrictEqual(args, ["dashboard", "--detach", "--port", "4800"]);
  assert.deepStrictEqual(env, { PATH: "/bin", DH_DASHBOARD_ROOTS: "/p/a;/p/b", DH_DASHBOARD_SPRITES: "/s" });
});

test("spawnSpec: empty settings keep the inherited env values", () => {
  const { env } = spawnSpec({ port: 4800, roots: [], sprites: "" }, { DH_DASHBOARD_ROOTS: "/inh", DH_DASHBOARD_SPRITES: "/spr" });
  assert.deepStrictEqual(env, { DH_DASHBOARD_ROOTS: "/inh", DH_DASHBOARD_SPRITES: "/spr" });
  assert.deepStrictEqual(spawnSpec({ port: 4800, roots: [], sprites: "" }, {}).env, {});
});

test("startDashboard: a dh that never exits is killed at the deadline", async () => {
  const { spawn, calls } = fakeSpawn(() => {});
  const t0 = Date.now();
  const r = await startDashboard("/x/dh", cfg, spawn, 300);
  assert.ok(Date.now() - t0 >= 280);
  assert.ok(!r.ok && r.reason.includes("não terminou"), JSON.stringify(r));
  assert.strictEqual(calls[0].child.killed, true);
});

test("startDashboard: spawns without a shell and resolves ok on exit 0", async () => {
  const { spawn, calls } = fakeSpawn((c) => c.emit("close", 0));
  assert.deepStrictEqual(await startDashboard("/x/dh", cfg, spawn), { ok: true });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].cmd, "/x/dh");
  assert.deepStrictEqual(calls[0].args, ["dashboard", "--detach", "--port", "4800"]);
  assert.strictEqual(calls[0].opts.shell, false);
  assert.strictEqual(calls[0].opts.env?.DH_DASHBOARD_ROOTS, "/p/a;/p/b");
});

test("startDashboard: non-zero exit reports truncated stderr", async () => {
  const { spawn } = fakeSpawn((c) => (c.stderr.emit("data", Buffer.from("port in use " + "x".repeat(2000))), c.emit("close", 1)));
  const r = await startDashboard("/x/dh", cfg, spawn);
  assert.ok(!r.ok && r.reason.includes("código 1") && r.reason.includes("port in use"));
  assert.ok(!r.ok && r.reason.length < 600);
});

test("startDashboard: spawn error (e.g. ENOENT) is a reason, not an exception", async () => {
  const { spawn } = fakeSpawn((c) => c.emit("error", new Error("spawn ENOENT")));
  const r = await startDashboard("/x/dh", cfg, spawn);
  assert.ok(!r.ok && r.reason.includes("ENOENT"));
});

async function freePort(): Promise<number> {
  const s = http.createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const p = (s.address() as AddressInfo).port;
  await new Promise((r) => s.close(r));
  return p;
}

test("waitForDashboard: loads once a server comes up after 1 s", async () => {
  const p = await freePort();
  const s = http.createServer((_q, res) => res.end("{}"));
  const timer = setTimeout(() => s.listen(p, "127.0.0.1"), 1000);
  const t0 = Date.now();
  const r = await waitForDashboard(p);
  const dt = Date.now() - t0;
  assert.deepStrictEqual(r, { ok: true });
  assert.ok(dt >= 900 && dt < 2500, `elapsed ${dt}`);
  clearTimeout(timer);
  s.close();
});

test("waitForDashboard: gives up after 10 s when nothing comes up", async () => {
  const p = await freePort();
  const t0 = Date.now();
  const r = await waitForDashboard(p);
  const dt = Date.now() - t0;
  assert.ok(!r.ok && r.reason.includes("prazo de início"), JSON.stringify(r));
  assert.ok(dt >= 9000 && dt < 11500, `elapsed ${dt}`);
});
