---
title: Managed permit resources
weight: 40
aliases:
  - /docs/guides/concepts/managed-resources/
  - /docs/resource-permits/managed-resources/
  - /docs/resource-permits/server-side-apply/
  - /docs/resource-leases/managed-resources/
  - /docs/resource-leases/server-side-apply/
description: How permit snapshots, resource policies, conditions, cleanup, and status work together.
---

A ResourcePermit manages the resources captured in its approved request. This page
covers their lifecycle within a permit. For the shared implementation of
[server-side apply and object management](https://projectcapsule.dev/docs/replications/global/#object-management),
including [field ownership conflicts](https://projectcapsule.dev/docs/replications/global/#force),
use the Capsule documentation.

## Apply and ownership model

The controller renders every target and records the concrete manifests and their
policies in `.status.request.resources`. Reviewers approve that snapshot. Activation,
explicit retries, and cleanup use the captured resources and execution ServiceAccount;
editing the source template does not change an existing request's snapshot.

A permit's field manager identifies its request UID:

```text
projectcapsule.dev/resource/resourcepermit/<request-uid>
```

For request preparation, review, activation, and failure recovery, see the complete
[permit lifecycle]({{< relref "/docs/concepts/requests#lifecycle" >}}).

## Resource policy

Set the policy on each resource group in the template. The controller captures it
with the request, alongside every resource produced by that group:

```yaml
resources:
  - policy:
      creation: Owner
      protect: true
      force: false
      deletion: Remove
    targets:
      - apiVersion: v1
        kind: ConfigMap
        metadata:
          name: '{{ .request.name }}'
```

The [generated policy reference]({{< relref "/docs/reference/api#resourcepermittemplatespecresourcesindexpolicy" >}})
lists the fields, values, and defaults. Capsule documents the shared
[creation and adoption model](https://projectcapsule.dev/docs/replications/global/#object-management)
and [force behavior](https://projectcapsule.dev/docs/replications/global/#force).

For a permit, `protect: true` blocks direct updates and deletion of managed targets,
except by the controller and recorded execution ServiceAccount. Keep the executor's
permissions available until cleanup completes.

Choose `deletion` according to what should happen when the permit expires:

| Captured policy | Permit cleanup |
| --- | --- |
| `Remove` | Remove objects created for the permit; for adopted objects, relinquish the permit's managed fields and tracking while respecting other managers. |
| `Orphan` | Retain resources and their applied fields, releasing the permit's tracking and protection when no other manager requires it. |

`Orphan` can intentionally leave access behind, as in the
[Gateway API example]({{< relref "/docs/examples/gateway-api-access#expected-outcome-and-revocation" >}}).
For temporary resources, the
[configuration example]({{< relref "/docs/examples/temporary-config" >}})
uses `Remove`. The template's `keepFor` retention period preserves the expired permit's audit record;
it does not extend the active resource lifetime.

### Targets also managed by Capsule replication

Resource Permits runs without Capsule CRDs or ownership watches. Avoid overlapping
permit and Capsule replication targets: cleanup that finds unresolved replication
managed fields stops with `replication owner resolver is not configured`. It keeps
the target, protection, and permit finalizer rather than guessing whether another
controller still owns them. An orphaned replication target can retain those managed
fields after its parent is deleted. Resolve overlapping ownership with the owning
controller and an authorized executor; removing the parent alone may not suffice.

## Apply conditions

Permit templates support `spec.resources[].policy.condition`, independently for
each target in a resource group. It must be a CEL boolean expression of at most
4096 characters. Omit the field for unconditional application; an empty string is
invalid. The inputs are:

| Input | Meaning for a permit |
| --- | --- |
| `object` | The existing target read using the recorded executor, or `null` when absent. This is not the rendered candidate. |
| `now` | The UTC evaluation time. |

There is no Go-template expansion or direct access to parameters/context in this
expression. For example, a permit can initialize a resource only if it is absent:

```yaml
policy:
  condition: "object == null"
```

A false result skips the target; it does not deny the permit or schedule a later
attempt. Invalid syntax or a non-boolean result type is rejected at admission.
Evaluation and read failures are reported as failures, including forbidden reads.
A permit can be Active while some or all of its targets were skipped. Use
[approval conditions]({{< relref "/docs/concepts/requests#review-and-control-a-permit" >}})
when the entire request must be gated.

### Evaluation lifecycle

The controller evaluates conditions during preflight, activation, and explicit
retries of a Failed permit. Preflight does not persist targets. Activation evaluates
again against live objects, so its result can differ from preflight. Active permits
do not periodically rerender or reevaluate conditions.

Targets apply independently; a later failure can leave earlier targets applied and
tracked for retry or cleanup. A false condition during retry can still reconcile
protection on targets already applied by the permit, using the captured policy.
Template edits require a new request; a retry keeps the existing snapshot.

Both template kinds have complete
[conditional examples]({{< relref "/docs/concepts/templates#conditional-resources" >}}).
The [conditional target lifecycle]({{< relref "/docs/concepts/requests#conditional-target-lifecycle" >}})
explains preflight, retries, and cleanup in detail.

## Scope, tracking, and cleanup

A namespaced target without `metadata.namespace` is placed in the ResourcePermit's
namespace. Explicit target namespaces and cluster-scoped targets require appropriate
permissions for the execution identity. The controller tracks processed targets and
uses a finalizer for cleanup, including cluster-scoped resources that cannot have a
namespaced permit as their Kubernetes owner.

On expiry or deletion, the controller applies each captured deletion policy to the
targets it managed. A never-applied target is left untouched; a target applied by an
earlier attempt remains eligible for cleanup even when a later attempt skipped it.
Successful targets remain tracked if another target fails.

Permit-managed objects may carry this metadata:

```yaml
metadata:
  labels:
    projectcapsule.dev/created-by: resource-permit
    projectcapsule.dev/managed-by: resource-permit
    projectcapsule.dev/protected-by: resource-permit
  annotations:
    projectcapsule.dev/active-until: "2026-08-31T11:00:00Z"
    projectcapsule.dev/resourcepermit-service-account: system:serviceaccount:capsule-system:resource-permit-runner
```

The exact metadata depends on the policy and lifecycle stage. It is controlled by
the addon, independently of the rendered manifest. See
[expiry, cancellation, and retry]({{< relref "/docs/concepts/requests#review-and-control-a-permit" >}})
for operator actions, and
[operations]({{< relref "/docs/concepts/requests#operations-and-troubleshooting" >}})
for retention and namespace termination behavior.

## Status and failures

Inspect a permit's lifecycle, failures, and tracked targets without printing the
rendered resource data, which may include Secrets:

```sh
kubectl get resourcepermit REQUEST -n NAMESPACE -o json \
  | jq '.status | {phase, failure, size, processedItems, conditions}'
```

Each processed item identifies the target's GVK, name, namespace, scope, creation
status, last apply time, and latest condition. Skipped targets report
`ConditionNotMet: apply skipped`. Previously applied targets retain their last
successful `lastApply`; never-applied targets have no successful apply timestamp.
The retained policy determines subsequent cleanup.

Correct the reported permissions, target, or execution problem, then use the
[retry command]({{< relref "/docs/concepts/requests#review-and-control-a-permit" >}})
for a Failed permit. A change to the captured template or parameters requires a new
request. Do not edit controller-owned snapshots or processed-item status.
