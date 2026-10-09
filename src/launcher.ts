import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { DH_COMMANDS } from "./commands";
import { findDh } from "./dhBinary";
import { listProjects } from "./dhProjects";
import { candidateFolders, validateCwd, type Project } from "./pathGuard";

export const OPEN_SESSION_COMMAND = "dh.openSession";
/** How long to wait for shell integration before typing anyway (PRD-013 R12). */
export const SHELL_INTEGRATION_TIMEOUT_MS = 1000;
/** Fixed wait between starting `claude` and typing the command (PRD-013 H4; T-1406 measures it). */
export const CLAUDE_START_DELAY_MS = 3000;

export type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function workspacePaths(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).filter((f) => f.uri.scheme === "file").map((f) => f.uri.fsPath);
}

export type ProjectLister = () => Promise<Project[]>;

async function candidates(list: ProjectLister): Promise<Project[]> {
  return candidateFolders(workspacePaths(), await list());
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
export async function openSession(sleep: Sleep = realSleep, list: ProjectLister = () => listProjects(findDh())): Promise<boolean> {
  const offered = await candidates(list);
  if (offered.length === 0) {
    void vscode.window.showWarningMessage("dh: nenhuma pasta para abrir. Abra uma pasta no workspace ou registre um projeto com o dh (ex.: dh link).");
    return false;
  }
  const folder = await vscode.window.showQuickPick(
    offered.map((p) => ({ label: p.name, description: p.path, path: p.path })),
    { placeHolder: "Pasta do projeto" },
  );
  if (!folder) return false;
  const cmd = await vscode.window.showQuickPick(
    DH_COMMANDS.map((name) => ({ label: `/dh:${name}`, name })),
    { placeHolder: "Comando do dev-harness" },
  );
  if (!cmd) return false;

  // Re-validate at the moment of use (R13): the folder may have changed since it was listed.
  const cwd = validateCwd(folder.path, await candidates(list));
  if (!cwd) {
    void vscode.window.showErrorMessage(`dh: pasta recusada (não existe ou não é uma das oferecidas): ${folder.path}`);
    return false;
  }
  // cmd.exe runs a claude.* from the current folder before PATH: refuse a folder that ships one (Windows).
  if (process.platform === "win32" && ["claude.cmd", "claude.bat", "claude.exe", "claude.com"].some((f) => fs.existsSync(path.join(cwd, f)))) {
    void vscode.window.showErrorMessage(`dh: pasta recusada (contém um executável claude próprio): ${cwd}`);
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
