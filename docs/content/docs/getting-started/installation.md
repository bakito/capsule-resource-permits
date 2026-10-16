---
title: Installation
weight: 20
description: Install the Resource Permits controller with Helm, independently or alongside Capsule.
---

Helm is the supported installation method. Resource Permits runs with Capsule or
independently, without its controller or CRDs. You need Kubernetes 1.30 or newer and
cluster administrator permissions to install CRDs, admission webhooks, and controller
RBAC. Install [cert-manager](https://cert-manager.io/docs/installation/helm/) first,
or supply an existing serving certificate and CA through the chart values.

## Install with Helm

[![Helm Chart](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/projectcapsule)](https://artifacthub.io/packages/helm/projectcapsule/resource-permits)

The chart's default admission selectors cover Capsule tenant namespaces. For a
standalone installation, save the following as `resource-permits-values.yaml` to
enable admission in all namespaces:

```yaml
webhooks:
  hooks:
    resources:
      namespaceSelector:
        matchExpressions: []
    resourcepermits:
      namespaceSelector:
        matchExpressions: []
    resourcepermitsMutating:
      namespaceSelector:
        matchExpressions: []
    resourcepermittemplates:
      namespaceSelector:
        matchExpressions: []
    serviceaccounts:
      namespaceSelector:
        matchExpressions: []
```

To limit admission to selected namespaces, replace the expressions for all five
hooks with your own selectors. Include namespaces containing requests, execution
ServiceAccounts, and managed resources. Grant request and review RBAC only where
the corresponding hooks are enabled. Setting `namespaceSelector: {}` alone does
not remove the default expressions because Helm merges maps.

Select the intended Kubernetes context, then install the published chart:

```shell
helm repo add projectcapsule https://projectcapsule.github.io/charts
helm repo update projectcapsule

helm upgrade --install resource-permits projectcapsule/resource-permits \
  --namespace resource-permits-system --create-namespace \
  --values resource-permits-values.yaml

kubectl -n resource-permits-system rollout status \
  deployment/resource-permits
```

The release name is `resource-permits` and its namespace is
`resource-permits-system`; both are configurable. Use `--version VERSION` to select
a specific chart release. For an installation limited to Capsule tenant namespaces,
omit the values file to retain the default admission selectors.

## Configure execution permissions

The chart creates a dedicated controller ServiceAccount. Its default RBAC does not
grant arbitrary workload management. Every template must set `spec.impersonation`
to an execution ServiceAccount with narrowly scoped permissions for the resources
and context it uses. See
[execution identities and limits]({{< relref "/docs/concepts/templates#choose-the-execution-identity-and-limits" >}})
before applying your first template.

The chart's [installation instructions and values](https://github.com/projectcapsule/resource-permits/tree/main/charts/resource-permits)
cover controller identity, admission, TLS configuration, and CRD upgrades. Review
CRD changes before upgrading; the chart applies its bundled CRDs on install and
upgrade by default.

For local development from a checkout, use
[the playground]({{< relref "/docs/development/playground" >}}), which installs
cert-manager and configures standalone admission automatically.
