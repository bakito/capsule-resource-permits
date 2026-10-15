---
title: API reference
weight: 10
description: Generated reference for ResourcePermit and its template APIs.
---

Packages:

- [addons.projectcapsule.dev/v1beta2](#addonsprojectcapsuledevv1beta2)

# addons.projectcapsule.dev/v1beta2

Resource Types:

- [ResourcePermit](#resourcepermit)

- [ResourcePermitTemplate](#resourcepermittemplate)

- [GlobalResourcePermitTemplate](#globalresourcepermittemplate)




## ResourcePermit
<sup><sup>[↩ Parent](#addonsprojectcapsuledevv1beta2 )</sup></sup>






ResourcePermit is the Schema for the ResourcePermits API.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
      <td><b>apiVersion</b></td>
      <td>string</td>
      <td>addons.projectcapsule.dev/v1beta2</td>
      <td>true</td>
      </tr>
      <tr>
      <td><b>kind</b></td>
      <td>string</td>
      <td>ResourcePermit</td>
      <td>true</td>
      </tr>
      <tr>
      <td><b><a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.27/#objectmeta-v1-meta">metadata</a></b></td>
      <td>object</td>
      <td>Refer to the Kubernetes API documentation for the fields of the `metadata` field.</td>
      <td>true</td>
      </tr><tr>
        <td><b><a href="#resourcepermitspec">spec</a></b></td>
        <td>object</td>
        <td>
          ResourcePermitSpec defines the desired state of ResourcePermit.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatus">status</a></b></td>
        <td>object</td>
        <td>
          ResourcePermitStatus defines the observed state of ResourcePermit.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.spec
<sup><sup>[↩ Parent](#resourcepermit)</sup></sup>



ResourcePermitSpec defines the desired state of ResourcePermit.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermitspectemplate">template</a></b></td>
        <td>object</td>
        <td>
          Template references the template to use for this request.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>duration</b></td>
        <td>string</td>
        <td>
          The duration of this ResourcePermit should be valid for.
If no duration was defined, the lifecycle is bound to the request itself -
if the request is deleted, it's the end of the duration.
The Request can also be Terminated by another automation via calling the ExpirePermit() API-Function.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>params</b></td>
        <td>object</td>
        <td>
          Params the parameters to use for the template.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>reason</b></td>
        <td>string</td>
        <td>
          A reason on why the request is needed<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitspecrequestor">requestor</a></b></td>
        <td>object</td>
        <td>
          Requesting actor for the resource permit.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>startTime</b></td>
        <td>string</td>
        <td>
          Optional point in time when the permit should become active. Must be in the future.
If omitted, this is set to the current time. The Request must already be approved before the start time.<br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.spec.template
<sup><sup>[↩ Parent](#resourcepermitspec)</sup></sup>



Template references the template to use for this request.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>kind</b></td>
        <td>enum</td>
        <td>
          Kind of template being referenced.<br/>
          <br/>
            <i>Enum</i>: ResourcePermitTemplate, GlobalResourcePermitTemplate<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the template being referenced.<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### ResourcePermit.spec.requestor
<sup><sup>[↩ Parent](#resourcepermitspec)</sup></sup>



Requesting actor for the resource permit.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>groups</b></td>
        <td>[]string</td>
        <td>
          The groups the entity belongs to<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          The name of the entity<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>type</b></td>
        <td>enum</td>
        <td>
          The type of the entity<br/>
          <br/>
            <i>Enum</i>: User, Group, System, ServiceAccount<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status
<sup><sup>[↩ Parent](#resourcepermit)</sup></sup>



ResourcePermitStatus defines the observed state of ResourcePermit.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>size</b></td>
        <td>integer</td>
        <td>
          Number of managed resources.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusactive">active</a></b></td>
        <td>object</td>
        <td>
          Shows timestamps between approval and termination of the request.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusconditionsindex">conditions</a></b></td>
        <td>[]object</td>
        <td>
          Conditions describes current operational state such as readiness.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusfailure">failure</a></b></td>
        <td>object</td>
        <td>
          Failure describes a recoverable preflight or activation failure. RetryPhase
is the trusted lifecycle phase Capsule resumes after a successful retry.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>keepUntil</b></td>
        <td>string</td>
        <td>
          The time until which the ResourcePermit should be retained after it expires (e.g. for auditing).
If unset, the ResourcePermit can be deleted immediately after expiring.<br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>phase</b></td>
        <td>enum</td>
        <td>
          <br/>
          <br/>
            <i>Enum</i>: Created, Requested, Pending, Denied, Approved, Active, Failed, Retrying, Expired<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusprocesseditemsindex">processedItems</a></b></td>
        <td>[]object</td>
        <td>
          List of resources managed by the API object.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusrequest">request</a></b></td>
        <td>object</td>
        <td>
          Request contains the resolved template, execution identity, lifecycle
properties, and rendered resources presented for review.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusreview">review</a></b></td>
        <td>object</td>
        <td>
          Review refers to the subject that either approved or denied the request<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatustransitionsindex">transitions</a></b></td>
        <td>[]object</td>
        <td>
          Transitions is the chronological, append-only audit trail of lifecycle
changes. Conditions remain reserved for operational state such as Ready.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.active
<sup><sup>[↩ Parent](#resourcepermitstatus)</sup></sup>



Shows timestamps between approval and termination of the request.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>from</b></td>
        <td>string</td>
        <td>
          <br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>until</b></td>
        <td>string</td>
        <td>
          <br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.conditions[index]
<sup><sup>[↩ Parent](#resourcepermitstatus)</sup></sup>



Condition contains details for one aspect of the current state of this API Resource.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>lastTransitionTime</b></td>
        <td>string</td>
        <td>
          lastTransitionTime is the last time the condition transitioned from one status to another.
This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.<br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>message</b></td>
        <td>string</td>
        <td>
          message is a human readable message indicating details about the transition.
This may be an empty string.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>reason</b></td>
        <td>string</td>
        <td>
          reason contains a programmatic identifier indicating the reason for the condition's last transition.
Producers of specific condition types may define expected values and meanings for this field,
and whether the values are considered a guaranteed API.
The value should be a CamelCase string.
This field may not be empty.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>status</b></td>
        <td>enum</td>
        <td>
          status of the condition, one of True, False, Unknown.<br/>
          <br/>
            <i>Enum</i>: True, False, Unknown<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>type</b></td>
        <td>string</td>
        <td>
          type of condition in CamelCase or in foo.example.com/CamelCase.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>observedGeneration</b></td>
        <td>integer</td>
        <td>
          observedGeneration represents the .metadata.generation that the condition was set based upon.
For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
with respect to the current state of the instance.<br/>
          <br/>
            <i>Format</i>: int64<br/>
            <i>Minimum</i>: 0<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.failure
<sup><sup>[↩ Parent](#resourcepermitstatus)</sup></sup>



Failure describes a recoverable preflight or activation failure. RetryPhase
is the trusted lifecycle phase Capsule resumes after a successful retry.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>message</b></td>
        <td>string</td>
        <td>
          Message contains the latest actionable failure returned by Kubernetes.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>reason</b></td>
        <td>string</td>
        <td>
          Reason is the stable machine-readable Ready condition reason.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>retryPhase</b></td>
        <td>enum</td>
        <td>
          RetryPhase is the phase Capsule resumes after recovery succeeds.<br/>
          <br/>
            <i>Enum</i>: Requested, Approved<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>stage</b></td>
        <td>enum</td>
        <td>
          Stage identifies whether the failure happened before review or while
activating an already approved request.<br/>
          <br/>
            <i>Enum</i>: Preflight, Activation<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### ResourcePermit.status.processedItems[index]
<sup><sup>[↩ Parent](#resourcepermitstatus)</sup></sup>



Advanced Status Item for pin pointing items in tenants/namespaces.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>group</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>kind</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>namespace</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>origin</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusprocesseditemsindexstatus">status</a></b></td>
        <td>object</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>tenant</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>version</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.processedItems[index].status
<sup><sup>[↩ Parent](#resourcepermitstatusprocesseditemsindex)</sup></sup>





<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>status</b></td>
        <td>enum</td>
        <td>
          status of the condition, one of True, False, Unknown.<br/>
          <br/>
            <i>Enum</i>: True, False, Unknown<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>type</b></td>
        <td>string</td>
        <td>
          type of condition in CamelCase or in foo.example.com/CamelCase.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>clusterScoped</b></td>
        <td>boolean</td>
        <td>
          Indicates whether the referenced resource is cluster-scoped.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>created</b></td>
        <td>boolean</td>
        <td>
          Indicates wether the resource was created or adopted<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>lastApply</b></td>
        <td>string</td>
        <td>
          An opaque value that represents the internal version of this object that can
be used by clients to determine when objects have changed. May be used for optimistic
concurrency, change detection, and the watch operation on a resource or set of resources.
Clients must treat these values as opaque and passed unmodified back to the server.
They may only be valid for a particular resource or set of resources.

Populated by the system.
Read-only.
Value must be treated as opaque by clients and .
More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency<br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>message</b></td>
        <td>string</td>
        <td>
          message is a human readable message indicating details about the transition.
This may be an empty string.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusprocesseditemsindexstatuspolicy">policy</a></b></td>
        <td>object</td>
        <td>
          Policy is a lifecycle snapshot for protection and cleanup. Conditions are
evaluated from the source block and omitted here. Failed updates retain the
previous snapshot; a first successful content write records its policy even
if metadata reconciliation fails, so cleanup respects explicit retention.
An absent policy on an already applied item preserves legacy behavior.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.processedItems[index].status.policy
<sup><sup>[↩ Parent](#resourcepermitstatusprocesseditemsindexstatus)</sup></sup>



Policy is a lifecycle snapshot for protection and cleanup. Conditions are
evaluated from the source block and omitted here. Failed updates retain the
previous snapshot; a first successful content write records its policy even
if metadata reconciliation fails, so cleanup respects explicit retention.
An absent policy on an already applied item preserves legacy behavior.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>creation</b></td>
        <td>enum</td>
        <td>
          Creation controls how an existing target is handled. Owner requires the
resource to have been created by the applying controller and otherwise
returns an error. Merge adopts an existing resource when possible and
creates the resource when it does not exist.<br/>
          <br/>
            <i>Enum</i>: Owner, Merge<br/>
            <i>Default</i>: Owner<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>deletion</b></td>
        <td>enum</td>
        <td>
          Deletion controls what happens when the parent stops managing the target.
Remove deletes resources created for the parent and relinquishes adopted
resources. Orphan keeps the resource and removes Capsule's lifecycle
metadata. Removal is the default.<br/>
          <br/>
            <i>Enum</i>: Remove, Orphan<br/>
            <i>Default</i>: Remove<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>force</b></td>
        <td>boolean</td>
        <td>
          Force allows server-side apply to acquire conflicting field ownership.<br/>
          <br/>
            <i>Default</i>: false<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>protect</b></td>
        <td>boolean</td>
        <td>
          Protect prevents users from changing or deleting the target through
admission while it is managed. Protection is enabled by default.<br/>
          <br/>
            <i>Default</i>: true<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.request
<sup><sup>[↩ Parent](#resourcepermitstatus)</sup></sup>



Request contains the resolved template, execution identity, lifecycle
properties, and rendered resources presented for review.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermitstatusrequestapprovals">approvals</a></b></td>
        <td>object</td>
        <td>
          Approvals is the approval policy copied from the resolved template. It is
immutable after rendering so an in-flight request is reviewed against the
policy presented with its resource snapshot.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>duration</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusrequestimpersonation">impersonation</a></b></td>
        <td>object</td>
        <td>
          Impersonation is the resolved identity used for template context loading
and managed-resource actions. It is copied from the template before preflight
and retained for the request's lifecycle, including cleanup.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>keepFor</b></td>
        <td>string</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusrequestresourcesindex">resources</a></b></td>
        <td>[]object</td>
        <td>
          Resources contains the fully rendered manifests prepared for this request.
These resources are the source of truth for server-side apply and pruning;
source templates and rendering context are never copied into the request.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>startTime</b></td>
        <td>string</td>
        <td>
          <br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusrequesttemplate">template</a></b></td>
        <td>object</td>
        <td>
          Template identifies the exact template version used to render the request.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.request.approvals
<sup><sup>[↩ Parent](#resourcepermitstatusrequest)</sup></sup>



Approvals is the approval policy copied from the resolved template. It is
immutable after rendering so an in-flight request is reviewed against the
policy presented with its resource snapshot.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermitstatusrequestapprovalsapproversindex">approvers</a></b></td>
        <td>[]object</td>
        <td>
          Approvers lists the subjects permitted to approve a request manually.
When omitted, any subject with permission to update the request status may
approve it.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>auto</b></td>
        <td>boolean</td>
        <td>
          Auto automatically approves matching requests. Approvers are ignored for
automatic approvals.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>conditions</b></td>
        <td>[]string</td>
        <td>
          Conditions contains CEL expressions evaluated as an OR list. At least one
expression must evaluate to true. When omitted, approval is unconditional.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.request.approvals.approvers[index]
<sup><sup>[↩ Parent](#resourcepermitstatusrequestapprovals)</sup></sup>





<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>kind</b></td>
        <td>enum</td>
        <td>
          Kind of entity. Possible values are "User", "Group", and "ServiceAccount"<br/>
          <br/>
            <i>Enum</i>: User, Group, ServiceAccount<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the entity.<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### ResourcePermit.status.request.impersonation
<sup><sup>[↩ Parent](#resourcepermitstatusrequest)</sup></sup>



Impersonation is the resolved identity used for template context loading
and managed-resource actions. It is copied from the template before preflight
and retained for the request's lifecycle, including cleanup.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the referent.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>namespace</b></td>
        <td>string</td>
        <td>
          Namespace of the referent.<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### ResourcePermit.status.request.resources[index]
<sup><sup>[↩ Parent](#resourcepermitstatusrequest)</sup></sup>



RenderedResource is an execution-ready group of Kubernetes manifests
produced from a ResourceTemplate. It intentionally cannot contain a source
template so status consumers and reconcilers only observe concrete targets.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>targets</b></td>
        <td>[]object</td>
        <td>
          Targets are the fully rendered Kubernetes manifests.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusrequestresourcesindexpolicy">policy</a></b></td>
        <td>object</td>
        <td>
          Policy controls how every rendered target is created and managed.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.request.resources[index].policy
<sup><sup>[↩ Parent](#resourcepermitstatusrequestresourcesindex)</sup></sup>



Policy controls how every rendered target is created and managed.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>creation</b></td>
        <td>enum</td>
        <td>
          Creation controls how an existing target is handled. Owner requires the
resource to have been created by the applying controller and otherwise
returns an error. Merge adopts an existing resource when possible and
creates the resource when it does not exist.<br/>
          <br/>
            <i>Enum</i>: Owner, Merge<br/>
            <i>Default</i>: Owner<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>deletion</b></td>
        <td>enum</td>
        <td>
          Deletion controls what happens when the parent stops managing the target.
Remove deletes resources created for the parent and relinquishes adopted
resources. Orphan keeps the resource and removes Capsule's lifecycle
metadata. Removal is the default.<br/>
          <br/>
            <i>Enum</i>: Remove, Orphan<br/>
            <i>Default</i>: Remove<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>force</b></td>
        <td>boolean</td>
        <td>
          Force allows server-side apply to acquire conflicting field ownership.<br/>
          <br/>
            <i>Default</i>: false<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>protect</b></td>
        <td>boolean</td>
        <td>
          Protect prevents users from changing or deleting the target through
admission while it is managed. Protection is enabled by default.<br/>
          <br/>
            <i>Default</i>: true<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.request.template
<sup><sup>[↩ Parent](#resourcepermitstatusrequest)</sup></sup>



Template identifies the exact template version used to render the request.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>kind</b></td>
        <td>enum</td>
        <td>
          Kind of template being referenced.<br/>
          <br/>
            <i>Enum</i>: ResourcePermitTemplate, GlobalResourcePermitTemplate<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the template being referenced.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>resourceVersion</b></td>
        <td>string</td>
        <td>
          ResourceVersion of the template used to render the request resources.<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### ResourcePermit.status.review
<sup><sup>[↩ Parent](#resourcepermitstatus)</sup></sup>



Review refers to the subject that either approved or denied the request

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>message</b></td>
        <td>string</td>
        <td>
          Message with the review<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermitstatusreviewreviewer">reviewer</a></b></td>
        <td>object</td>
        <td>
          The Entity reviewing this request<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>verdict</b></td>
        <td>enum</td>
        <td>
          The verdict made by the reviewing entity<br/>
          <br/>
            <i>Enum</i>: Pending, Denied, Approved<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.review.reviewer
<sup><sup>[↩ Parent](#resourcepermitstatusreview)</sup></sup>



The Entity reviewing this request

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>groups</b></td>
        <td>[]string</td>
        <td>
          The groups the entity belongs to<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          The name of the entity<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>type</b></td>
        <td>enum</td>
        <td>
          The type of the entity<br/>
          <br/>
            <i>Enum</i>: User, Group, System, ServiceAccount<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.transitions[index]
<sup><sup>[↩ Parent](#resourcepermitstatus)</sup></sup>



ResourcePermitTransition records one authenticated lifecycle transition.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermitstatustransitionsindexactor">actor</a></b></td>
        <td>object</td>
        <td>
          Actor is the authenticated user, ServiceAccount, or Capsule system actor
responsible for the transition. Group claims are deliberately not copied
into the audit trail.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>reason</b></td>
        <td>string</td>
        <td>
          Reason is a stable machine-readable explanation of the transition.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>timestamp</b></td>
        <td>string</td>
        <td>
          Timestamp is when the transition was requested or performed.<br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>type</b></td>
        <td>enum</td>
        <td>
          Type identifies the lifecycle state entered by this transition. The
previous state can be derived from the preceding chronological entry.<br/>
          <br/>
            <i>Enum</i>: Created, Requested, Pending, Denied, Approved, Active, Failed, Retrying, Expired<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>eventTime</b></td>
        <td>string</td>
        <td>
          EventTime is set after Capsule emits the Kubernetes lifecycle event for
this transition.<br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>message</b></td>
        <td>string</td>
        <td>
          Message is the human-readable explanation of the transition.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermit.status.transitions[index].actor
<sup><sup>[↩ Parent](#resourcepermitstatustransitionsindex)</sup></sup>



Actor is the authenticated user, ServiceAccount, or Capsule system actor
responsible for the transition. Group claims are deliberately not copied
into the audit trail.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name is the authenticated actor name.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>type</b></td>
        <td>enum</td>
        <td>
          Type identifies the kind of authenticated actor.<br/>
          <br/>
            <i>Enum</i>: User, Group, System, ServiceAccount<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>

## ResourcePermitTemplate
<sup><sup>[↩ Parent](#addonsprojectcapsuledevv1beta2 )</sup></sup>






ResourcePermitTemplate is the Schema for namespaced ResourcePermit templates.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
      <td><b>apiVersion</b></td>
      <td>string</td>
      <td>addons.projectcapsule.dev/v1beta2</td>
      <td>true</td>
      </tr>
      <tr>
      <td><b>kind</b></td>
      <td>string</td>
      <td>ResourcePermitTemplate</td>
      <td>true</td>
      </tr>
      <tr>
      <td><b><a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.27/#objectmeta-v1-meta">metadata</a></b></td>
      <td>object</td>
      <td>Refer to the Kubernetes API documentation for the fields of the `metadata` field.</td>
      <td>true</td>
      </tr><tr>
        <td><b><a href="#resourcepermittemplatespec">spec</a></b></td>
        <td>object</td>
        <td>
          ResourcePermitTemplateSpec defines the desired state of a namespaced ResourcePermitTemplate.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b><a href="#resourcepermittemplatestatus">status</a></b></td>
        <td>object</td>
        <td>
          ResourcePermitTemplateStatus defines the observed state of ResourcePermitTemplate.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec
<sup><sup>[↩ Parent](#resourcepermittemplate)</sup></sup>



ResourcePermitTemplateSpec defines the desired state of a namespaced ResourcePermitTemplate.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermittemplatespecimpersonation">impersonation</a></b></td>
        <td>object</td>
        <td>
          Impersonation identifies the required ServiceAccount used for context loading
and every managed-resource action, including cleanup. Namespaced templates
use a ServiceAccount in their own namespace; global templates specify both
name and namespace. There is no default execution identity.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b><a href="#resourcepermittemplatespecresourcesindex">resources</a></b></td>
        <td>[]object</td>
        <td>
          Resources rendered and managed by this template.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b><a href="#resourcepermittemplatespecapprovals">approvals</a></b></td>
        <td>object</td>
        <td>
          Approvals configures automatic and manual approval of requests using this template.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermittemplatespeccontext">context</a></b></td>
        <td>object</td>
        <td>
          Context loads additional Kubernetes resources for use by all resource targets and templates.
Resource reference fields may use parameters declared by ParamSchema.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>defaultDuration</b></td>
        <td>string</td>
        <td>
          The default duration of a ResourcePermit referencing this template.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>keepFor</b></td>
        <td>string</td>
        <td>
          The duration a ResourcePermit is retained after it expires for auditing.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>maxDuration</b></td>
        <td>string</td>
        <td>
          The maximum allowed duration of a ResourcePermit referencing this template.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>paramSchema</b></td>
        <td>object</td>
        <td>
          ParamSchema is the JSON Schema used to validate template parameters.
Properties may use the x-capsule-form vendor extension to select values
from arbitrary Kubernetes GVKs in compatible form clients. The schema may
use x-kubernetes-validations for Kubernetes-compatible CEL rules.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.impersonation
<sup><sup>[↩ Parent](#resourcepermittemplatespec)</sup></sup>



Impersonation identifies the required ServiceAccount used for context loading
and every managed-resource action, including cleanup. Namespaced templates
use a ServiceAccount in their own namespace; global templates specify both
name and namespace. There is no default execution identity.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the referent.<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.resources[index]
<sup><sup>[↩ Parent](#resourcepermittemplatespec)</sup></sup>





<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermittemplatespecresourcesindexpolicy">policy</a></b></td>
        <td>object</td>
        <td>
          Policy controls how every target in this resource group is created and managed.<br/>
          <br/>
            <i>Default</i>: map[]<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>targets</b></td>
        <td>[]object</td>
        <td>
          Targets are Kubernetes resource objects to render and manage with Policy.
Parameters and loaded context use the flat template root; trusted request
metadata is available under .request.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>template</b></td>
        <td>string</td>
        <td>
          Template is an optional Go template which may render one or more YAML or
JSON Kubernetes resources separated by YAML document markers. Request
parameters are available under .params and loaded resources under
.context.resources. Trusted request metadata is available under .request
with name, username, groups, and timestamp fields.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.resources[index].policy
<sup><sup>[↩ Parent](#resourcepermittemplatespecresourcesindex)</sup></sup>



Policy controls how every target in this resource group is created and managed.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>creation</b></td>
        <td>enum</td>
        <td>
          Creation controls how an existing target is handled. Owner requires the
resource to have been created by the applying controller and otherwise
returns an error. Merge adopts an existing resource when possible and
creates the resource when it does not exist.<br/>
          <br/>
            <i>Enum</i>: Owner, Merge<br/>
            <i>Default</i>: Owner<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>deletion</b></td>
        <td>enum</td>
        <td>
          Deletion controls what happens when the parent stops managing the target.
Remove deletes resources created for the parent and relinquishes adopted
resources. Orphan keeps the resource and removes Capsule's lifecycle
metadata. Removal is the default.<br/>
          <br/>
            <i>Enum</i>: Remove, Orphan<br/>
            <i>Default</i>: Remove<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>force</b></td>
        <td>boolean</td>
        <td>
          Force allows server-side apply to acquire conflicting field ownership.<br/>
          <br/>
            <i>Default</i>: false<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>protect</b></td>
        <td>boolean</td>
        <td>
          Protect prevents users from changing or deleting the target through
admission while it is managed. Protection is enabled by default.<br/>
          <br/>
            <i>Default</i>: true<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.approvals
<sup><sup>[↩ Parent](#resourcepermittemplatespec)</sup></sup>



Approvals configures automatic and manual approval of requests using this template.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermittemplatespecapprovalsapproversindex">approvers</a></b></td>
        <td>[]object</td>
        <td>
          Approvers lists the subjects permitted to approve a request manually.
When omitted, any subject with permission to update the request status may
approve it.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>auto</b></td>
        <td>boolean</td>
        <td>
          Auto automatically approves matching requests. Approvers are ignored for
automatic approvals.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>conditions</b></td>
        <td>[]string</td>
        <td>
          Conditions contains CEL expressions evaluated as an OR list. At least one
expression must evaluate to true. When omitted, approval is unconditional.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.approvals.approvers[index]
<sup><sup>[↩ Parent](#resourcepermittemplatespecapprovals)</sup></sup>





<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>kind</b></td>
        <td>enum</td>
        <td>
          Kind of entity. Possible values are "User", "Group", and "ServiceAccount"<br/>
          <br/>
            <i>Enum</i>: User, Group, ServiceAccount<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the entity.<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.context
<sup><sup>[↩ Parent](#resourcepermittemplatespec)</sup></sup>



Context loads additional Kubernetes resources for use by all resource targets and templates.
Resource reference fields may use parameters declared by ParamSchema.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermittemplatespeccontextresourcesindex">resources</a></b></td>
        <td>[]object</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.context.resources[index]
<sup><sup>[↩ Parent](#resourcepermittemplatespeccontext)</sup></sup>





<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>kind</b></td>
        <td>string</td>
        <td>
          Kind of the referent.

Use "*" to match all kinds.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>apiVersion</b></td>
        <td>string</td>
        <td>
          API version, API group, or API group/version selector of the referent.

Empty APIVersion means the core Kubernetes API version "v1".
Use "*" to explicitly match all API groups and versions.

Examples:
- "" means core "v1".
- "v1" means core "v1".
- "apps" means any version in the "apps" API group.
- "apps/v1" means the "apps/v1" API group/version.
- "apps/*" means any version in the "apps" API group.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>index</b></td>
        <td>string</td>
        <td>
          Index to mount the resource in the template context<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the values referent. This is useful
when you traying to get a specific resource<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>namespace</b></td>
        <td>string</td>
        <td>
          Namespace of the values referent.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>optional</b></td>
        <td>boolean</td>
        <td>
          Only relevant if name is set. If an item is not optional, there will be an error thrown when it does not exist<br/>
          <br/>
            <i>Default</i>: true<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#resourcepermittemplatespeccontextresourcesindexselector">selector</a></b></td>
        <td>object</td>
        <td>
          Selector which allows to get any amount of these resources based on labels<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.context.resources[index].selector
<sup><sup>[↩ Parent](#resourcepermittemplatespeccontextresourcesindex)</sup></sup>



Selector which allows to get any amount of these resources based on labels

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermittemplatespeccontextresourcesindexselectormatchexpressionsindex">matchExpressions</a></b></td>
        <td>[]object</td>
        <td>
          matchExpressions is a list of label selector requirements. The requirements are ANDed.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>matchLabels</b></td>
        <td>map[string]string</td>
        <td>
          matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
map is equivalent to an element of matchExpressions, whose key field is "key", the
operator is "In", and the values array contains only "value". The requirements are ANDed.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.spec.context.resources[index].selector.matchExpressions[index]
<sup><sup>[↩ Parent](#resourcepermittemplatespeccontextresourcesindexselector)</sup></sup>



A label selector requirement is a selector that contains values, a key, and an operator that
relates the key and values.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>key</b></td>
        <td>string</td>
        <td>
          key is the label key that the selector applies to.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>operator</b></td>
        <td>string</td>
        <td>
          operator represents a key's relationship to a set of values.
Valid operators are In, NotIn, Exists and DoesNotExist.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>values</b></td>
        <td>[]string</td>
        <td>
          values is an array of string values. If the operator is In or NotIn,
the values array must be non-empty. If the operator is Exists or DoesNotExist,
the values array must be empty. This array is replaced during a strategic
merge patch.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.status
<sup><sup>[↩ Parent](#resourcepermittemplate)</sup></sup>



ResourcePermitTemplateStatus defines the observed state of ResourcePermitTemplate.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#resourcepermittemplatestatusconditionsindex">conditions</a></b></td>
        <td>[]object</td>
        <td>
          Conditions contains the reconciliation conditions for this template.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>observedGeneration</b></td>
        <td>integer</td>
        <td>
          ObservedGeneration is the most recent generation resolved by the controller.<br/>
          <br/>
            <i>Format</i>: int64<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### ResourcePermitTemplate.status.conditions[index]
<sup><sup>[↩ Parent](#resourcepermittemplatestatus)</sup></sup>



Condition contains details for one aspect of the current state of this API Resource.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>lastTransitionTime</b></td>
        <td>string</td>
        <td>
          lastTransitionTime is the last time the condition transitioned from one status to another.
This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.<br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>message</b></td>
        <td>string</td>
        <td>
          message is a human readable message indicating details about the transition.
This may be an empty string.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>reason</b></td>
        <td>string</td>
        <td>
          reason contains a programmatic identifier indicating the reason for the condition's last transition.
Producers of specific condition types may define expected values and meanings for this field,
and whether the values are considered a guaranteed API.
The value should be a CamelCase string.
This field may not be empty.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>status</b></td>
        <td>enum</td>
        <td>
          status of the condition, one of True, False, Unknown.<br/>
          <br/>
            <i>Enum</i>: True, False, Unknown<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>type</b></td>
        <td>string</td>
        <td>
          type of condition in CamelCase or in foo.example.com/CamelCase.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>observedGeneration</b></td>
        <td>integer</td>
        <td>
          observedGeneration represents the .metadata.generation that the condition was set based upon.
For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
with respect to the current state of the instance.<br/>
          <br/>
            <i>Format</i>: int64<br/>
            <i>Minimum</i>: 0<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>

## GlobalResourcePermitTemplate
<sup><sup>[↩ Parent](#addonsprojectcapsuledevv1beta2 )</sup></sup>






GlobalResourcePermitTemplate is the Schema for the globalresourcepermittemplates API.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
      <td><b>apiVersion</b></td>
      <td>string</td>
      <td>addons.projectcapsule.dev/v1beta2</td>
      <td>true</td>
      </tr>
      <tr>
      <td><b>kind</b></td>
      <td>string</td>
      <td>GlobalResourcePermitTemplate</td>
      <td>true</td>
      </tr>
      <tr>
      <td><b><a href="https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.27/#objectmeta-v1-meta">metadata</a></b></td>
      <td>object</td>
      <td>Refer to the Kubernetes API documentation for the fields of the `metadata` field.</td>
      <td>true</td>
      </tr><tr>
        <td><b><a href="#globalresourcepermittemplatespec">spec</a></b></td>
        <td>object</td>
        <td>
          GlobalResourcePermitTemplateSpec defines the desired state of GlobalResourcePermitTemplate.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b><a href="#globalresourcepermittemplatestatus">status</a></b></td>
        <td>object</td>
        <td>
          GlobalResourcePermitTemplateStatus defines the observed state of GlobalResourcePermitTemplate.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec
<sup><sup>[↩ Parent](#globalresourcepermittemplate)</sup></sup>



GlobalResourcePermitTemplateSpec defines the desired state of GlobalResourcePermitTemplate.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#globalresourcepermittemplatespecimpersonation">impersonation</a></b></td>
        <td>object</td>
        <td>
          Impersonation identifies the required ServiceAccount used for context loading
and every managed-resource action, including cleanup. Namespaced templates
use a ServiceAccount in their own namespace; global templates specify both
name and namespace. There is no default execution identity.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b><a href="#globalresourcepermittemplatespecresourcesindex">resources</a></b></td>
        <td>[]object</td>
        <td>
          Resources rendered and managed by this template.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b><a href="#globalresourcepermittemplatespecapprovals">approvals</a></b></td>
        <td>object</td>
        <td>
          Approvals configures automatic and manual approval of requests using this template.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#globalresourcepermittemplatespeccontext">context</a></b></td>
        <td>object</td>
        <td>
          Context loads additional Kubernetes resources for use by all resource targets and templates.
Resource reference fields may use parameters declared by ParamSchema.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>defaultDuration</b></td>
        <td>string</td>
        <td>
          The default duration of the ResourcePermit referencing this template should be valid for. If not set,
the resource will be kept until the request is deleted.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>keepFor</b></td>
        <td>string</td>
        <td>
          The duration of this ResourcePermit will be kept in the system after it has been expired (eg. auditing purposes)
If not set, the ResourcePermit will be deleted after expiring.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>maxDuration</b></td>
        <td>string</td>
        <td>
          The max allowed duration of the ResourcePermit referencing this template should be valid for.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#globalresourcepermittemplatespecnamespaceselectorsindex">namespaceSelectors</a></b></td>
        <td>[]object</td>
        <td>
          NamespaceSelectors limit the namespaces in which ResourcePermits may reference this template.
Selectors are ORed. When omitted, the template is available in every namespace.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>paramSchema</b></td>
        <td>object</td>
        <td>
          ParamSchema is the JSON Schema used to validate template parameters.
Properties may use the x-capsule-form vendor extension to select values
from arbitrary Kubernetes GVKs in compatible form clients. The schema may
use x-kubernetes-validations for Kubernetes-compatible CEL rules.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.impersonation
<sup><sup>[↩ Parent](#globalresourcepermittemplatespec)</sup></sup>



Impersonation identifies the required ServiceAccount used for context loading
and every managed-resource action, including cleanup. Namespaced templates
use a ServiceAccount in their own namespace; global templates specify both
name and namespace. There is no default execution identity.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the referent.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>namespace</b></td>
        <td>string</td>
        <td>
          Namespace of the referent.<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.resources[index]
<sup><sup>[↩ Parent](#globalresourcepermittemplatespec)</sup></sup>





<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#globalresourcepermittemplatespecresourcesindexpolicy">policy</a></b></td>
        <td>object</td>
        <td>
          Policy controls how every target in this resource group is created and managed.<br/>
          <br/>
            <i>Default</i>: map[]<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>targets</b></td>
        <td>[]object</td>
        <td>
          Targets are Kubernetes resource objects to render and manage with Policy.
Parameters and loaded context use the flat template root; trusted request
metadata is available under .request.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>template</b></td>
        <td>string</td>
        <td>
          Template is an optional Go template which may render one or more YAML or
JSON Kubernetes resources separated by YAML document markers. Request
parameters are available under .params and loaded resources under
.context.resources. Trusted request metadata is available under .request
with name, username, groups, and timestamp fields.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.resources[index].policy
<sup><sup>[↩ Parent](#globalresourcepermittemplatespecresourcesindex)</sup></sup>



Policy controls how every target in this resource group is created and managed.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>creation</b></td>
        <td>enum</td>
        <td>
          Creation controls how an existing target is handled. Owner requires the
resource to have been created by the applying controller and otherwise
returns an error. Merge adopts an existing resource when possible and
creates the resource when it does not exist.<br/>
          <br/>
            <i>Enum</i>: Owner, Merge<br/>
            <i>Default</i>: Owner<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>deletion</b></td>
        <td>enum</td>
        <td>
          Deletion controls what happens when the parent stops managing the target.
Remove deletes resources created for the parent and relinquishes adopted
resources. Orphan keeps the resource and removes Capsule's lifecycle
metadata. Removal is the default.<br/>
          <br/>
            <i>Enum</i>: Remove, Orphan<br/>
            <i>Default</i>: Remove<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>force</b></td>
        <td>boolean</td>
        <td>
          Force allows server-side apply to acquire conflicting field ownership.<br/>
          <br/>
            <i>Default</i>: false<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>protect</b></td>
        <td>boolean</td>
        <td>
          Protect prevents users from changing or deleting the target through
admission while it is managed. Protection is enabled by default.<br/>
          <br/>
            <i>Default</i>: true<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.approvals
<sup><sup>[↩ Parent](#globalresourcepermittemplatespec)</sup></sup>



Approvals configures automatic and manual approval of requests using this template.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#globalresourcepermittemplatespecapprovalsapproversindex">approvers</a></b></td>
        <td>[]object</td>
        <td>
          Approvers lists the subjects permitted to approve a request manually.
When omitted, any subject with permission to update the request status may
approve it.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>auto</b></td>
        <td>boolean</td>
        <td>
          Auto automatically approves matching requests. Approvers are ignored for
automatic approvals.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>conditions</b></td>
        <td>[]string</td>
        <td>
          Conditions contains CEL expressions evaluated as an OR list. At least one
expression must evaluate to true. When omitted, approval is unconditional.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.approvals.approvers[index]
<sup><sup>[↩ Parent](#globalresourcepermittemplatespecapprovals)</sup></sup>





<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>kind</b></td>
        <td>enum</td>
        <td>
          Kind of entity. Possible values are "User", "Group", and "ServiceAccount"<br/>
          <br/>
            <i>Enum</i>: User, Group, ServiceAccount<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the entity.<br/>
        </td>
        <td>true</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.context
<sup><sup>[↩ Parent](#globalresourcepermittemplatespec)</sup></sup>



Context loads additional Kubernetes resources for use by all resource targets and templates.
Resource reference fields may use parameters declared by ParamSchema.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#globalresourcepermittemplatespeccontextresourcesindex">resources</a></b></td>
        <td>[]object</td>
        <td>
          <br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.context.resources[index]
<sup><sup>[↩ Parent](#globalresourcepermittemplatespeccontext)</sup></sup>





<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>kind</b></td>
        <td>string</td>
        <td>
          Kind of the referent.

Use "*" to match all kinds.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>apiVersion</b></td>
        <td>string</td>
        <td>
          API version, API group, or API group/version selector of the referent.

Empty APIVersion means the core Kubernetes API version "v1".
Use "*" to explicitly match all API groups and versions.

Examples:
- "" means core "v1".
- "v1" means core "v1".
- "apps" means any version in the "apps" API group.
- "apps/v1" means the "apps/v1" API group/version.
- "apps/*" means any version in the "apps" API group.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>index</b></td>
        <td>string</td>
        <td>
          Index to mount the resource in the template context<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>name</b></td>
        <td>string</td>
        <td>
          Name of the values referent. This is useful
when you traying to get a specific resource<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>namespace</b></td>
        <td>string</td>
        <td>
          Namespace of the values referent.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>optional</b></td>
        <td>boolean</td>
        <td>
          Only relevant if name is set. If an item is not optional, there will be an error thrown when it does not exist<br/>
          <br/>
            <i>Default</i>: true<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b><a href="#globalresourcepermittemplatespeccontextresourcesindexselector">selector</a></b></td>
        <td>object</td>
        <td>
          Selector which allows to get any amount of these resources based on labels<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.context.resources[index].selector
<sup><sup>[↩ Parent](#globalresourcepermittemplatespeccontextresourcesindex)</sup></sup>



Selector which allows to get any amount of these resources based on labels

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#globalresourcepermittemplatespeccontextresourcesindexselectormatchexpressionsindex">matchExpressions</a></b></td>
        <td>[]object</td>
        <td>
          matchExpressions is a list of label selector requirements. The requirements are ANDed.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>matchLabels</b></td>
        <td>map[string]string</td>
        <td>
          matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
map is equivalent to an element of matchExpressions, whose key field is "key", the
operator is "In", and the values array contains only "value". The requirements are ANDed.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.context.resources[index].selector.matchExpressions[index]
<sup><sup>[↩ Parent](#globalresourcepermittemplatespeccontextresourcesindexselector)</sup></sup>



A label selector requirement is a selector that contains values, a key, and an operator that
relates the key and values.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>key</b></td>
        <td>string</td>
        <td>
          key is the label key that the selector applies to.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>operator</b></td>
        <td>string</td>
        <td>
          operator represents a key's relationship to a set of values.
Valid operators are In, NotIn, Exists and DoesNotExist.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>values</b></td>
        <td>[]string</td>
        <td>
          values is an array of string values. If the operator is In or NotIn,
the values array must be non-empty. If the operator is Exists or DoesNotExist,
the values array must be empty. This array is replaced during a strategic
merge patch.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.namespaceSelectors[index]
<sup><sup>[↩ Parent](#globalresourcepermittemplatespec)</sup></sup>



Selector for resources and their labels or selecting origin namespaces

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#globalresourcepermittemplatespecnamespaceselectorsindexmatchexpressionsindex">matchExpressions</a></b></td>
        <td>[]object</td>
        <td>
          matchExpressions is a list of label selector requirements. The requirements are ANDed.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>matchLabels</b></td>
        <td>map[string]string</td>
        <td>
          matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
map is equivalent to an element of matchExpressions, whose key field is "key", the
operator is "In", and the values array contains only "value". The requirements are ANDed.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.spec.namespaceSelectors[index].matchExpressions[index]
<sup><sup>[↩ Parent](#globalresourcepermittemplatespecnamespaceselectorsindex)</sup></sup>



A label selector requirement is a selector that contains values, a key, and an operator that
relates the key and values.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>key</b></td>
        <td>string</td>
        <td>
          key is the label key that the selector applies to.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>operator</b></td>
        <td>string</td>
        <td>
          operator represents a key's relationship to a set of values.
Valid operators are In, NotIn, Exists and DoesNotExist.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>values</b></td>
        <td>[]string</td>
        <td>
          values is an array of string values. If the operator is In or NotIn,
the values array must be non-empty. If the operator is Exists or DoesNotExist,
the values array must be empty. This array is replaced during a strategic
merge patch.<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.status
<sup><sup>[↩ Parent](#globalresourcepermittemplate)</sup></sup>



GlobalResourcePermitTemplateStatus defines the observed state of GlobalResourcePermitTemplate.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b><a href="#globalresourcepermittemplatestatusconditionsindex">conditions</a></b></td>
        <td>[]object</td>
        <td>
          Conditions contains the reconciliation conditions for this template.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>namespaces</b></td>
        <td>[]string</td>
        <td>
          Namespaces contains the namespaces allowed to reference this template.
A single "*" entry means that the template is available in every namespace.<br/>
        </td>
        <td>false</td>
      </tr><tr>
        <td><b>observedGeneration</b></td>
        <td>integer</td>
        <td>
          ObservedGeneration is the most recent generation resolved by the controller.<br/>
          <br/>
            <i>Format</i>: int64<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>


### GlobalResourcePermitTemplate.status.conditions[index]
<sup><sup>[↩ Parent](#globalresourcepermittemplatestatus)</sup></sup>



Condition contains details for one aspect of the current state of this API Resource.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Required</th>
        </tr>
    </thead>
    <tbody><tr>
        <td><b>lastTransitionTime</b></td>
        <td>string</td>
        <td>
          lastTransitionTime is the last time the condition transitioned from one status to another.
This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.<br/>
          <br/>
            <i>Format</i>: date-time<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>message</b></td>
        <td>string</td>
        <td>
          message is a human readable message indicating details about the transition.
This may be an empty string.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>reason</b></td>
        <td>string</td>
        <td>
          reason contains a programmatic identifier indicating the reason for the condition's last transition.
Producers of specific condition types may define expected values and meanings for this field,
and whether the values are considered a guaranteed API.
The value should be a CamelCase string.
This field may not be empty.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>status</b></td>
        <td>enum</td>
        <td>
          status of the condition, one of True, False, Unknown.<br/>
          <br/>
            <i>Enum</i>: True, False, Unknown<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>type</b></td>
        <td>string</td>
        <td>
          type of condition in CamelCase or in foo.example.com/CamelCase.<br/>
        </td>
        <td>true</td>
      </tr><tr>
        <td><b>observedGeneration</b></td>
        <td>integer</td>
        <td>
          observedGeneration represents the .metadata.generation that the condition was set based upon.
For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
with respect to the current state of the instance.<br/>
          <br/>
            <i>Format</i>: int64<br/>
            <i>Minimum</i>: 0<br/>
        </td>
        <td>false</td>
      </tr></tbody>
</table>
