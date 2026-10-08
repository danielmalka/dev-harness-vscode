# Changelog

## 0.1.3 - 2026-10-08

- The `.vsix` of the current version is committed at `dist/dev-harness-<version>.vsix`; `npm run package` writes it there and removes the previous one. CI checks the committed file name against `package.json`, and the release job attaches that committed file. No code change.

## 0.1.2 - 2026-10-08

- Docs: README records the manual verification in a real VS Code (Remote WSL and local Windows, probe T-1406) and the expected (not exercised) limit of "Iniciar dashboard" in a local Windows window. No code change.

## 0.1.1 - 2026-10-08

- Fix: the embedded dashboard stayed on "carregando..." with no projects or sprites. With `enableScripts: false` VS Code removes `allow-scripts` from the webview content frame, and the nested dashboard iframe inherits that sandbox, so the dashboard page could not run its own script. The webview now sets `enableScripts: true`; the view page still runs no script of its own (its CSP has no `script-src`), and command links stay limited to `dh.startDashboard`. Seen in a real VS Code on Windows and Remote WSL (T-1406).

## 0.1.0 - 2026-10-07

- Dashboard view in the activity bar: embeds the local `dh dashboard` page (single-origin CSP, sandboxed iframe), offline message with "Iniciar dashboard", 10 s start wait.
- Status bar item (`dh · trabalhando · 5h 42% · sem 18%`) from `GET /api/state` every ~5 s; `dh · dashboard parado` when down; click reveals the view.
- Launcher `dh: abrir sessão`: validated folder, fixed list of 19 `/dh:*` commands, `claude` then the command without Enter.
- Not verified in a real VS Code (T-1406 pending) / não verificado em VS Code real (T-1406 pendente).
- Repository skeleton: build, lint, typecheck, unit and integration tests, `.vsix` packaging, CI.
