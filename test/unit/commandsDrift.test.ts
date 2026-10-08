import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { DH_COMMANDS } from "../../src/commands";

// DH_REPO set (CI): the repo must exist, never skip. Unset: ../dev-harness next to this repo, skipped if absent.
const explicit = process.env.DH_REPO;
const repo = explicit ?? path.resolve(__dirname, "../../../../dev-harness");

test("DH_COMMANDS matches .commands/*.md of the dev-harness repo", (t) => {
  const dir = path.join(repo, ".commands");
  if (!explicit && !fs.existsSync(dir)) {
    t.skip(`SKIPPED: dev-harness not found at ${repo}; set DH_REPO to run the drift check`);
    return;
  }
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
  assert.deepStrictEqual([...DH_COMMANDS].sort(), names);
});
