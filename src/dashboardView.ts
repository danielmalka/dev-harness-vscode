import * as vscode from "vscode";
import { readConfig } from "./config";
import { iframeUrl, probe } from "./dashboardUrl";
import { findDh } from "./dhBinary";
import { startDashboard, waitForDashboard } from "./startDashboard";
import { dashboardHtml, messageHtml } from "./viewHtml";

export const VIEW_ID = "dh.dashboard";
export const OFFLINE_TITLE = "Dashboard do Dev Harness parado";
/** One deadline for the whole start: dh exiting plus the dashboard answering (R6). */
export const START_DEADLINE_MS = 10_000;

/** Options every time the view is resolved: no scripts, only the start command may run from a link. */
export const WEBVIEW_OPTIONS: vscode.WebviewOptions = { enableScripts: false, enableCommandUris: ["dh.startDashboard"] };

/** Side effects of the view, injectable for tests. */
export const defaultDeps = { probe, iframeUrl, findDh, startDashboard, waitForDashboard };

export class DashboardViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private starting = false;
  /** Bumped by every render attempt; a slower, older attempt does not overwrite a newer one. */
  private generation = 0;
  /** Last iframe src rendered; read by integration tests. */
  lastIframeUrl?: string;

  constructor(
    private readonly deps: typeof defaultDeps = defaultDeps,
    private readonly deadlineMs = START_DEADLINE_MS,
  ) {}

  resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view;
    view.webview.options = WEBVIEW_OPTIONS;
    view.onDidDispose(() => (this.view = undefined));
    return this.refresh();
  }

  /** Probe once; show the page or the offline message. */
  async refresh(): Promise<void> {
    if (!this.view || this.starting) return;
    const gen = ++this.generation;
    const { port } = readConfig();
    const r = await this.deps.probe(port);
    if (r.ok) await this.showDashboard(port, gen);
    else this.show(messageHtml(OFFLINE_TITLE, `Motivo: ${r.reason}.`, true), gen);
  }

  /** Command dh.startDashboard. Starts nothing when the dashboard already answers or a start is in progress. */
  async start(): Promise<void> {
    if (this.starting) return;
    this.starting = true;
    const gen = ++this.generation;
    try {
      const deadline = Date.now() + this.deadlineMs; // covers the initial probe, dh exiting and the dashboard answering
      const left = () => Math.max(0, deadline - Date.now());
      const timedOut = () => this.fail(`Motivo: o dashboard não respondeu no prazo de início (${this.deadlineMs / 1000} s).`, gen);
      const cfg = readConfig();
      if ((await this.deps.probe(cfg.port, Math.min(2000, left()))).ok) return await this.showDashboard(cfg.port, gen);
      const bin = this.deps.findDh();
      if (!bin) {
        return this.fail(
          "Não encontrei o dh do plugin em ~/.claude/plugins/cache/dev-harness/dh/. Instale o plugin `dh@dev-harness` no Claude Code e tente de novo.",
          gen,
        );
      }
      if (left() === 0) return timedOut();
      this.show(messageHtml("Iniciando o dashboard…", `Executando ${bin} dashboard --detach --port ${cfg.port}.`, false), gen);
      const started = await this.deps.startDashboard(bin, cfg, undefined, left());
      if (!started.ok) return this.fail(`${started.reason}.`, gen);
      if (left() === 0) return timedOut();
      const ready = await this.deps.waitForDashboard(cfg.port, 500, left());
      if (!ready.ok) return this.fail(`Motivo: ${ready.reason}.`, gen);
      await this.showDashboard(cfg.port, gen);
    } finally {
      this.starting = false;
    }
  }

  private async showDashboard(port: number, gen: number): Promise<void> {
    const url = await this.deps.iframeUrl(port);
    if (gen !== this.generation) return;
    this.lastIframeUrl = url;
    this.show(dashboardHtml(url), gen);
  }

  private fail(reason: string, gen: number): void {
    if (this.view) this.show(messageHtml(OFFLINE_TITLE, reason, true), gen);
    else void vscode.window.showErrorMessage(reason);
  }

  private show(html: string, gen: number): void {
    if (this.view && gen === this.generation) this.view.webview.html = html;
  }
}
