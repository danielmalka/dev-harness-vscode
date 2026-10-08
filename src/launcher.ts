import * as path from "node:path";
import * as vscode from "vscode";
import { DH_COMMANDS } from "./commands";
import { readConfig } from "./config";
import { candidateFolders, validateCwd } from "./pathGuard";

export const OPEN_SESSION_COMMAND = "dh.openSession";
/** How long to wait for shell integration before typing anyway (PRD-013 R12). */
export const SHELL_INTEGRATION_TIMEOUT_MS = 1000;
/** Fixed wait between starting `claude` and typing the command (PRD-013 H4; T-1406 measures it). */
export const CLAUDE_START_DELAY_MS = 3000;
const OPEN_SETTINGS = "Abrir configurações";

export type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function workspacePaths(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).filter((f) => f.uri.scheme === "file").map((f) => f.uri.fsPath);
}

function candidates(): string[] {
  return candidateFolders(workspacePaths(), readConfig().roots);
}

function waitShellIntegration(term: vscode.Terminal, sleep: Sleep): Promise<void> {
  if (term.shellIntegration) return Promise.resolve();
  return new Promise((resolve) => {
    const sub = vscode.window.onDidChangeTerminalShellIntegration((e) => {
      if (e.terminal === term) done();
    });
    const done = () => {
      sub.dispose();
      resolve();
    };
    void sleep(SHELL_INTEGRATION_TIMEOUT_MS).then(done);
  });
}

/**
 * "dh: abrir sessão": pick a folder, pick a fixed `/dh:` command, open a terminal there, start `claude`
 * and type the command without Enter. Sends exactly two texts and never reads terminal output.
 * Resolves true when a terminal was opened.
 */
export async function openSession(sleep: Sleep = realSleep): Promise<boolean> {
  const offered = candidates();
  if (offered.length === 0) {
    const choice = await vscode.window.showWarningMessage(
      "dh: nenhuma pasta para abrir. Abra uma pasta no workspace ou configure dh.dashboard.roots.",
      OPEN_SETTINGS,
    );
    if (choice === OPEN_SETTINGS) await vscode.commands.executeCommand("workbench.action.openSettings", "dh.dashboard.roots");
    return false;
  }
  const folder = await vscode.window.showQuickPick(
    offered.map((p) => ({ label: path.basename(p) || p, description: p, path: p })),
    { placeHolder: "Pasta do projeto" },
  );
  if (!folder) return false;
  const cmd = await vscode.window.showQuickPick(
    DH_COMMANDS.map((name) => ({ label: `/dh:${name}`, name })),
    { placeHolder: "Comando do dev-harness" },
  );
  if (!cmd) return false;

  // Re-validate at the moment of use (R13): the folder may have changed since it was listed.
  const cwd = validateCwd(folder.path, candidates());
  if (!cwd) {
    void vscode.window.showErrorMessage(`dh: pasta recusada (não existe ou não é uma das oferecidas): ${folder.path}`);
    return false;
  }
  if (!DH_COMMANDS.includes(cmd.name)) {
    void vscode.window.showErrorMessage(`dh: comando recusado (fora da lista fixa): ${cmd.name}`);
    return false;
  }

  const term = vscode.window.createTerminal({ cwd, name: `dh · ${path.basename(cwd)}` });
  term.show();
  // The owner may close the terminal during a wait: send nothing to a terminal that already exited.
  const closed = () => term.exitStatus !== undefined;
  await waitShellIntegration(term, sleep);
  if (closed()) return false;
  term.sendText("claude", true);
  await sleep(CLAUDE_START_DELAY_MS);
  if (closed()) return false;
  term.sendText(`/dh:${cmd.name}`, false); // no Enter: the owner decides to run it (PRD-013 R12)
  return true;
}
