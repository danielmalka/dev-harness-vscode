# dev-harness-vscode

VS Code extension for the Dev Harness plugin.

## Rules

- Role: viewer and launcher only. Never a runtime, never orchestrates.
- Requires dh kit >= 0.21.0 (global harness `~/.harness/config.yaml`). The extension has no roots/sprites settings and never sets `DH_DASHBOARD_*`; the session picker lists workspace folders plus `dh projects --json`, validated locally (absolute, existing dir, realpath). No support for dashboards from kit <= 0.20 (owner decision, 2026-10-08).
- Issue #5 / T-1408 (running dashboard ignores the extension config) is solved in the kit: the server re-reads `config.yaml` on every state build. The extension does no mismatch detection or restart. If a restart is ever needed, it may only invoke `dh dashboard --stop` then `--detach` after explicit user confirmation, never kill a process itself.
- No runtime dependencies: only `vscode` and the Node standard library. Tooling goes in `devDependencies`.
- No binaries, server or snapshot logic in the package; the `.vsix` must contain no `.exe`/ELF.
- `extensionKind` stays `["workspace"]`.
- Origin PRD: `docs/prd/PRD-013-extensao-vscode.md` in the dev-harness repository.
- Release: the `.vsix` of the current version is committed at `dist/dev-harness-<version>.vsix` (only that one; `npm run package` replaces it) and is part of every version bump; CI checks its name against `package.json`. Annotated tag `v*`; CI attaches that committed file to the GitHub release (owner decision, 2026-10-08). The `.vsix` is a zip with timestamps, so there is no byte-reproducibility check.
- Checks: `npm run lint`, `npm run typecheck`, `npm test`, `xvfb-run -a npm run test:integration`, `npm run package`.
- Verification status: the owner's probe T-1406 ran in a real VS Code (Remote WSL and local Windows, v0.1.1); "Iniciar dashboard" was not exercised. Claims of manual verification must match what the owner observed.
