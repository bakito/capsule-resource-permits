---
title: Gateway API access
weight: 30
description: Grant tenant owners ongoing access to namespaced Gateway API resources after review.
aliases:
  - /docs/guides/examples/gateway-api-access/
---

A tenant requests access to Gateway API resources. After approval, a Capsule
`GlobalTenantResource` distributes RoleBindings to that tenant's namespaces. The
subjects follow its owners, including owners and namespaces added later.

See [Capsule's GlobalTenantResources documentation](https://projectcapsule.dev/docs/replications/global/)
for how the distributor selects tenant namespaces and reconciles generated resources.
The permit controls the initial provisioning and its own cleanup policy.

## Prerequisites

Install Capsule, Resource Permits, and the Gateway API CRDs and controller. Use an
existing `solar-system` namespace owned by tenant `solar`, with the tenant label
and default ServiceAccount. The requester needs permission to create ResourcePermits;
the reviewer needs status-update permission and must match the template's approvers.
Replace the example reviewer names with your actual identities.

Install the shared executor permissions shown in the
[Grafana example]({{< relref "/docs/examples/managed-grafana#prerequisites" >}}):

```sh
kubectl apply -f playground/manifests/platform/globalresourcepermittemplates/rbac.yaml
```

The `playground-gateway-api-editor` ClusterRole grants access to namespaced Gateway
API resources through RoleBindings. It does not grant access to GatewayClasses or
CRD definitions. The template's resolved execution identity also needs permission
to read namespaces and ServiceAccounts and to manage GlobalTenantResources; see
[execution identities]({{< relref "/docs/concepts/templates#choose-the-execution-identity-and-limits" >}}).

## Define the template

The template derives the tenant from the requesting namespace. It has no parameters
and requires manual approval.

{{< example "platform/globalresourcepermittemplates/gateway-api-access.yaml" >}}

Apply it as a platform operator and wait for readiness:

```sh
kubectl apply -f playground/manifests/platform/globalresourcepermittemplates/gateway-api-access.yaml
kubectl wait --for=condition=Ready globalresourcepermittemplate/gateway-api --timeout=60s
```

## Request access

{{< example "user/solar/resourcepermits/gateway-api-access.yaml" >}}

Submit the permit as a tenant requester, then have a configured approver review it
with `kubectl resource-permits review gateway-api-access -n solar-system`.

## Expected outcome and revocation

Once active, the permit creates the distributor. Capsule then reconciles a
`gateway-api-editors` RoleBinding in each selected tenant namespace. Its subjects
track the current tenant owners.

This example intentionally grants ongoing access: `deletion: Orphan` keeps the
distributor and its RoleBindings after the permit expires or is deleted. To revoke
that access, delete the generated `<tenant>-gateway-api-access` GlobalTenantResource;
its `pruningOnDelete: true` removes the distributed RoleBindings. For temporary
resources that should be removed at expiry, use `deletion: Remove` as in the
[temporary configuration example]({{< relref "/docs/examples/temporary-config" >}}).
