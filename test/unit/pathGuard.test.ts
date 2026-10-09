import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { candidateFolders, parseProjects, validateCwd } from "../../src/pathGuard";

function tree() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dh-guard-")));
  for (const d of ["a", "b", "ws"]) fs.mkdirSync(path.join(base, d));
  fs.writeFileSync(path.join(base, "file"), "");
  fs.symlinkSync(path.join(base, "b"), path.join(base, "link"));
  return { base, a: path.join(base, "a"), b: path.join(base, "b"), ws: path.join(base, "ws") };
}

test("parseProjects: valid items kept (real path), invalid ones ignored", () => {
  const t = tree();
  const json = JSON.stringify([
    { name: "A", path: t.a, mode: "x", harness: true },
    { name: "L", path: path.join(t.base, "link") },
    { path: t.ws },
    { name: "rel", path: "relative/dir" },
    { name: "gone", path: path.join(t.base, "gone") },
    { name: "file", path: path.join(t.base, "file") },
    { name: "num", path: 3 },
    null,
    "str",
  ]);
  assert.deepStrictEqual(parseProjects(json), [
    { name: "A", path: t.a },
    { name: "L", path: t.b },
    { name: "ws", path: t.ws },
  ]);
});

test("parseProjects: malformed JSON, non-array and empty yield []", () => {
  for (const s of ["", "not json", "{}", "null", "[]"]) assert.deepStrictEqual(parseProjects(s), []);
});

test("candidateFolders: workspace first, projects after, deduped by real path", () => {
  const t = tree();
  const got = candidateFolders([t.ws, path.join(t.base, "missing")], [{ name: "ws2", path: t.ws }, { name: "A", path: t.a }]);
  assert.deepStrictEqual(got, [{ name: "ws", path: t.ws }, { name: "A", path: t.a }]);
});

test("validateCwd: accepts a candidate, rejects .., nonexistent, relative, symlink to a non-candidate and non-candidates", () => {
  const t = tree();
  const cands = candidateFolders([t.ws], [{ name: "A", path: t.a }]);
  assert.strictEqual(validateCwd(t.a, cands), t.a);
  assert.strictEqual(validateCwd(`${t.a}/../ws`, cands), undefined);
  assert.strictEqual(validateCwd("../x", cands), undefined);
  assert.strictEqual(validateCwd(path.join(t.base, "gone"), cands), undefined);
  assert.strictEqual(validateCwd(path.join(t.base, "link"), cands), undefined);
  assert.strictEqual(validateCwd(t.b, cands), undefined);
  assert.strictEqual(validateCwd(path.join(t.base, "file"), cands), undefined);
  fs.rmSync(t.a, { recursive: true });
  assert.strictEqual(validateCwd(t.a, cands), undefined, "deleted after listing");
});
