---
title: Playground
weight: 20
description: Run a persistent Kind cluster with Resource Permits and Headlamp.
---

With Docker running, create the cluster:

```sh
GOWORK=off devbox run -- task playground
```

`GOWORK=off` builds against the published Capsule version in `go.mod`, without a
local Capsule checkout. The controller runs without Capsule's APIs or configuration;
the playground installs the addon directly, along with cert-manager for serving
certificates. Its Helm values explicitly select non-tenant namespaces for admission.

The task builds Resource Permits with ko and the current Headlamp plugin. The addon
is installed in `resource-permits-system` with its own ServiceAccount. Kind
configuration is in `playground/kind.config.yaml`; installations live under
`playground/installation/`, including a Flux HelmRelease for Headlamp. The plugin
is stored in a Kubernetes ConfigMap, independently of temporary host files.

Setup finishes after installation. The cluster has no expiry timer and remains
running after the task exits, fails, or is interrupted. Its private kubeconfig is
saved under `artifacts/playground/resource-permits-playground/kubeconfig`.

## Open Headlamp

Start a local port forward separately:

```sh
devbox run -- task playground:headlamp
```

Headlamp is available at `http://127.0.0.1:18081` and uses normal Kubernetes
authentication. Supply a credential for the identity you want to exercise.
No shared administrator login is created. Ctrl+C stops only the port forward;
run the same command to reconnect later.

Override `PLAYGROUND_CLUSTER` when creating or accessing a different cluster, and
`PLAYGROUND_PORT` to change the local port. Existing clusters are preserved;
use `dev:deploy` with the saved kubeconfig and explicit context to update the
controller. Examples remain opt-in under `playground/manifests/`.

## Delete the playground

Deletion is always explicit:

```sh
devbox run -- kind delete cluster --name resource-permits-playground
```
