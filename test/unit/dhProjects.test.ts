import assert from "node:assert";
import type * as cp from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { listProjects } from "../../src/dhProjects";

const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dh-list-")));

type Cb = (err: Error | null, stdout: string, stderr: string) => void;
function fake(err: Error | null, stdout: string, calls: unknown[][] = []) {
  return ((bin: string, args: string[], opts: unknown, cb: Cb) => {
    calls.push([bin, args, opts]);
    cb(err, stdout, "");
  }) as unknown as typeof cp.execFile;
}

test("listProjects: runs `projects --json` without a shell, timeout and bounded output; parses stdout", async () => {
  const calls: unknown[][] = [];
  const r = await listProjects("/x/dh", fake(null, JSON.stringify([{ name: "p", path: dir }]), calls));
  assert.deepStrictEqual(r, [{ name: "p", path: dir }]);
  const [bin, args, opts] = calls[0] as [string, string[], { shell: boolean; timeout: number; maxBuffer: number }];
  assert.strictEqual(bin, "/x/dh");
  assert.deepStrictEqual(args, ["projects", "--json"]);
  assert.strictEqual(opts.shell, false);
  assert.ok(opts.timeout > 0 && opts.timeout <= 5000 && opts.maxBuffer > 0);
});

test("listProjects: non-zero exit, timeout, missing binary and malformed output all yield []", async () => {
  assert.deepStrictEqual(await listProjects("/x/dh", fake(new Error("exit 1"), JSON.stringify([{ path: dir }]))), []);
  assert.deepStrictEqual(await listProjects("/x/dh", fake(null, "garbage")), []);
  assert.deepStrictEqual(await listProjects(undefined, fake(null, "[]")), []);
  const throwing = (() => {
    throw new Error("ENOENT");
  }) as unknown as typeof cp.execFile;
  assert.deepStrictEqual(await listProjects("/x/dh", throwing), []);
});

test("listProjects: a real missing binary resolves []", async () => {
  assert.deepStrictEqual(await listProjects(path.join(dir, "no-such-dh")), []);
});
