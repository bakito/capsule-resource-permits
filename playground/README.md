# Resource Permits playground

With Docker available, create the persistent Kind cluster and connect to Headlamp:

```sh
GOWORK=off devbox run -- task playground
devbox run -- task playground:headlamp
```

The cluster includes cert-manager for serving certificates and contains Resource Permits in `resource-permits-system`, Flux, and
Headlamp with the current plugin. The addon uses its own ServiceAccount.
Capsule is not installed or required. No sibling Capsule checkout is needed:
`GOWORK=off` uses the published library version pinned in `go.mod`.
For optional tenant and protection compatibility tests, install Capsule with
`task dev:capsule`. The addon does not watch Capsule resources.

Setup returns when installation is ready. There is no expiry timer or automatic
cluster deletion, including on setup failure or Ctrl+C. Stopping the Headlamp task
only closes the local port forward; start it again to reconnect at
`http://127.0.0.1:18081`.

The private kubeconfig is stored in the ignored
`artifacts/playground/resource-permits-playground/kubeconfig`. Override
`PLAYGROUND_CLUSTER` for a different cluster, and `PLAYGROUND_PORT` when forwarding
Headlamp. Use the same cluster name for both tasks. Existing clusters are preserved;
use `dev:deploy` with that kubeconfig and explicit context to update the controller:

```sh
export KUBECONFIG="$PWD/artifacts/playground/resource-permits-playground/kubeconfig"
GOWORK=off devbox run -- task dev:deploy \
  DEV_CONTEXT=kind-resource-permits-playground DEV_KIND_CLUSTER=resource-permits-playground
```

Set `DEV_NAMESPACE` on deployment commands if the existing release uses a different
namespace, such as `capsule-system` in an older playground. Setup does not migrate
existing releases or uninstall an earlier Capsule installation.

- `kind.config.yaml`: loopback API server configuration.
- `installation/capsule/`: optional Capsule integration values; not used by playground setup.
- `installation/resource-permits/`: addon development Helm values.
- `installation/headlamp/`: Flux HelmRepository and HelmRelease.
- `manifests/platform/`: platform templates and supporting RBAC.
- `manifests/user/`: example tenant requests.

The plugin is stored in a ConfigMap in the cluster and mounted by the HelmRelease,
so Headlamp does not depend on temporary host files. A ConfigMap can hold up to
1 MiB; the current plugin fits within that limit.

Examples are opt-in and may require existing tenants, Flux resources, Gateway
API CRDs, or extra execution permissions. Review each before applying it.
Headlamp uses normal authentication and is exposed only on localhost.

Delete the cluster explicitly when you no longer need it:

```sh
devbox run -- kind delete cluster --name resource-permits-playground
```
