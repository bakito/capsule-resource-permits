---
title: Resource Permits
weight: 1
description: Approval workflows and managed resource lifecycles for Kubernetes platform teams.
---

## What is Resource Permits?

Resource Permits helps platform teams offer services without handling every
request manually or handing out broad administrator access. Teams request a
predefined service, reviewers decide whether to approve it, and Kubernetes
tracks the resources and their lifecycle. Requests can be made through the
Kubernetes API, the kubectl plugin, or Headlamp.

## Part of Project Capsule

Resource Permits is developed under the [Project Capsule](https://projectcapsule.dev/)
umbrella. Capsule is a [CNCF Sandbox project](https://www.cncf.io/projects/capsule/).
Resource Permits works with Capsule or independently on Kubernetes. It reuses
Capsule's shared libraries without requiring its controller or configuration.
Platforms using Capsule can combine permits with their existing tenant policies.
