import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Compares two x.y.z strings numerically. */
export function compareVersions(a: string, b: string): number {
  const pa = SEMVER.exec(a)!.slice(1).map(Number);
  const pb = SEMVER.exec(b)!.slice(1).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

const OS: Record<string, string> = { linux: "linux", darwin: "darwin", win32: "windows" };
const ARCH: Record<string, string> = { x64: "amd64", arm64: "arm64" };

/**
 * Newest plugin dh at ~/.claude/plugins/cache/dev-harness/dh/<x.y.z>/bin/<os>_<arch>/dh[.exe], or undefined.
 * Only folders named as a plain semantic version are considered; no user input reaches the path.
 */
export function findDh(home = os.homedir(), platform: string = process.platform, arch: string = process.arch): string | undefined {
  const goos = OS[platform];
  const goarch = ARCH[arch];
  if (!goos || !goarch) return undefined;
  const base = path.join(home, ".claude", "plugins", "cache", "dev-harness", "dh");
  let versions: string[];
  try {
    versions = fs.readdirSync(base).filter((v) => SEMVER.test(v));
  } catch {
    return undefined;
  }
  versions.sort(compareVersions).reverse();
  const exe = goos === "windows" ? "dh.exe" : "dh";
  for (const v of versions) {
    const bin = path.join(base, v, "bin", `${goos}_${goarch}`, exe);
    if (fs.existsSync(bin)) return bin;
  }
  return undefined;
}
