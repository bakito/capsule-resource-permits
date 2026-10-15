---
title: Installation
weight: 20
description: Install the Resource Permits controller with Helm, independently or alongside Capsule.
---

Helm is the supported installation method. Resource Permits runs without Capsule
or its CRDs and creates a dedicated controller ServiceAccount by default. The chart
uses cert-manager for TLS unless you supply an existing certificate. Its default
admission selectors cover tenant namespaces; standalone installations must supply
the non-tenant namespace override documented in the chart. The playground includes
cert-manager and that override automatically.

From a checkout, build and deploy current source to an explicitly selected Kind cluster:

```sh
devbox run -- task dev:deploy DEV_CONTEXT=kind-permits-dev DEV_KIND_CLUSTER=permits-dev
```

This command targets an existing cluster; it does not select or delete a cluster
implicitly. For a local development cluster, use [the playground]({{< relref "/docs/development/playground" >}}).

The chart's [installation instructions and values](https://github.com/projectcapsule/resource-permits/tree/main/charts/resource-permits)
cover controller identity, admission, and TLS configuration.
