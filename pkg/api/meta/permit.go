// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package meta

import (
	"hash/fnv"
	"strconv"

	coremeta "github.com/projectcapsule/capsule/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	ValueControllerResourcePermit          = "resource-permit"
	ValueAppResourcePermitManager          = "resource-permit-controller"
	ResourcePermitActiveUntilAnnotation    = "projectcapsule.dev/active-until"
	ResourcePermitServiceAccountAnnotation = "projectcapsule.dev/resourcepermit-service-account"
	ResourcePermitProtectionLabel          = coremeta.ProtectionLabelPrefix + "resource-permit"
)

// ResourcePermitFieldOwner returns a stable field manager for a ResourcePermit.
func ResourcePermitFieldOwner(obj metav1.Object) string {
	identity := string(obj.GetUID())
	if identity == "" {
		hash := fnv.New64a()
		_, _ = hash.Write([]byte(obj.GetNamespace()))
		_, _ = hash.Write([]byte{0})
		_, _ = hash.Write([]byte(obj.GetName()))
		identity = strconv.FormatUint(hash.Sum64(), 36)
	}

	return coremeta.ResourceFieldOwner("resourcepermit/" + identity)
}
