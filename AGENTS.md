# Resource Permits

## Purpose

Resource Permits is a Project Capsule addon providing approval workflows and
managed resource lifecycles through ResourcePermit, ResourcePermitTemplate, and
GlobalResourcePermitTemplate in `addons.projectcapsule.dev/v1beta2`. It includes
a controller, admission webhooks, a kubectl plugin, and a Headlamp plugin.
The controller runs independently of Capsule CRDs and configuration, while reusing
its shared runtime libraries. Do not add Capsule CRD watches or configuration
lookups. Preserve shared SSA ownership checks; unresolved replication ownership
must fail safely without changing another controller's resources or protection.

## General repository rules

These rules are language-independent and can be reused in other repositories.

- Read the contribution/development guides, task definitions, dependency locks,
  hook configuration, and CI workflows before editing. Preserve unrelated work.
- Reuse maintained upstream tools and existing repository implementations before
  adding dependencies, wrappers, or frameworks. Keep task commands direct and
  inline; avoid helper tasks that only dispatch to other tasks or shell scripts.
- Keep development installations and executable examples together in `playground/`,
  with separate `installation/` and `manifests/` directories. Put generator inputs
  beside the owning code. Do not reintroduce `hack/` or a root `examples/` tree,
  or accumulate loose Go/JS maintenance scripts. Prefer upstream CLIs over wrappers.
- Prefer predefined prek hooks, especially native builtins, over local hooks.
  Use local hooks only for project-specific composition or the shared tool
  environment; those should call existing Task targets through Devbox. Keep the
  configuration in `prek.toml`, without a second hook configuration or recursion.
  Hooks and CI must not require Python.
- Keep tool versions in Devbox configuration and locks. Tasks consume tools from
  PATH; avoid repeated version checks, bespoke installers, and fallback toolchains.
  For a tool absent from the package index, provision a pinned upstream CLI in
  Devbox's ignored environment, without adding a wrapper or separate module.
- Use tools' native validation, linting, and dry runs for configuration changes.
  Do not add loose Go or JS tests that assert Taskfile text, dependency versions,
  workflow strings, or repository layout. Tests must exercise product behavior
  and live alongside the owning code or in its existing integration/browser suite.
- CI calls the same Task targets as local development. Preserve ordered generation
  before consumers; Task dependencies run concurrently, `cmds` task calls do not.
  Quote configurable values, propagate failures, and clean up temporary files and
  child processes. Keep publishing explicit and separate from local builds.
- Run the checks appropriate to the change and report unrun or unavailable checks.
  Review security, performance, and bounded resource use. Do not create artificial
  test harnesses merely to claim coverage of documentation or tooling changes.
- Never reuse or delete unrelated clusters or credentials. Scope development
  operations to an explicitly selected context. Do not commit or publish unless
  requested; preview release commands with a dry run first.

## Go codebase rules

These rules apply to Go implementation and tests, not to repository maintenance.

- Follow `go.mod`, `.golangci.yaml`, neighboring package conventions, and the
  Apache-2.0 source header. Keep domain logic out of entry points. Format tests too.
- Pass context through API operations, preserve useful errors, and bound retries.
  Controllers must reconcile idempotently across retries and leader changes.
- Keep shared compiled objects immutable and synchronized. Define invalidation
  for spec/UID changes and deletion. Reuse indexed lookups and existing caches;
  avoid repeated compilation, cluster-wide scans, and unnecessary API reads.
- Protect object identity with UID checks and optimistic concurrency. Surface SSA
  conflicts instead of silently forcing ownership. Use finite metric labels,
  never object names, namespaces, identities, or error text.
- Place unit tests beside the implementation they exercise. Test observable
  behavior, relevant errors, and boundaries. Use real API-server tests for SSA and
  schema behavior and scoped e2e tests for runtime, admission, and RBAC changes.
- Test concurrent access with `-race`. Add allocation-reporting benchmarks for
  new or materially changed reconciliation, admission, and cache paths. Compilation
  alone does not establish an integration or e2e pass.
- Generate APIs and manifests with the existing tasks; never hand-edit generated
  DeepCopy methods, CRDs, or RBAC. Preserve Kubebuilder metadata and scaffold markers.

## Resource Permits project rules

Keep addon-specific caches and configuration under `internal/`; do not expose them
through `pkg/` unless another module needs a supported API. The addon owns cache
instances and invalidation, even when the implementation is imported from Capsule.

Always prefer direct imports from `github.com/projectcapsule/capsule` whenever
a suitable implementation exists. Search core's types, helpers, caches, indexes,
rules, templating, and admission wrappers before adding or copying code. Document
concrete reasons for exceptions. Keep the Capsule module revision compatible.

- `api/v1beta2/` and `pkg/api/`: APIs and shared permit types.
- `internal/controllers/`: template and permit reconciliation and invalidation.
- `internal/webhook/`: admission, resource protection, and reference validation.
- `internal/configuration/`: validated addon startup settings; no CapsuleConfiguration reads.
- `cmd/controller/`: manager wiring; `cmd/cli/`: kubectl plugin.
- `headlamp/`: existing Headlamp UI and colocated tests.
- `charts/resource-permits/`: Helm-only installation and generated CRDs.
- `playground/installation/`: Kind/Flux/Helm setup; `playground/manifests/`: examples.
- `docs/`: Hugo/Doks site and generated crdoc API reference.

Preserve requester/reviewer/executor identities, tenant boundaries, managed-object
ownership, finalizers, and approval/lifecycle semantics. Changes to admission are
performance-sensitive and require relevant benchmarks and API-call assertions.

Unit tests run via `task test`; do not run `go test ./...`, because the existing
Ginkgo e2e package requires a real cluster. `task playground`, `task dev:deploy`, and
`task e2e` install Resource Permits without Capsule by default. Keep that standalone
path working without Capsule CRDs or a sibling checkout. Capsule installation is
explicit through `task dev:capsule` or `task e2e E2E_MODE=capsule`. For integration
runs, select relevant suites locally with `E2E_FILTER`; CI runs the full integration
suite in parallel and serial config phases as well as standalone tests.
Collect observations during execution, then diagnose failures after both phases.
Cover positive/negative tenant scenarios and cross-tenant isolation when affected.

Preserve the existing linter conventions. Repository migrations must not reformat
unrelated runtime files. Use ko for controller images, including archive builds
for Kind. Keep the controller and CLI in release archives with version metadata.
Native validators, Task dry runs, Helm rendering, and browser tests validate tooling.

Maintain chart installation guidance in `charts/resource-permits/README.md.gotmpl`.
Generate it with `task helm:docs`. Run `task docs:generate` after CRD changes and
`task docs:check` for documentation. Preserve the Doks mobile navigation/search
fixes and production HTTPS browser coverage. Keep migrated guides aligned with the addon API group, CLI, chart values, and
metrics; do not invent unsupported product behavior.
