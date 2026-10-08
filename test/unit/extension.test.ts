import assert from "node:assert";
import { test } from "node:test";
import { WEBVIEW_OPTIONS } from "../../src/dashboardView";
import * as ext from "../../src/extension";

test("activate is exported and deactivate runs without error", () => {
  assert.strictEqual(typeof ext.activate, "function");
  assert.doesNotThrow(() => ext.deactivate());
});

test("webview options: scripts on for the nested iframe, command URIs limited to dh.startDashboard", () => {
  assert.deepStrictEqual(WEBVIEW_OPTIONS, { enableScripts: true, enableCommandUris: ["dh.startDashboard"] });
});
