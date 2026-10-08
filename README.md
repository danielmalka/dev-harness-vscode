# Dev Harness for VS Code

Viewer and launcher for the Dev Harness plugin. It does not run the harness, orchestrate agents or ship a dashboard of its own.

## Requirements

- VS Code 1.93.0 or newer (`engines.vscode: ^1.93.0`). 1.93 is the first release whose stable API has `window.onDidChangeTerminalShellIntegration`; `env.asExternalUri` is older. Source: the VS Code API reference and the 1.93 `vscode.d.ts` (`@types/vscode@1.93.0`).
- The extension runs on the workspace side (`extensionKind: ["workspace"]`), so in Remote WSL it runs inside the WSL, where `dh`, `claude` and the plugin live.

## Install from a `.vsix`

1. Download `dev-harness-<version>.vsix` from the GitHub release.
2. In VS Code: Extensions view, `...` menu, "Install from VSIX...". Or `code --install-extension dev-harness-<version>.vsix`.

## Settings

| Setting | Type | Default | Use |
|---|---|---|---|
| `dh.dashboard.port` | integer, 1024 to 65535 | `4747` | Port of the local `dh dashboard`. An invalid value falls back to 4747 with a warning. |
| `dh.dashboard.roots` | list of folders | `[]` | Passed to `dh dashboard` as `DH_DASHBOARD_ROOTS` (joined with `;`) when "Iniciar dashboard" starts it. A folder containing `;` is ignored with a warning. Empty: the inherited `DH_DASHBOARD_ROOTS` is kept. |
| `dh.dashboard.sprites` | folder | `""` | Passed as `DH_DASHBOARD_SPRITES` (optional). Empty: the inherited value is kept. |

The Dev Harness icon in the activity bar opens the Dashboard view. If the dashboard answers `GET http://127.0.0.1:<port>/api/state` within 2 s, the view embeds its page in an `iframe` (URL from `vscode.env.asExternalUri`). Otherwise the view says why and offers "Iniciar dashboard", which runs the newest installed plugin binary (`~/.claude/plugins/cache/dev-harness/dh/<version>/bin/<os>_<arch>/dh`) as `dh dashboard --detach --port <port>` and gives the whole start (initial probe, dh exiting and the dashboard answering) one 10 s deadline; a `dh` that does not exit in time is killed. Roots and sprites only take effect when the extension starts the dashboard; a dashboard already running keeps its own.

## Fields read from `/api/state`

To be filled in T-1403. The view only checks that `/api/state` answers HTTP 200; it reads no field.

## Limits

- Viewer and launcher only; no runtime dependency, no binary, no snapshot logic.
- The panel is live-only in v0.1.
- The view embeds the dashboard page; it does not reimplement it. The webview runs no scripts of its own: its CSP is `default-src 'none'; frame-src <dashboard origin>; style-src 'unsafe-inline'`, and the only command link allowed is `dh.startDashboard`.
- If the Dev Harness plugin (`dh@dev-harness`) is not installed, the extension cannot start the dashboard; it never downloads or bundles `dh`.
- Remote WSL/SSH embedding relies on `asExternalUri` and is not yet verified in a real VS Code (PRD-013 H1/H2).

## Development

```
npm ci
npm run lint && npm run typecheck && npm test
xvfb-run -a npm run test:integration   # downloads a VS Code build into .vscode-test/
npm run package                        # dev-harness-0.1.0.vsix
```
