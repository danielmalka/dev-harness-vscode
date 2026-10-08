import assert from "node:assert";
import { beforeEach, test } from "node:test";
import type * as vscode from "vscode";
import { DashboardViewProvider, defaultDeps } from "../../src/dashboardView";
import { mockState } from "../mock/vscode";

beforeEach(() => {
  mockState.config = {};
});

function fakeView() {
  const view = { webview: { html: "", options: {} }, onDidDispose: () => undefined };
  return view as unknown as vscode.WebviewView & { webview: { html: string } };
}

const tick = () => new Promise((r) => setImmediate(r));

test("two concurrent start() calls spawn dh once", async () => {
  let spawns = 0;
  let up = false;
  const p = new DashboardViewProvider({
    ...defaultDeps,
    probe: async () => (up ? { ok: true } : (await tick(), { ok: false, reason: "parado" })),
    findDh: () => "/x/dh",
    startDashboard: async () => (spawns++, (up = true), { ok: true }),
    waitForDashboard: async () => ({ ok: true }),
    iframeUrl: async (port: number) => `http://fwd/${port}`,
  });
  await p.resolveWebviewView(fakeView());
  await Promise.all([p.start(), p.start()]);
  assert.strictEqual(spawns, 1);
  assert.strictEqual(p.lastIframeUrl, "http://fwd/4747");
});

test("start: failure shows the reason with the start link and resets the guard", async () => {
  let spawns = 0;
  const view = fakeView();
  const p = new DashboardViewProvider({
    ...defaultDeps,
    probe: async () => ({ ok: false, reason: "parado" }),
    findDh: () => "/x/dh",
    startDashboard: async () => (spawns++, { ok: false, reason: "/x/dh dashboard não terminou em 10 s e foi encerrado" }),
    waitForDashboard: async () => ({ ok: true }),
  });
  await p.resolveWebviewView(view);
  await p.start();
  assert.ok(view.webview.html.includes("não terminou em 10 s"));
  assert.ok(view.webview.html.includes("command:dh.startDashboard"));
  await p.start();
  assert.strictEqual(spawns, 2);
});

test("start: missing plugin says to install dh@dev-harness", async () => {
  const view = fakeView();
  const p = new DashboardViewProvider({ ...defaultDeps, probe: async () => ({ ok: false, reason: "parado" }), findDh: () => undefined });
  await p.resolveWebviewView(view);
  await p.start();
  assert.ok(view.webview.html.includes("dh@dev-harness"));
});

test("a slow, older refresh does not overwrite a newer render", async () => {
  const view = fakeView();
  let release!: () => void;
  let calls = 0;
  const p = new DashboardViewProvider({
    ...defaultDeps,
    probe: async () => {
      calls++;
      if (calls === 2) await new Promise<void>((r) => (release = r)); // the first refresh after resolve is slow
      return calls === 2 ? { ok: false, reason: "velho" } : { ok: true };
    },
    iframeUrl: async () => "http://fwd/new",
  });
  await p.resolveWebviewView(view); // call 1: ok
  const slow = p.refresh(); // call 2: hangs, then would say offline
  await tick();
  await p.refresh(); // call 3: ok, newer
  release();
  await slow;
  assert.ok(view.webview.html.includes(`<iframe src="http://fwd/new"`));
  assert.ok(!view.webview.html.includes("velho"));
});
