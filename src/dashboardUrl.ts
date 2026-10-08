import * as vscode from "vscode";

/** The only place the dashboard URL is built. Probe, status and start always use this local form. */
export function localUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

/** URL for the webview iframe: the local URL mapped by VS Code (identity locally, forwarded in remotes). */
export async function iframeUrl(port: number): Promise<string> {
  const uri = await vscode.env.asExternalUri(vscode.Uri.parse(localUrl(port)));
  return uri.toString(true);
}

export type ProbeResult = { ok: true } | { ok: false; reason: string };

/** GET /api/state with a timeout; ok only on HTTP 200. */
export async function probe(port: number, timeoutMs = 2000): Promise<ProbeResult> {
  try {
    const res = await fetch(`${localUrl(port)}/api/state`, { signal: AbortSignal.timeout(timeoutMs) });
    await res.body?.cancel();
    return res.status === 200 ? { ok: true } : { ok: false, reason: `o dashboard respondeu HTTP ${res.status} em ${localUrl(port)}/api/state` };
  } catch (err) {
    const name = (err as { name?: string }).name;
    return {
      ok: false,
      reason:
        name === "TimeoutError" || name === "AbortError"
          ? `sem resposta de ${localUrl(port)} em ${timeoutMs / 1000} s`
          : `nada respondendo em ${localUrl(port)}`,
    };
  }
}
