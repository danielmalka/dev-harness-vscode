import * as vscode from "vscode";
import { DashboardViewProvider, VIEW_ID } from "./dashboardView";
import { OPEN_SESSION_COMMAND, openSession } from "./launcher";
import { SHOW_COMMAND, StatusBar } from "./statusBar";

export function activate(context: vscode.ExtensionContext): DashboardViewProvider {
  const provider = new DashboardViewProvider();
  const status = new StatusBar();
  status.start();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
    status,
    vscode.commands.registerCommand(SHOW_COMMAND, () => vscode.commands.executeCommand(`${VIEW_ID}.focus`)),
    vscode.commands.registerCommand("dh.startDashboard", () => provider.start()),
    vscode.commands.registerCommand(OPEN_SESSION_COMMAND, () => openSession()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("dh.dashboard")) void provider.refresh();
    }),
  );
  return provider;
}

export function deactivate(): void {}
