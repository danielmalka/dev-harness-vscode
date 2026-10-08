import assert from "node:assert";
import { beforeEach, test } from "node:test";
import { readConfig, validPort } from "../../src/config";
import { mockState } from "../mock/vscode";

beforeEach(() => {
  mockState.config = {};
  mockState.warnings = [];
});

test("validPort accepts integers 1024..65535 only", () => {
  for (const ok of [1024, 4747, 65535]) assert.strictEqual(validPort(ok), ok);
  for (const bad of [1023, 65536, 0, -1, 4747.5, "4747", null, undefined, NaN]) assert.strictEqual(validPort(bad), undefined);
});

test("readConfig: defaults, no warning", () => {
  assert.deepStrictEqual(readConfig(), { port: 4747, roots: [], sprites: "" });
  assert.deepStrictEqual(mockState.warnings, []);
});

test("readConfig: invalid port falls back to 4747 with a warning", () => {
  mockState.config["dh.dashboard.port"] = 80;
  assert.strictEqual(readConfig().port, 4747);
  assert.strictEqual(mockState.warnings.length, 1);
  assert.match(mockState.warnings[0], /dh\.dashboard\.port/);
});

test("readConfig: valid values pass through; non-string roots dropped", () => {
  mockState.config = { "dh.dashboard.port": 5000, "dh.dashboard.roots": ["/a", 3, "", "/b"], "dh.dashboard.sprites": "/s" };
  assert.deepStrictEqual(readConfig(), { port: 5000, roots: ["/a", "/b"], sprites: "/s" });
});

test("readConfig: roots containing ';' are dropped with a warning", () => {
  mockState.config = { "dh.dashboard.roots": ["/a", "/b;c"] };
  assert.deepStrictEqual(readConfig().roots, ["/a"]);
  assert.strictEqual(mockState.warnings.length, 1);
  assert.match(mockState.warnings[0], /\/b;c/);
});
