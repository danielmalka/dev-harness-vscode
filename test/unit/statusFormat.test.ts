import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { formatStatus } from "../../src/statusFormat";

// Real /api/state captured from `dh dashboard` 0.18.1 (see T-1403 section 7).
const real = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../test/fixtures/api-state.json"), "utf8"));
const withState = (state: string) => ({ ...real, avatar: { ...real.avatar, state } });
const withLimits = (limits: unknown) => ({ ...real, limits });

test("real fixture", () => {
  assert.strictEqual(formatStatus(real)?.text, "dh · trabalhando · 5h 13% · sem 14%");
});

test("the six avatar ids map to pt-br labels", () => {
  const want: Record<string, string> = {
    esperando: "esperando você",
    erro: "erro",
    trabalhando: "trabalhando",
    concluido: "concluído",
    atencao: "atenção",
    parado: "parado",
  };
  for (const [id, label] of Object.entries(want)) {
    assert.strictEqual(formatStatus(withState(id))?.text, `dh · ${label} · 5h 13% · sem 14%`);
  }
});

test("unknown id is shown raw", () => {
  assert.strictEqual(formatStatus(withState("dormindo"))?.text, "dh · dormindo · 5h 13% · sem 14%");
});

test("percentages round to integers", () => {
  const l = { ok: true, five_hour: 42.5, seven_day: 17.6, five_hour_age_sec: 3, seven_day_age_sec: 90 };
  assert.strictEqual(formatStatus(withLimits(l))?.text, "dh · trabalhando · 5h 43% · sem 18%");
});

test("missing limit shows sem dado; age only in the tooltip", () => {
  const l = { ok: true, five_hour: null, seven_day: 18, five_hour_age_sec: 0, seven_day_age_sec: 7200 };
  const v = formatStatus(withLimits(l));
  assert.strictEqual(v?.text, "dh · trabalhando · 5h sem dado · sem 18%");
  assert.ok(!/\bh\b.*há|há/.test(v!.text));
  assert.match(v!.tooltip, /Limite semana: 18% \(há 2 h\)/);
  assert.strictEqual(formatStatus(withLimits({ ok: false }))?.text, "dh · trabalhando · 5h sem dado · sem sem dado");
  assert.strictEqual(formatStatus({ avatar: real.avatar })?.text, "dh · trabalhando · 5h sem dado · sem sem dado");
});

test("malformed responses give undefined, never throw", () => {
  for (const bad of [null, undefined, 1, "x", [], {}, { avatar: null }, { avatar: {} }, { avatar: { state: 3 } }, { avatar: { state: "" } }]) {
    assert.strictEqual(formatStatus(bad), undefined);
  }
});
