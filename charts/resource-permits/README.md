# Resource Permits

Kubernetes approval workflows and managed resource lifecycles, as a Project Capsule addon.
Runs independently of the Capsule controller and its CRDs. The chart follows the
Change Windows layout; cert-manager manages serving certificates by default.

## Installation

[![Helm Chart](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/projectcapsule)](https://artifacthub.io/packages/helm/projectcapsule/resource-permits)

Install [cert-manager](https://cert-manager.io/docs/installation/helm/) first, or
supply your own serving certificate as described below. For standalone operation,
save the [non-tenant namespace overrides](#standalone-and-non-tenant-namespaces) as
`resource-permits-values.yaml`. Select the intended Kubernetes context, then install:

```sh
helm repo add projectcapsule https://projectcapsule.github.io/charts
helm repo update projectcapsule

helm upgrade --install resource-permits projectcapsule/resource-permits \
  --namespace capsule-system --create-namespace \
  --values resource-permits-values.yaml

kubectl -n capsule-system rollout status deployment/resource-permits
```

Use `--version VERSION` to select a specific chart release. For an installation
limited to Capsule tenant namespaces, omit the values file to keep the default
admission selectors. The [installation guide](https://resource-permits.addons.projectcapsule.dev/docs/getting-started/installation/)
covers prerequisites and execution permissions.

### Install from a checkout

Build and publish an image through `task image:push`, then install the local chart:

```sh
helm upgrade --install resource-permits ./charts/resource-permits \
  --namespace capsule-system --create-namespace \
  --values resource-permits-values.yaml \
  --set manager.image.registry=ghcr.io \
  --set manager.image.repository=projectcapsule/resource-permits \
  --set manager.image.tag=VERSION
```

For an OCI release, replace the local chart path with
`oci://ghcr.io/projectcapsule/charts/resource-permits --version VERSION`.
Review CRD changes before each upgrade. The default
CRD lifecycle hook applies the bundled CRDs on install and upgrade.

## Controller identity and execution

The chart creates a dedicated ServiceAccount. Its default RBAC covers the addon,
namespace discovery, events, and impersonation; it does not grant arbitrary
workload management. Every template must set `spec.impersonation` with narrowly scoped
RBAC for the context and resources it uses. The controller must be trusted: its
ability to impersonate execution identities is privileged.

The execution-client cache reset interval is configured through Helm values:

```yaml
manager:
  args:
    cacheInvalidation: 1h
```

Every template must explicitly set `spec.impersonation`. A
`ResourcePermitTemplate` specifies a ServiceAccount name in its own namespace;
a `GlobalResourcePermitTemplate` specifies both name and namespace. Give that
ServiceAccount only the permissions needed by the template. The CRD and admission
reject missing references, and the controller never supplies a fallback executor.

Before upgrading, add explicit identities to existing templates. Remove the old
default-executor Helm values and startup flags from your deployment configuration.
Already prepared requests retain their recorded executor until cleanup finishes.

All identities follow the permit deletion lifecycle, including Kubernetes
administrators: expire active permits first and respect archive retention.
Namespace termination allows cleanup regardless of lifecycle phase or retention;
finalizers remain until managed-resource cleanup succeeds.
Settings are startup flags, so a Helm upgrade rolls out the new configuration.
The addon owns its impersonation client cache. ServiceAccount events invalidate
individual clients, and the configured interval resets the cache periodically.

## Running alongside Capsule

The addon does not watch Capsule CRDs or read CapsuleConfiguration, and its
controller role includes no Capsule-specific permissions. Templates can still
manage Capsule resources when their explicit executor has the required RBAC.

Avoid managing the same target through both a permit and Capsule replication.
Without authoritative replication ownership lookups, shared SSA cleanup stops
with `replication owner resolver is not configured`, retaining the target,
protection, and permit finalizer. `Orphan` can leave replication managed fields
behind after its parent is deleted, so deleting that parent alone may not unblock
cleanup. Resolve overlapping ownership through the owning controller and an
authorized executor before expecting permit cleanup to finish.

The addon identity and its executors must also satisfy Capsule's own admission
rules when operating in tenant namespaces. Configure their Capsule authorization
separately where needed. Requester role aggregation is opt-in through
`rbac.requester.labels`.

## Admission configuration

Admission uses the same `webhooks.hooks` layout as Change Windows. Each hook exposes
`rules`, `namespaceSelector`, `objectSelector`, `matchConditions`, `failurePolicy`,
`timeoutSeconds`, and `matchPolicy`:

| Hook | Endpoint |
| --- | --- |
| `resources` | Protect resources managed by permits; retains the protection-label CEL filter. |
| `resourcepermits` | Validate requests, status transitions, and deletion. |
| `resourcepermitsMutating` | Default requests and authenticate lifecycle transitions. |
| `resourcepermittemplates` | Validate namespaced templates. |
| `globalresourcepermittemplates` | Validate cluster-scoped templates. |
| `serviceaccounts` | Protect executors referenced by unexpired permits. |

All namespaced hooks preselect Capsule tenant namespaces by default:

```yaml
namespaceSelector:
  matchExpressions:
    - key: capsule.clastix.io/tenant
      operator: Exists
```

These filters run in the API server before admission. They do not restrict the
controller's reconciliation or authorize access to permits. Grant request/review
RBAC only where the corresponding admission hooks are enabled. The default can
exclude executors in infrastructure namespaces and targets outside tenant namespaces;
include those namespaces when their protection is required.

Cluster-scoped templates remain validated. The resource protection hook also
matches cluster-scoped targets. Namespace selectors do not exclude cluster-scoped
resources other than Namespace objects, which are matched against their own labels. See the
[Kubernetes admission reference](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#matching-requests-namespaceselector).

### Standalone and non-tenant namespaces

Provide your own expressions for **all five namespaced hooks** when operating
outside Capsule tenants. To include all namespaces:

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

Alternatively, replace each list with your own `In`, `NotIn`, or `Exists` expression.
For example, `key: permits.example.com/enabled, operator: Exists` selects namespaces
labelled by your platform. Apply the same policy to request mutation and validation.
The standalone playground and e2e values explicitly remove the tenant expression.

Helm replaces lists but merges maps. `namespaceSelector: {}` alone does **not**
remove the default expression. Use `matchExpressions: []` or replace the list, and
clear any `matchLabels` constraints supplied by your other values files.

Webhooks fail closed by default. ServiceAccount reference checks preserve their
existing `failurePolicy: Ignore`; set `webhooks.hooks.serviceaccounts.failurePolicy`
to `Fail` if admission outages must also block executor deletion. Keep the built-in
resource protection `matchConditions` when adding your own conditions.

### Templating and external admission

String values and map keys throughout `webhooks` support Helm templates using the
root context, including `.Release` and `.Values`. Boolean settings must render to
`true` or `false`; service ports and hook timeouts must render to integers. Keep
maps and lists as YAML structures. Values are evaluated once at Helm render time.

```yaml
webhooks:
  annotations:
    example.com/release: '{{ .Release.Name }}'
  hooks:
    resourcepermits:
      timeoutSeconds: '{{ add 5 5 }}'
      matchConditions:
        - name: exclude-controller-namespace
          expression: 'request.namespace != {{ .Release.Namespace | quote }}'
```

`webhooks.service` supports a custom service name, namespace, and port, or an HTTPS
`url` for a controller outside the cluster. A URL replaces service references;
each route path is appended to it. Supply its CA in `webhooks.service.caBundle`.
`crds.exclusive=true` installs only CRDs; combine it with `webhooks.exclusive=true`
to install admission configurations for an external controller.

## Certificates

`webhooks.certificate.generate.enabled=true` creates a cert-manager Issuer and
Certificate. CA injection populates the admission configurations. Configure
additional SANs, certificate duration, and renewal through
`webhooks.certificate.generate`. Certificates are mounted from
`webhooks.certificate.secret.name`, defaulting to `<release>-tls`.

For an existing TLS Secret, use:

```yaml
webhooks:
  certificate:
    generate:
      enabled: false
    secret:
      name: resource-permits-serving-tls
  service:
    caBundle: BASE64_ENCODED_CA_CERTIFICATE
```

The Secret must contain `tls.crt` and `tls.key`, and the certificate must cover the
configured webhook service DNS name. Manage renewal and CA updates externally.
The controller still needs serving certificates when `webhooks.enabled=false`;
that switch only disables registration and chart-managed certificate resources.

## CRD lifecycle

`crds.install=true` enables a pre-install/pre-upgrade hook, with its own ServiceAccount,
RBAC, ConfigMaps, and kubectl Job under `templates/hooks/crd-lifecycle/`. Its RBAC
can update only this addon's three CRDs. Helm installs bundled CRDs first on a new
release; do not use `--skip-crds` with hook mode on an empty cluster. The hook uses
server-side apply and force-conflicts to make this chart authoritative for its CRDs.
Hook Pods use `global.jobs.kubectl` scheduling, image, and security settings.

`crds.inline=true` renders CRDs as release resources instead; use `--skip-crds` in
this mode. `crds.keep=true` retains them on uninstall. `crds.install=false` disables
both lifecycle paths; also pass `--skip-crds` to leave CRDs entirely externally
managed. Local `dev:deploy` uses inline mode to avoid an extra kubectl Job image.

## Deployment and metrics

Image, replicas, resources, probes, security contexts, labels, annotations,
scheduling, environment, and extra arguments live under `manager`. Set
`manager.image.reference` to use a complete image reference, including a digest.
`serviceAccount` configures identity annotations and image pull secrets.
The manager role is generated from controller RBAC markers into `files/manager-role.yaml`.

The chart creates an internal HTTP metrics Service on port 8080. Enable
`metrics.serviceMonitor.enabled` when Prometheus Operator CRDs are installed.
Metrics are not authenticated; restrict access with cluster networking policy where
needed. Kind development uses `manager.hostUsers=true` for compatibility with its
container runtime; the chart otherwise follows Change Windows' user namespace setting.

## Migrating earlier chart values

| Earlier key | Replacement |
| --- | --- |
| `image.repository` (including registry), `image.tag` | `manager.image.reference`, or separate `manager.image.registry`, `repository`, and `tag` |
| `image.pullPolicy` | `manager.image.pullPolicy` |
| `replicaCount`, `resources`, `nodeSelector`, `tolerations` | Corresponding fields under `manager` |
| `tls.existingSecret` | `webhooks.certificate.secret.name`, with generation disabled |
| `tls.caBundle` | `webhooks.service.caBundle` |
| `webhooks.failurePolicy`, `webhooks.timeoutSeconds` | Corresponding fields on each `webhooks.hooks` entry |
| `webhooks.referencesFailurePolicy` | `webhooks.hooks.serviceaccounts.failurePolicy` |

Existing controller and admission configuration names are preserved. The default
Secret name changes from `<release>-webhook-tls` to `<release>-tls`; keep the old
Secret name and supply its CA if migrating without cert-manager. Preserve the
existing executor identity for prepared permits. Existing installations that need
all-namespace admission must apply the standalone override above during upgrade.
Use hook mode for existing CRDs, or explicitly adopt their Helm ownership before
switching to inline mode; do not take ownership of CRDs managed by another release.

## Uninstall

Finish outstanding permit cleanup before removing the controller:

```sh
helm uninstall resource-permits --namespace capsule-system
```

Helm retains CRDs and their custom resources. Removing the controller while
finalizers remain can leave managed resources awaiting cleanup.

## Values

### Global jobs

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| global.jobs.kubectl.affinity | object | `{}` | Set affinity rules |
| global.jobs.kubectl.annotations | object | `{}` | Annotations to add to the job. |
| global.jobs.kubectl.backoffLimit | int | `4` | Backofflimit for jobs |
| global.jobs.kubectl.image.pullPolicy | string | `"IfNotPresent"` | Set the image pull policy of the helm chart job |
| global.jobs.kubectl.image.registry | string | `"docker.io"` | Set the image repository of the helm chart job |
| global.jobs.kubectl.image.repository | string | `"clastix/kubectl"` | Set the image repository of the helm chart job |
| global.jobs.kubectl.image.tag | string | `""` | Set the image tag of the helm chart job |
| global.jobs.kubectl.imagePullSecrets | list | `[]` | ImagePullSecrets |
| global.jobs.kubectl.labels | object | `{}` | Labels to add to the job. |
| global.jobs.kubectl.nodeSelector | object | `{}` | Set the node selector |
| global.jobs.kubectl.podAnnotations | object | `{}` | Annotations to add to the job pod |
| global.jobs.kubectl.podLabels | object | `{}` | Labels to add to the job pod |
| global.jobs.kubectl.podSecurityContext | object | `{"enabled":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Security context for the job pods. |
| global.jobs.kubectl.priorityClassName | string | `""` | Set a pod priorityClassName |
| global.jobs.kubectl.resources | object | `{}` | Job resources |
| global.jobs.kubectl.restartPolicy | string | `"Never"` | Set the restartPolicy |
| global.jobs.kubectl.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"enabled":true,"readOnlyRootFilesystem":true,"runAsGroup":1002,"runAsNonRoot":true,"runAsUser":1002}` | Security context for the job containers. |
| global.jobs.kubectl.tolerations | list | `[]` | Set list of tolerations |
| global.jobs.kubectl.topologySpreadConstraints | list | `[]` | Set Topology Spread Constraints |
| global.jobs.kubectl.ttlSecondsAfterFinished | int | `60` | Sets the ttl in seconds after a finished certgen job is deleted. Set to -1 to never delete. |

### CRD lifecycle

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| crds.annotations | object | `{}` | Extra Annotations for CRDs |
| crds.exclusive | bool | `false` | Only install the CRDs, no other primitives |
| crds.inline | bool | `false` |  |
| crds.install | bool | `true` | Install the CustomResourceDefinitions (This also manages the lifecycle of the CRDs for update operations) |
| crds.keep | bool | `true` | Retain CRDs and their resources when an inline installation is uninstalled |
| crds.labels | object | `{}` | Extra Labels for CRDs |

### Controller, identity, and admission

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| fullnameOverride | string | `""` |  |
| manager.affinity | object | `{}` | Set affinity rules |
| manager.args.cacheInvalidation | string | `"1h"` | Periodic reset interval for impersonation clients |
| manager.args.extra | list | `["--leader-elect"]` | Extra arguments to pass to the manager container |
| manager.args.kubeApiBurst | int | `100` | Kubernetes client burst |
| manager.args.kubeApiQPS | int | `50` | Kubernetes client QPS |
| manager.args.workers | int | `1` | Concurrent template reconciliations |
| manager.env | list | `[]` | Environment variables |
| manager.hostUsers | bool | `false` | Do not use Host Users (User Namespaces) |
| manager.image.pullPolicy | string | `"IfNotPresent"` | Set the image pull policy. |
| manager.image.reference | string | `""` | Complete image reference, including an optional digest; overrides registry, repository, and tag |
| manager.image.registry | string | `"ghcr.io"` | Set the image registry |
| manager.image.repository | string | `"projectcapsule/resource-permits"` | Set the image repository |
| manager.image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion. |
| manager.livenessProbe | object | `{"httpGet":{"path":"/healthz","port":8081}}` | Configure the liveness probe using Deployment probe spec |
| manager.nodeSelector | object | `{}` | Set the node selector |
| manager.podAnnotations | object | `{}` | Additional annotations for manager Pods |
| manager.podLabels | object | `{}` | Additional labels for manager Pods |
| manager.podSecurityContext | object | `{"enabled":true,"seccompProfile":{"type":"RuntimeDefault"}}` | Set the securityContext |
| manager.priorityClassName | string | `""` | Set the priority class name of the controller pod |
| manager.readinessProbe | object | `{"httpGet":{"path":"/readyz","port":8081}}` | Configure the readiness probe using Deployment probe spec |
| manager.replicaCount | int | `1` | Amount of replicas |
| manager.resources | object | `{}` | Set the resource requests/limits |
| manager.securityContext | object | `{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"enabled":true,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"runAsUser":1000}` | Set the securityContext for the container |
| manager.tolerations | list | `[]` | Set list of tolerations |
| manager.topologySpreadConstraints | list | `[]` | Set topology spread constraints |
| nameOverride | string | `""` |  |
| rbac.create | bool | `true` | Create the controller ClusterRole and binding |
| rbac.extraRules | list | `[]` | Additional controller permissions for fallback execution; prefer explicit template executors |
| rbac.requester.create | bool | `true` | Create a role for requesting and reviewing permits; bind it explicitly |
| rbac.requester.labels | object | `{}` | Optional requester role labels, such as aggregation into the Kubernetes admin role |
| serviceAccount.annotations | object | `{}` | Annotations to add to the service account. |
| serviceAccount.create | bool | `true` | Specifies whether a service account should be created. |
| serviceAccount.imagePullSecrets | list | `[]` | Image pull secrets for the service account. |
| serviceAccount.name | string | `""` | The name of the service account to use. |
| webhooks.annotations | object | `{}` | Additional Annotations for all webhooks |
| webhooks.certificate.generate.dnsNames | list | `[]` | Additional DNS Names to include in certificate |
| webhooks.certificate.generate.duration | string | `""` | Duration of validity for the CA certificate (e.g. 2160h for 90 days) |
| webhooks.certificate.generate.enabled | bool | `true` | Enable cert-manager generated certificates for the webhook service |
| webhooks.certificate.generate.ipAddresses | list | `[]` | Additional IP Addresses to include in certificate |
| webhooks.certificate.generate.renewBefore | string | `""` | Renew the CA certificate before its expiration time (e.g. 360h for 15 days) |
| webhooks.certificate.generate.uris | list | `[]` | Additional URIs to include in certificate |
| webhooks.certificate.secret.name | string | `""` | Name of the secret containing the TLS certificate for the webhook service |
| webhooks.enabled | bool | `true` | Specifies whether the admission webhooks are enabled |
| webhooks.exclusive | bool | `false` | When `crds.exclusive` is `true` the webhooks will be installed |
| webhooks.hooks.globalresourcepermittemplates.failurePolicy | string | `"Fail"` |  |
| webhooks.hooks.globalresourcepermittemplates.matchConditions | list | `[]` |  |
| webhooks.hooks.globalresourcepermittemplates.matchPolicy | string | `"Exact"` |  |
| webhooks.hooks.globalresourcepermittemplates.namespaceSelector | object | `{}` |  |
| webhooks.hooks.globalresourcepermittemplates.objectSelector | object | `{}` |  |
| webhooks.hooks.globalresourcepermittemplates.rules[0].apiGroups[0] | string | `"addons.projectcapsule.dev"` |  |
| webhooks.hooks.globalresourcepermittemplates.rules[0].apiVersions[0] | string | `"v1beta2"` |  |
| webhooks.hooks.globalresourcepermittemplates.rules[0].operations[0] | string | `"CREATE"` |  |
| webhooks.hooks.globalresourcepermittemplates.rules[0].operations[1] | string | `"UPDATE"` |  |
| webhooks.hooks.globalresourcepermittemplates.rules[0].operations[2] | string | `"DELETE"` |  |
| webhooks.hooks.globalresourcepermittemplates.rules[0].resources[0] | string | `"globalresourcepermittemplates"` |  |
| webhooks.hooks.globalresourcepermittemplates.rules[0].scope | string | `"Cluster"` |  |
| webhooks.hooks.globalresourcepermittemplates.timeoutSeconds | int | `10` |  |
| webhooks.hooks.resourcepermits.failurePolicy | string | `"Fail"` |  |
| webhooks.hooks.resourcepermits.matchConditions | list | `[]` |  |
| webhooks.hooks.resourcepermits.matchPolicy | string | `"Exact"` |  |
| webhooks.hooks.resourcepermits.namespaceSelector.matchExpressions[0].key | string | `"capsule.clastix.io/tenant"` |  |
| webhooks.hooks.resourcepermits.namespaceSelector.matchExpressions[0].operator | string | `"Exists"` |  |
| webhooks.hooks.resourcepermits.objectSelector | object | `{}` |  |
| webhooks.hooks.resourcepermits.rules[0].apiGroups[0] | string | `"addons.projectcapsule.dev"` |  |
| webhooks.hooks.resourcepermits.rules[0].apiVersions[0] | string | `"v1beta2"` |  |
| webhooks.hooks.resourcepermits.rules[0].operations[0] | string | `"CREATE"` |  |
| webhooks.hooks.resourcepermits.rules[0].operations[1] | string | `"UPDATE"` |  |
| webhooks.hooks.resourcepermits.rules[0].operations[2] | string | `"DELETE"` |  |
| webhooks.hooks.resourcepermits.rules[0].resources[0] | string | `"resourcepermits"` |  |
| webhooks.hooks.resourcepermits.rules[0].resources[1] | string | `"resourcepermits/status"` |  |
| webhooks.hooks.resourcepermits.rules[0].scope | string | `"Namespaced"` |  |
| webhooks.hooks.resourcepermits.timeoutSeconds | int | `10` |  |
| webhooks.hooks.resourcepermitsMutating.failurePolicy | string | `"Fail"` |  |
| webhooks.hooks.resourcepermitsMutating.matchConditions | list | `[]` |  |
| webhooks.hooks.resourcepermitsMutating.matchPolicy | string | `"Exact"` |  |
| webhooks.hooks.resourcepermitsMutating.namespaceSelector.matchExpressions[0].key | string | `"capsule.clastix.io/tenant"` |  |
| webhooks.hooks.resourcepermitsMutating.namespaceSelector.matchExpressions[0].operator | string | `"Exists"` |  |
| webhooks.hooks.resourcepermitsMutating.objectSelector | object | `{}` |  |
| webhooks.hooks.resourcepermitsMutating.rules[0].apiGroups[0] | string | `"addons.projectcapsule.dev"` |  |
| webhooks.hooks.resourcepermitsMutating.rules[0].apiVersions[0] | string | `"v1beta2"` |  |
| webhooks.hooks.resourcepermitsMutating.rules[0].operations[0] | string | `"CREATE"` |  |
| webhooks.hooks.resourcepermitsMutating.rules[0].operations[1] | string | `"UPDATE"` |  |
| webhooks.hooks.resourcepermitsMutating.rules[0].resources[0] | string | `"resourcepermits"` |  |
| webhooks.hooks.resourcepermitsMutating.rules[0].resources[1] | string | `"resourcepermits/status"` |  |
| webhooks.hooks.resourcepermitsMutating.rules[0].scope | string | `"Namespaced"` |  |
| webhooks.hooks.resourcepermitsMutating.timeoutSeconds | int | `10` |  |
| webhooks.hooks.resourcepermittemplates.failurePolicy | string | `"Fail"` |  |
| webhooks.hooks.resourcepermittemplates.matchConditions | list | `[]` |  |
| webhooks.hooks.resourcepermittemplates.matchPolicy | string | `"Exact"` |  |
| webhooks.hooks.resourcepermittemplates.namespaceSelector.matchExpressions[0].key | string | `"capsule.clastix.io/tenant"` |  |
| webhooks.hooks.resourcepermittemplates.namespaceSelector.matchExpressions[0].operator | string | `"Exists"` |  |
| webhooks.hooks.resourcepermittemplates.objectSelector | object | `{}` |  |
| webhooks.hooks.resourcepermittemplates.rules[0].apiGroups[0] | string | `"addons.projectcapsule.dev"` |  |
| webhooks.hooks.resourcepermittemplates.rules[0].apiVersions[0] | string | `"v1beta2"` |  |
| webhooks.hooks.resourcepermittemplates.rules[0].operations[0] | string | `"CREATE"` |  |
| webhooks.hooks.resourcepermittemplates.rules[0].operations[1] | string | `"UPDATE"` |  |
| webhooks.hooks.resourcepermittemplates.rules[0].operations[2] | string | `"DELETE"` |  |
| webhooks.hooks.resourcepermittemplates.rules[0].resources[0] | string | `"resourcepermittemplates"` |  |
| webhooks.hooks.resourcepermittemplates.rules[0].scope | string | `"Namespaced"` |  |
| webhooks.hooks.resourcepermittemplates.timeoutSeconds | int | `10` |  |
| webhooks.hooks.resources.failurePolicy | string | `"Fail"` |  |
| webhooks.hooks.resources.matchConditions[0].expression | string | `"[object, oldObject].exists(o, o != null && has(o.metadata.labels) && (('projectcapsule.dev/protected-by' in o.metadata.labels && o.metadata.labels['projectcapsule.dev/protected-by'] == 'resource-permit') || ('protection.projectcapsule.dev/resource-permit' in o.metadata.labels && o.metadata.labels['protection.projectcapsule.dev/resource-permit'] == 'true')))"` |  |
| webhooks.hooks.resources.matchConditions[0].name | string | `"resource-permit-protection"` |  |
| webhooks.hooks.resources.matchPolicy | string | `"Exact"` |  |
| webhooks.hooks.resources.namespaceSelector.matchExpressions[0].key | string | `"capsule.clastix.io/tenant"` |  |
| webhooks.hooks.resources.namespaceSelector.matchExpressions[0].operator | string | `"Exists"` |  |
| webhooks.hooks.resources.objectSelector | object | `{}` |  |
| webhooks.hooks.resources.rules[0].apiGroups[0] | string | `"*"` |  |
| webhooks.hooks.resources.rules[0].apiVersions[0] | string | `"*"` |  |
| webhooks.hooks.resources.rules[0].operations[0] | string | `"CREATE"` |  |
| webhooks.hooks.resources.rules[0].operations[1] | string | `"UPDATE"` |  |
| webhooks.hooks.resources.rules[0].operations[2] | string | `"DELETE"` |  |
| webhooks.hooks.resources.rules[0].resources[0] | string | `"*"` |  |
| webhooks.hooks.resources.rules[0].scope | string | `"*"` |  |
| webhooks.hooks.resources.timeoutSeconds | int | `10` |  |
| webhooks.hooks.serviceaccounts.failurePolicy | string | `"Ignore"` |  |
| webhooks.hooks.serviceaccounts.matchConditions | list | `[]` |  |
| webhooks.hooks.serviceaccounts.matchPolicy | string | `"Exact"` |  |
| webhooks.hooks.serviceaccounts.namespaceSelector.matchExpressions[0].key | string | `"capsule.clastix.io/tenant"` |  |
| webhooks.hooks.serviceaccounts.namespaceSelector.matchExpressions[0].operator | string | `"Exists"` |  |
| webhooks.hooks.serviceaccounts.objectSelector | object | `{}` |  |
| webhooks.hooks.serviceaccounts.rules[0].apiGroups[0] | string | `""` |  |
| webhooks.hooks.serviceaccounts.rules[0].apiVersions[0] | string | `"v1"` |  |
| webhooks.hooks.serviceaccounts.rules[0].operations[0] | string | `"DELETE"` |  |
| webhooks.hooks.serviceaccounts.rules[0].resources[0] | string | `"serviceaccounts"` |  |
| webhooks.hooks.serviceaccounts.rules[0].scope | string | `"Namespaced"` |  |
| webhooks.hooks.serviceaccounts.timeoutSeconds | int | `10` |  |
| webhooks.labels | object | `{}` | Additional Labels for all webhooks |
| webhooks.service.caBundle | string | `""` | CABundle for the webhook service |
| webhooks.service.name | string | `""` | Custom service name for the webhook service |
| webhooks.service.namespace | string | `""` | Custom service namespace for the webhook service |
| webhooks.service.port | integer, null | `nil` | Custom service port for the webhook service |
| webhooks.service.url | string | `""` | The URL where the controller webhook services are running (Overwrites cluster scoped service definition) |

### Metrics

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| metrics.serviceMonitor.enabled | bool | `false` | Create a Prometheus Operator ServiceMonitor for the controller's HTTP metrics |
| metrics.serviceMonitor.interval | string | `"30s"` | Scrape interval |
| metrics.serviceMonitor.labels | object | `{}` | Additional ServiceMonitor labels |
