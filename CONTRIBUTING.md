# Contributing

1. Create a focused branch from `main` and preserve unrelated work.
2. Add tests for changed behavior; reuse Capsule implementations where available.
3. Enter `devbox shell`, then run `task check` and relevant e2e scenarios.
4. For plugin changes, run `task headlamp:install headlamp:check`.
5. Use Conventional Commits and regenerate API/chart documentation as needed.

Install native prek hooks with `devbox run -- task hooks:install`.
See [DEVELOPMENT.md](DEVELOPMENT.md) and [AGENT.md](AGENT.md).
