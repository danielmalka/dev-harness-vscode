import * as vscode from "vscode";
import { DashboardViewProvider, VIEW_ID } from "./dashboardView";

export function activate(context: vscode.ExtensionContext): DashboardViewProvider {
  const provider = new DashboardViewProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
    vscode.commands.registerCommand("dh.startDashboard", () => provider.start()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("dh.dashboard")) void provider.refresh();
    }),
  );
  return provider;
}

export function deactivate(): void {}
