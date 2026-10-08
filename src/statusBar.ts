import * as vscode from "vscode";
import { DEFAULT_PORT, validPort } from "./config";
import { localUrl } from "./dashboardUrl";
import { DOWN_TEXT, formatStatus, type StatusView } from "./statusFormat";

export const SHOW_COMMAND = "dh.showDashboard";
export const REFRESH_MS = 5000;
export const REQUEST_TIMEOUT_MS = 2000;

/** GET /api/state: the parsed body, or undefined on any failure (timeout, non-200, redirect, bad JSON). */
export async function fetchState(port: number, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> {
  try {
    const res = await fetch(`${localUrl(port)}/api/state`, { signal: AbortSignal.timeout(timeoutMs), redirect: "manual" });
    if (res.status !== 200) {
      await res.body?.cancel();
      return undefined;
    }
    return await res.json();
  } catch {
    return undefined;
  }
}

function currentPort(): number {
  // Not readConfig(): it warns on an invalid port, which would repeat every tick.
  return validPort(vscode.workspace.getConfiguration("dh.dashboard").get<unknown>("port", DEFAULT_PORT)) ?? DEFAULT_PORT;
}

export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private disposed = false;

  constructor(private readonly fetchFn: (port: number) => Promise<unknown> = fetchState) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    this.item.command = SHOW_COMMAND;
    this.set({ text: DOWN_TEXT, tooltip: "Dashboard do Dev Harness parado. Clique para abrir a view." });
    this.item.show();
  }

  start(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
  }

  async refresh(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    try {
      const v = formatStatus(await this.fetchFn(currentPort()));
      if (this.disposed) return;
      this.set(v ?? { text: DOWN_TEXT, tooltip: "Dashboard do Dev Harness parado. Clique para abrir a view." });
    } catch {
      if (!this.disposed) this.set({ text: DOWN_TEXT, tooltip: "Dashboard do Dev Harness parado." });
    } finally {
      this.busy = false;
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    this.item.dispose();
  }

  private set(v: StatusView): void {
    this.item.text = v.text;
    this.item.tooltip = v.tooltip;
  }
}
