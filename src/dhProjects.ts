import * as cp from "node:child_process";
import { parseProjects, type Project } from "./pathGuard";

/** Runs `<dh> projects --json` (no shell, 5 s, bounded output); any failure yields [] so the picker falls back to workspace folders. */
export function listProjects(bin: string | undefined, execFile: typeof cp.execFile = cp.execFile): Promise<Project[]> {
  if (!bin) return Promise.resolve([]);
  return new Promise((resolve) => {
    try {
      execFile(bin, ["projects", "--json"], { shell: false, windowsHide: true, timeout: 5000, maxBuffer: 1 << 20, encoding: "utf8" }, (err, stdout) =>
        resolve(err ? [] : parseProjects(String(stdout))),
      );
    } catch {
      resolve([]);
    }
  });
}
