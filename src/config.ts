import * as vscode from "vscode";

export const DEFAULT_PORT = 4747;

export interface DashboardConfig {
  port: number;
  roots: string[];
  sprites: string;
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
      `dh.dashboard.port inválido (${JSON.stringify(raw)}): use um inteiro entre 1024 e 65535. Usando ${DEFAULT_PORT}.`,
    );
  }
  const rawRoots = cfg.get<unknown>("roots", []);
  const sprites = cfg.get<unknown>("sprites", "");
  const roots = Array.isArray(rawRoots) ? rawRoots.filter((r): r is string => typeof r === "string" && r !== "") : [];
  // ';' is the DH_DASHBOARD_ROOTS separator, so a root containing it cannot be passed.
  const withSep = roots.filter((r) => r.includes(";"));
  if (withSep.length > 0) {
    void vscode.window.showWarningMessage(`dh.dashboard.roots: ignorando pastas com ';' (separador de DH_DASHBOARD_ROOTS): ${withSep.join(", ")}`);
  }
  return {
    port,
    roots: roots.filter((r) => !r.includes(";")),
    sprites: typeof sprites === "string" ? sprites : "",
  };
}
