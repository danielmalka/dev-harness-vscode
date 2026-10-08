# Changelog

## 0.1.0 - Unreleased

- Dashboard view in the activity bar: embeds the local `dh dashboard` page (single-origin CSP, sandboxed iframe), offline message with "Iniciar dashboard", 10 s start wait.
- Status bar item (`dh · trabalhando · 5h 42% · sem 18%`) from `GET /api/state` every ~5 s; `dh · dashboard parado` when down; click reveals the view.
- Launcher `dh: abrir sessão`: validated folder, fixed list of 19 `/dh:*` commands, `claude` then the command without Enter.
- Not verified in a real VS Code (T-1406 pending) / não verificado em VS Code real (T-1406 pendente).
- Repository skeleton: build, lint, typecheck, unit and integration tests, `.vsix` packaging, CI.
