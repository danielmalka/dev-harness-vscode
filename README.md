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

The Dashboard view only checks that `/api/state` answers HTTP 200. The status bar item (refreshed every ~5 s, 2 s timeout, redirects not followed) reads:

- `avatar.state`: `esperando`, `erro`, `trabalhando`, `concluido`, `atencao`, `parado` (shown in pt-br; an unknown id is shown as is).
- `limits.five_hour` and `limits.seven_day`: percentages rounded to integers; `sem dado` when missing or when `limits.ok` is not `true`.
- `limits.five_hour_age_sec` and `limits.seven_day_age_sec`: shown only in the tooltip.

Text: `dh · trabalhando · 5h 42% · sem 18%`. If the dashboard does not answer, answers non-200, or the JSON lacks `avatar.state`, the item shows `dh · dashboard parado` with no error or notification. The extension never reads `~/.claude/dev-harness/sessions`; `/api/state` is the only source. Clicking the item runs `dh.showDashboard`, which reveals and focuses the Dashboard view.

## Launcher: "dh: abrir sessão"

The palette command `dh.openSession` ("dh: abrir sessão") asks two questions:

1. The folder: each open workspace folder, plus each direct subfolder with a `.harness/` directory under each `dh.dashboard.roots` entry. A subfolder that is a symlink pointing outside its root is not offered.
2. The command: a fixed list of the 19 plugin commands (`/dh:auto`, `build`, `consolidate-memory`, `discover`, `doctor`, `document`, `fix`, `handoff`, `improve`, `plan-loop`, `plan`, `refactor`, `release`, `resume`, `review`, `secure`, `setup`, `understand`, `verify`). There is no free text. A test compares the list with `.commands/` of the dev-harness repo (`DH_REPO`, default `../dev-harness`; CI clones it).

Cancelling either question opens nothing. With no folder to offer (no workspace and no roots, or roots without `.harness/` projects) a warning offers "Abrir configurações". Before opening, the folder is checked again: it must still be an existing directory, with no `..`, whose real path is one of the offered folders; otherwise it is refused with a message.

Then it opens a terminal in that folder, waits for shell integration (up to 1 s), types `claude` with Enter, waits a fixed 3 s (`CLAUDE_START_DELAY_MS` in `src/launcher.ts`) and types `/dh:<name>` **without Enter**: you press Enter. Nothing else is typed and the terminal output is never read. It assumes `claude` is on the `PATH` and the plugin is installed for your user.

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
