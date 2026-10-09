import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, test } from "node:test";
import { DH_COMMANDS } from "../../src/commands";
import { CLAUDE_START_DELAY_MS, openSession, SHELL_INTEGRATION_TIMEOUT_MS } from "../../src/launcher";
import { mockState } from "../mock/vscode";

const noProjects = async () => [];
const ws = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dh-launch-")));
type Item = { path?: string; name?: string; label: string };
const pickPath = (p: string) => (items: unknown[]) => (items as Item[]).find((i) => i.path === p);
const pickCmd = (n: string) => (items: unknown[]) => (items as Item[]).find((i) => i.name === n);

/** Fake clock: records each wait in the terminal log; the shell-integration timeout never elapses when integration fires. */
function fakeSleep(ms: number): Promise<void> {
  mockState.terminalLog.push(["wait", ms]);
  return ms === SHELL_INTEGRATION_TIMEOUT_MS && mockState.shellIntegrationFires ? new Promise(() => {}) : Promise.resolve();
}

beforeEach(() => {
  Object.assign(mockState, {
    config: {},
    warnings: [],
    errors: [],
    picks: [],
    pickItems: [],
    warningAnswer: undefined,
    executed: [],
    terminalLog: [],
    shellIntegrationFires: false,
    workspaceFolders: [{ uri: { scheme: "file", fsPath: ws } }],
  });
});

const created = () => mockState.terminalLog.filter((e) => (e as unknown[])[0] === "createTerminal");

test("full choice without shell integration: terminal at cwd, ~1 s wait, claude+Enter, 3 s, command without Enter", async () => {
  mockState.picks = [pickPath(ws), pickCmd("plan-loop")];
  assert.strictEqual(await openSession(fakeSleep, noProjects), true);
  assert.deepStrictEqual(mockState.terminalLog, [
    ["createTerminal", { cwd: ws, name: `dh · ${path.basename(ws)}` }],
    ["show"],
    ["wait", SHELL_INTEGRATION_TIMEOUT_MS],
    ["sendText", "claude", true],
    ["wait", CLAUDE_START_DELAY_MS],
    ["sendText", "/dh:plan-loop", false],
  ]);
  assert.strictEqual(CLAUDE_START_DELAY_MS, 3000);
  assert.strictEqual(SHELL_INTEGRATION_TIMEOUT_MS, 1000);
  assert.deepStrictEqual((mockState.pickItems[1] as Item[]).map((i) => i.label), DH_COMMANDS.map((n) => `/dh:${n}`));
});

test("full choice with shell integration: claude is sent on the event, not after the timeout", async () => {
  mockState.shellIntegrationFires = true;
  mockState.picks = [pickPath(ws), pickCmd("build")];
  assert.strictEqual(await openSession(fakeSleep, noProjects), true);
  const sends = mockState.terminalLog.filter((e) => (e as unknown[])[0] === "sendText");
  assert.deepStrictEqual(sends, [["sendText", "claude", true], ["sendText", "/dh:build", false]]);
  assert.deepStrictEqual(mockState.terminalLog.slice(-2), [["wait", CLAUDE_START_DELAY_MS], ["sendText", "/dh:build", false]]);
});

test("cancel at the folder or at the command: no terminal", async () => {
  mockState.picks = [undefined];
  assert.strictEqual(await openSession(fakeSleep, noProjects), false);
  mockState.picks = [pickPath(ws), undefined];
  assert.strictEqual(await openSession(fakeSleep, noProjects), false);
  assert.deepStrictEqual(created(), []);
});

test("no workspace and no projects: warning without settings shortcut, no picker, no terminal", async () => {
  mockState.workspaceFolders = undefined;
  assert.strictEqual(await openSession(fakeSleep, noProjects), false);
  assert.strictEqual(mockState.warnings.length, 1);
  assert.match(mockState.warnings[0], /dh link/);
  assert.deepStrictEqual(mockState.executed, []);
  assert.deepStrictEqual(mockState.pickItems, []);
  assert.deepStrictEqual(created(), []);
});

test("dh projects are offered with their name and can be opened; re-validated against a fresh list", async () => {
  const proj = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dh-proj-")));
  mockState.picks = [pickPath(proj), pickCmd("build")];
  assert.strictEqual(await openSession(fakeSleep, async () => [{ name: "meu-projeto", path: proj }]), true);
  const labels = (mockState.pickItems[0] as Item[]).map((i) => i.label);
  assert.deepStrictEqual(labels, [path.basename(ws), "meu-projeto"]);
  assert.strictEqual((created()[0] as [string, { cwd: string }])[1].cwd, proj);
  // project dropped from dh between listing and use: refused
  mockState.picks = [pickPath(proj), pickCmd("build")];
  mockState.errors = [];
  let calls = 0;
  const list = async () => (calls++ === 0 ? [{ name: "p", path: proj }] : []);
  assert.strictEqual(await openSession(fakeSleep, list), false);
  assert.ok(mockState.errors[0]?.includes("pasta recusada"));
});

test("rejected at use: folder outside the candidates, ../x, nonexistent, or a command off the list", async () => {
  const cases: [((items: unknown[]) => unknown)[], string][] = [
    [[() => ({ label: "x", path: os.tmpdir() }), pickCmd("build")], "pasta recusada"],
    [[() => ({ label: "x", path: "../x" }), pickCmd("build")], "pasta recusada"],
    [[() => ({ label: "x", path: path.join(ws, "gone") }), pickCmd("build")], "pasta recusada"],
    [[pickPath(ws), () => ({ label: "/dh:rm -rf", name: "rm -rf" })], "comando recusado"],
  ];
  for (const [picks, msg] of cases) {
    mockState.errors = [];
    mockState.picks = [...picks];
    assert.strictEqual(await openSession(fakeSleep, noProjects), false);
    assert.ok(mockState.errors[0]?.includes(msg), mockState.errors.join());
  }
  assert.deepStrictEqual(created(), []);
});

test("terminal closed during a wait: nothing more is sent and the result is false", async () => {
  for (const closeAt of [SHELL_INTEGRATION_TIMEOUT_MS, CLAUDE_START_DELAY_MS]) {
    mockState.terminalLog = [];
    mockState.picks = [pickPath(ws), pickCmd("plan")];
    const sleep = (ms: number) => {
      if (ms === closeAt && mockState.lastTerminal) mockState.lastTerminal.exitStatus = { code: 0 };
      return fakeSleep(ms);
    };
    assert.strictEqual(await openSession(sleep, noProjects), false);
    const sends = mockState.terminalLog.filter((e) => (e as unknown[])[0] === "sendText");
    assert.deepStrictEqual(sends, closeAt === SHELL_INTEGRATION_TIMEOUT_MS ? [] : [["sendText", "claude", true]]);
  }
});

test("Windows: a folder that ships its own claude.cmd is refused, no terminal", async () => {
  const real = process.platform;
  const planted = path.join(ws, "claude.cmd");
  fs.writeFileSync(planted, "@echo off");
  Object.defineProperty(process, "platform", { value: "win32" });
  try {
    mockState.picks = [pickPath(ws), pickCmd("build")];
    assert.strictEqual(await openSession(fakeSleep, noProjects), false);
    assert.ok(mockState.errors[0]?.includes("executável claude"), mockState.errors.join());
    assert.deepStrictEqual(created(), []);
  } finally {
    Object.defineProperty(process, "platform", { value: real });
    fs.rmSync(planted);
  }
});
