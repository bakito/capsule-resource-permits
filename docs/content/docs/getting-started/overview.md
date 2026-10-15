---
title: Overview
weight: 10
aliases:
  - /docs/guides/
description: How requests, templates, approvals, and managed resources fit together.
---

Resource Permits provides three Kubernetes APIs in `addons.projectcapsule.dev/v1beta2`:

- **ResourcePermit** is a namespaced request referencing a template and parameters.
- **ResourcePermitTemplate** defines a namespaced request template.
- **GlobalResourcePermitTemplate** provides a cluster-scoped template catalog.

Templates describe the resources to manage, execution identity, approval policy,
and lifecycle. The controller and admission webhooks enforce the resulting policy.

The [permit guide]({{< relref "/docs/concepts/overview" >}}) includes a complete first request,
lifecycle diagrams, and the security model.

Start with [installation]({{< relref "installation" >}}), inspect the
[existing examples]({{< relref "/docs/examples" >}}), or browse the
[generated API reference]({{< relref "/docs/reference/api" >}}).
