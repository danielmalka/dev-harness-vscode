import * as cp from "node:child_process";
import type { DashboardConfig } from "./config";
import { probe, type ProbeResult } from "./dashboardUrl";

export type StartResult = { ok: true } | { ok: false; reason: string };

/** argv and env for `dh dashboard --detach`; the inherited env passes through untouched (projects come from ~/.harness/config.yaml). */
export function spawnSpec(cfg: DashboardConfig, baseEnv: NodeJS.ProcessEnv = process.env) {
  const env: NodeJS.ProcessEnv = { ...baseEnv };
  return { args: ["dashboard", "--detach", "--port", String(cfg.port)], env };
}

const MAX_STDERR = 500;

/**
 * Runs `<bin> dashboard --detach --port <port>` without a shell; resolves when dh exits (it detaches the server).
 * A dh that does not exit within timeoutMs is killed and reported.
 */
export function startDashboard(
  bin: string,
  cfg: DashboardConfig,
  spawn: typeof cp.spawn = cp.spawn,
  timeoutMs = 10_000,
): Promise<StartResult> {
  const { args, env } = spawnSpec(cfg);
  return new Promise((resolve) => {
    let stderr = "";
    let child: cp.ChildProcess;
    try {
      child = spawn(bin, args, { env, shell: false, stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    } catch (err) {
      resolve({ ok: false, reason: `não foi possível executar ${bin}: ${(err as Error).message}` });
      return;
    }
    const timer = setTimeout(() => {
      child.kill();
      done({ ok: false, reason: `${bin} dashboard não terminou em ${timeoutMs / 1000} s e foi encerrado` });
    }, timeoutMs);
    function done(r: StartResult) {
      clearTimeout(timer);
      resolve(r); // later calls are no-ops
    }
    child.stderr?.on("data", (d: Buffer) => {
      if (stderr.length < MAX_STDERR) stderr += d.toString();
    });
    child.on("error", (err) => done({ ok: false, reason: `não foi possível executar ${bin}: ${err.message}` }));
    child.on("close", (code) => {
      if (code === 0) return done({ ok: true });
      const msg = stderr.trim().slice(0, MAX_STDERR) || "sem mensagem de erro";
      done({ ok: false, reason: `dh dashboard saiu com código ${code}: ${msg}` });
    });
  });
}

/** Probes every intervalMs until the dashboard answers or timeoutMs passes; no probe outlives the deadline. */
export async function waitForDashboard(
  port: number,
  intervalMs = 500,
  timeoutMs = 10_000,
  check: (port: number, timeoutMs: number) => Promise<ProbeResult> = probe,
): Promise<ProbeResult> {
  const deadline = Date.now() + timeoutMs;
  let last = "nenhuma sondagem feita";
  for (;;) {
    const left = deadline - Date.now();
    if (left <= 0) break;
    const r = await check(port, Math.min(2000, intervalMs, left));
    if (r.ok) return r;
    last = r.reason;
    if (Date.now() + intervalMs > deadline) break;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  return { ok: false, reason: `o dashboard não respondeu no prazo de início (${last})` };
}
