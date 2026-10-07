# Dev Harness for VS Code

Viewer and launcher for the Dev Harness plugin. It does not run the harness, orchestrate agents or ship a dashboard of its own.

## Requirements

- VS Code 1.93.0 or newer (`engines.vscode: ^1.93.0`). 1.93 is the first release whose stable API has `window.onDidChangeTerminalShellIntegration`; `env.asExternalUri` is older. Source: the VS Code API reference and the 1.93 `vscode.d.ts` (`@types/vscode@1.93.0`).
- The extension runs on the workspace side (`extensionKind: ["workspace"]`), so in Remote WSL it runs inside the WSL, where `dh`, `claude` and the plugin live.

## Install from a `.vsix`

1. Download `dev-harness-<version>.vsix` from the GitHub release.
2. In VS Code: Extensions view, `...` menu, "Install from VSIX...". Or `code --install-extension dev-harness-<version>.vsix`.

## Settings

To be filled in T-1402 / T-1403: `dh.dashboard.port`, `dh.dashboard.roots`, `dh.dashboard.sprites`.

## Fields read from `/api/state`

To be filled in T-1402 / T-1403.

## Limits

- Viewer and launcher only; no runtime dependency, no binary, no snapshot logic.
- The panel is live-only in v0.1.

## Development

```
npm ci
npm run lint && npm run typecheck && npm test
xvfb-run -a npm run test:integration   # downloads a VS Code build into .vscode-test/
npm run package                        # dev-harness-0.1.0.vsix
```
