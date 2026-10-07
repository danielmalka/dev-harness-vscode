import assert from "node:assert";
import { test } from "node:test";
import * as ext from "../../src/extension";

test("activate and deactivate run without error", () => {
  assert.doesNotThrow(() => ext.activate());
  assert.doesNotThrow(() => ext.deactivate());
});
