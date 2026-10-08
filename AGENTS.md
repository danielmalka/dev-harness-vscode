# dev-harness-vscode

VS Code extension for the Dev Harness plugin.

## Rules

- Role: viewer and launcher only. Never a runtime, never orchestrates.
- No runtime dependencies: only `vscode` and the Node standard library. Tooling goes in `devDependencies`.
- No binaries, server or snapshot logic in the package; the `.vsix` must contain no `.exe`/ELF.
- `extensionKind` stays `["workspace"]`.
- Origin PRD: `docs/prd/PRD-013-extensao-vscode.md` in the dev-harness repository.
- Release: annotated tag `v*`; CI attaches the `.vsix` to the GitHub release.
- Checks: `npm run lint`, `npm run typecheck`, `npm test`, `xvfb-run -a npm run test:integration`, `npm run package`.
- Verification status: until the owner's probe (T-1406) runs, nothing has been run in a real VS Code window; README and CHANGELOG say so and no text may claim otherwise.
