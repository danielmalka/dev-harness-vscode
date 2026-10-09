import * as fs from "node:fs";
import * as path from "node:path";

function realDir(p: string): string | undefined {
  try {
    const real = fs.realpathSync(p);
    return fs.statSync(real).isDirectory() ? real : undefined;
  } catch {
    return undefined;
  }
}

export interface Project {
  name: string;
  path: string;
}

/**
 * Parses `dh projects --json` stdout (array of {name, path, mode, harness}). Keeps only items whose `path` is a
 * string, absolute and an existing directory, as its real path. Anything malformed yields [].
 */
export function parseProjects(stdout: string): Project[] {
  let data: unknown;
  try {
    data = JSON.parse(stdout);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: Project[] = [];
  for (const it of data as unknown[]) {
    const o = (it ?? {}) as { name?: unknown; path?: unknown };
    if (typeof o.path !== "string" || !path.isAbsolute(o.path)) continue;
    const real = realDir(o.path);
    if (real) out.push({ name: typeof o.name === "string" && o.name !== "" ? o.name : path.basename(real), path: real });
  }
  return out;
}

/** Folders the launcher may open, as real paths: each workspace folder, then each valid dh project; deduped. */
export function candidateFolders(workspaceFolders: readonly string[], projects: readonly Project[]): Project[] {
  const out = new Map<string, Project>();
  for (const w of workspaceFolders) {
    const real = realDir(w);
    if (real && !out.has(real)) out.set(real, { name: path.basename(real) || real, path: real });
  }
  for (const p of projects) if (!out.has(p.path)) out.set(p.path, p);
  return [...out.values()];
}

/**
 * Re-validates a picked folder at the moment of use: absolute, no `..` segment, still an existing directory,
 * and its real path is one of `candidates` (recomputed by the caller). Returns the real path or undefined.
 */
export function validateCwd(picked: string, candidates: readonly Project[]): string | undefined {
  if (!path.isAbsolute(picked) || picked.split(/[\\/]/).includes("..")) return undefined;
  const real = realDir(picked);
  return real !== undefined && candidates.some((c) => c.path === real) ? real : undefined;
}
