import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { candidateFolders, validateCwd } from "../../src/pathGuard";

function tree() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dh-guard-")));
  const root = path.join(base, "root");
  const outside = path.join(base, "outside");
  for (const d of ["root/a/.harness", "root/b", "root/c/.harness", "outside/.harness", "ws"]) fs.mkdirSync(path.join(base, d), { recursive: true });
  fs.symlinkSync(outside, path.join(root, "escape"));
  fs.writeFileSync(path.join(root, "file"), "");
  return { base, root, outside, ws: path.join(base, "ws") };
}

test("candidateFolders: workspace folders plus root subfolders with .harness, no symlink escape", () => {
  const t = tree();
  const got = candidateFolders([t.ws, path.join(t.base, "missing")], [t.root, "relative/root", path.join(t.base, "nope")]);
  assert.deepStrictEqual(got, [t.ws, path.join(t.root, "a"), path.join(t.root, "c")]);
});

test("validateCwd: accepts a candidate, rejects .., nonexistent, relative, symlink escape and non-candidates", () => {
  const t = tree();
  const cands = candidateFolders([t.ws], [t.root]);
  assert.strictEqual(validateCwd(path.join(t.root, "a"), cands), path.join(t.root, "a"));
  assert.strictEqual(validateCwd(`${t.root}/a/../c`, cands), undefined);
  assert.strictEqual(validateCwd("../x", cands), undefined);
  assert.strictEqual(validateCwd(path.join(t.root, "gone"), cands), undefined);
  assert.strictEqual(validateCwd(path.join(t.root, "escape"), cands), undefined);
  assert.strictEqual(validateCwd(path.join(t.root, "b"), cands), undefined);
  assert.strictEqual(validateCwd(path.join(t.root, "file"), cands), undefined);
  fs.rmSync(path.join(t.root, "a"), { recursive: true });
  assert.strictEqual(validateCwd(path.join(t.root, "a"), cands), undefined, "deleted after listing");
});
