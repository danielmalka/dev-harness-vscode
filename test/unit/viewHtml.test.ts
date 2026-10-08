import assert from "node:assert";
import { test } from "node:test";
import { dashboardCsp, dashboardHtml, MESSAGE_CSP, messageHtml } from "../../src/viewHtml";

test("dashboard CSP is exactly one frame origin plus inline styles", () => {
  assert.strictEqual(dashboardCsp("http://127.0.0.1:4747"), "default-src 'none'; frame-src http://127.0.0.1:4747; style-src 'unsafe-inline'");
  assert.strictEqual(
    dashboardCsp("https://abc-4747.app.github.dev/"),
    "default-src 'none'; frame-src https://abc-4747.app.github.dev; style-src 'unsafe-inline'",
  );
});

test("dashboard page: iframe src is the given URL, CSP in a meta tag, no scripts", () => {
  const html = dashboardHtml("http://127.0.0.1:4747/");
  assert.ok(html.includes(`content="default-src 'none'; frame-src http://127.0.0.1:4747; style-src 'unsafe-inline'"`.replace(/'/g, "&#39;")));
  assert.ok(html.includes(`<iframe src="http://127.0.0.1:4747/"`));
  assert.ok(!/script/i.test(html));
});

test("message page: start link is a command URI, no script, reason escaped", () => {
  assert.strictEqual(MESSAGE_CSP, "default-src 'none'; style-src 'unsafe-inline'");
  const html = messageHtml("Parado", "porta <ocupada> & \"x\"", true);
  assert.ok(html.includes(`<a class="button" href="command:dh.startDashboard">Iniciar dashboard</a>`));
  assert.ok(html.includes("porta &lt;ocupada&gt; &amp; &quot;x&quot;"));
  assert.ok(!/script/i.test(html));
  assert.ok(!messageHtml("Iniciando", "...", false).includes("command:"));
});
