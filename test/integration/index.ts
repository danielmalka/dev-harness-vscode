import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";
import * as vscode from "vscode";
import type { DashboardViewProvider } from "../../src/dashboardView";

async function until<T>(f: () => T | undefined, ms: number): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = f();
    if (v !== undefined) return v;
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 100));
  }
}

export async function run(): Promise<void> {
  const ext = vscode.extensions.getExtension<DashboardViewProvider>("danielmalka.dev-harness");
  assert.ok(ext, "extension not found");
  const provider = await ext.activate();
  assert.strictEqual(ext.isActive, true);

  // R1: container and webview view registered.
  const contrib = ext.packageJSON.contributes;
  assert.deepStrictEqual(contrib.viewsContainers.activitybar.map((c: { id: string }) => c.id), ["dh"]);
  assert.deepStrictEqual(contrib.views.dh, [{ type: "webview", id: "dh.dashboard", name: "Dashboard" }]);
  assert.ok((await vscode.commands.getCommands(true)).includes("dh.startDashboard"));

  // R10: the status item command exists; the R2/R3 step below drives the view through it.
  assert.ok((await vscode.commands.getCommands(true)).includes("dh.showDashboard"));

  // R11: the launcher command is registered and contributed to the palette.
  assert.ok((await vscode.commands.getCommands(true)).includes("dh.openSession"));
  assert.ok(contrib.commands.some((c: { command: string; title: string }) => c.command === "dh.openSession" && c.title === "dh: abrir sessão"));

  // R2/R3: fixture dashboard on a free port (never 4747); the view embeds its asExternalUri URL.
    const server = http.createServer((_req, res) => res.end("{}"));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  try {
    await vscode.workspace.getConfiguration("dh.dashboard").update("port", port, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand("dh.showDashboard");
    const expected = (await vscode.env.asExternalUri(vscode.Uri.parse(`http://127.0.0.1:${port}`))).toString(true);
    const url = await until(() => (provider.lastIframeUrl?.includes(String(port)) ? provider.lastIframeUrl : undefined), 10_000);
    assert.strictEqual(url, expected);
    // View-specific evidence: lastIframeUrl is set only when the view itself rendered the iframe (the status bar
    // also polls /api/state, so a request log would not prove the view).
    assert.strictEqual(provider.lastIframeUrl, expected);
  } finally {
    await vscode.workspace.getConfiguration("dh.dashboard").update("port", undefined, vscode.ConfigurationTarget.Global);
    server.close();
  }
}
