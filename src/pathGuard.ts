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

/**
 * Folders the launcher may open (PRD-013 R11/R13), as real paths: each workspace folder, plus each direct
 * subfolder of a root that has a `.harness/` directory and whose real path stays inside the root's real path
 * (a symlinked subfolder pointing elsewhere is dropped).
 */
export function candidateFolders(workspaceFolders: readonly string[], roots: readonly string[]): string[] {
  const out = new Set<string>();
  for (const w of workspaceFolders) {
    const real = realDir(w);
    if (real) out.add(real);
  }
  for (const r of roots) {
    const root = path.isAbsolute(r) ? realDir(r) : undefined;
    if (!root) continue;
    let entries: string[];
    try {
      entries = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const name of entries.sort()) {
      const sub = realDir(path.join(root, name));
      if (sub && path.dirname(sub) === root && realDir(path.join(sub, ".harness"))) out.add(sub);
    }
  }
  return [...out];
}

/**
 * Re-validates a picked folder at the moment of use: absolute, no `..` segment, still an existing directory,
 * and its real path is one of `candidates` (recomputed by the caller). Returns the real path or undefined.
 */
export function validateCwd(picked: string, candidates: readonly string[]): string | undefined {
  if (!path.isAbsolute(picked) || picked.split(/[\\/]/).includes("..")) return undefined;
  const real = realDir(picked);
  return real !== undefined && candidates.includes(real) ? real : undefined;
}
