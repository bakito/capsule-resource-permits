---
title: Contributing
weight: 10
description: Use the shared Devbox, Task, prek, and CI development workflow.
---

Install [Devbox](https://www.jetify.com/devbox), then use the pinned environment:

```sh
devbox run -- task hooks:install
devbox run -- task check
devbox run -- task headlamp:install headlamp:check
devbox run -- task docs:serve
```

`task build` builds the controller and `kubectl-resource_permits` CLI. `task test`
runs unit tests with race detection and coverage, without connecting to a cluster.
`task image:build` creates an image archive with ko without pushing to a registry.

`task e2e` creates an isolated Kind cluster and tests the current addon without
Capsule installed. Use `E2E_MODE=capsule` explicitly for tenant and ownership-safety
integration tests, with `E2E_FILTER` to select affected scenarios. That mode installs
Capsule and runs parallel and serial configuration tests. CI covers standalone
operation across supported Kubernetes versions and the complete Capsule integration
suite on the newest tested version.

Go honors local `go.work` overrides; CI uses the revision in `go.mod`. Check
with `GOWORK=off` before relying on a dependency that only exists locally.

CRDs and DeepCopy code are generated through `task generate manifests`.
`task docs:generate` uses crdoc to generate the API reference from Helm CRDs.
`task docs:check` checks generated content and local links at both root and subpath URLs.
`task docs:test:browser` checks desktop and mobile navigation and search.

Prefer imports from Capsule core whenever an appropriate implementation exists.
Keep product tests beside their code and use upstream validators for tooling.
The repository's `AGENT.md`, `CONTRIBUTING.md`, and `DEVELOPMENT.md` describe the
development contract in more detail.
