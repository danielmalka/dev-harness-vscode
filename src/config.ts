import * as vscode from "vscode";

export const DEFAULT_PORT = 4747;

export interface DashboardConfig {
  port: number;
}

/** Returns the port when it is an integer in 1024..65535, otherwise undefined. */
export function validPort(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1024 && value <= 65535 ? value : undefined;
}

export function readConfig(): DashboardConfig {
  const cfg = vscode.workspace.getConfiguration("dh.dashboard");
  const raw = cfg.get<unknown>("port", DEFAULT_PORT);
  let port = validPort(raw);
  if (port === undefined) {
    port = DEFAULT_PORT;
    void vscode.window.showWarningMessage(
      // ponytail: the raw value is not echoed (a string could carry a command: link into the notification).
      `dh.dashboard.port inválido: use um inteiro entre 1024 e 65535. Usando ${DEFAULT_PORT}.`,
    );
  }
  return { port };
}
