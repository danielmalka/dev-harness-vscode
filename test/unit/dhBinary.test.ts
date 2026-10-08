import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { compareVersions, findDh } from "../../src/dhBinary";

function home(layout: Record<string, string[]>): string {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), "dh-home-"));
  for (const [version, bins] of Object.entries(layout)) {
    for (const b of bins) {
      const f = path.join(h, ".claude/plugins/cache/dev-harness/dh", version, "bin", b);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, "");
    }
  }
  return h;
}

test("compareVersions is numeric, not lexical", () => {
  assert.ok(compareVersions("0.10.0", "0.9.9") > 0);
  assert.ok(compareVersions("1.0.0", "1.0.0") === 0);
});

test("findDh picks the newest semantic version and ignores non-version folders", () => {
  const h = home({
    "0.9.0": ["linux_amd64/dh"],
    "0.10.0": ["linux_amd64/dh"],
    "0.11.0-rc1": ["linux_amd64/dh"],
    latest: ["linux_amd64/dh"],
  });
  assert.strictEqual(findDh(h, "linux", "x64"), path.join(h, ".claude/plugins/cache/dev-harness/dh/0.10.0/bin/linux_amd64/dh"));
});

test("findDh falls back when the newest version lacks this platform", () => {
  const h = home({ "0.18.0": ["linux_arm64/dh"], "0.19.0": ["darwin_arm64/dh"] });
  assert.strictEqual(findDh(h, "linux", "arm64"), path.join(h, ".claude/plugins/cache/dev-harness/dh/0.18.0/bin/linux_arm64/dh"));
});

test("findDh uses dh.exe on Windows", () => {
  const h = home({ "0.18.1": ["windows_amd64/dh.exe", "windows_amd64/dh"] });
  assert.strictEqual(findDh(h, "win32", "x64"), path.join(h, ".claude/plugins/cache/dev-harness/dh/0.18.1/bin/windows_amd64/dh.exe"));
});

test("findDh returns undefined when the plugin is missing or the platform is unknown", () => {
  assert.strictEqual(findDh(home({}), "linux", "x64"), undefined);
  assert.strictEqual(findDh(home({ "0.18.1": ["linux_amd64/dh"] }), "freebsd", "x64"), undefined);
});
