import assert from "node:assert";
import * as vscode from "vscode";

export async function run(): Promise<void> {
  const ext = vscode.extensions.getExtension("danielmalka.dev-harness");
  assert.ok(ext, "extension not found");
  await ext.activate();
  assert.strictEqual(ext.isActive, true);
}
