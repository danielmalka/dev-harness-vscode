// The view's HTML lives only here, so a proxy (PRD-013 R7) could replace just this file.

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const BASE_STYLE = `body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:12px}
a.button{display:inline-block;padding:4px 12px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);text-decoration:none;border-radius:2px}
a.button:hover{background:var(--vscode-button-hoverBackground)}
a.button:focus{outline:1px solid var(--vscode-focusBorder);outline-offset:2px}`;

/** CSP of the embedded page: one frame origin, inline styles, nothing else (no scripts). */
export function dashboardCsp(url: string): string {
  return `default-src 'none'; frame-src ${new URL(url).origin}; style-src 'unsafe-inline'`;
}

export const MESSAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'";

/** Page embedding the running dashboard. `url` is the asExternalUri result. */
export function dashboardHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${esc(dashboardCsp(url))}">
<style>html,body{margin:0;padding:0;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100vh;display:block}</style>
</head><body><iframe src="${esc(url)}" title="Dev Harness dashboard"></iframe></body></html>`;
}

/** Message page: reason plus, when `startButton`, the "Iniciar dashboard" command link. `reason` is plain text. */
export function messageHtml(title: string, reason: string, startButton: boolean): string {
  const button = startButton ? `<p><a class="button" href="command:dh.startDashboard">Iniciar dashboard</a></p>` : "";
  return `<!DOCTYPE html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${MESSAGE_CSP}">
<style>${BASE_STYLE}</style>
</head><body><h3>${esc(title)}</h3><p>${esc(reason)}</p>${button}</body></html>`;
}
