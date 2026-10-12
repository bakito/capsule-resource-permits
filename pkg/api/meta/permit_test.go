// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0
package meta_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/projectcapsule/resource-permits/pkg/api/meta"
)

func TestResourcePermitFieldOwner(t *testing.T) {
	obj := &corev1.ConfigMap{Name: "request", Namespace: "tenant-a", UID: types.UID("request-uid")}
	require.Equal(t, "projectcapsule.dev/resource/resourcepermit/request-uid", meta.ResourcePermitFieldOwner(obj))
	obj.UID = ""
	owner := meta.ResourcePermitFieldOwner(obj)
	require.Equal(t, owner, meta.ResourcePermitFieldOwner(obj.DeepCopy()))
	require.LessOrEqual(t, len(owner), 128)
	obj.Namespace = "tenant-b"
	require.NotEqual(t, owner, meta.ResourcePermitFieldOwner(obj))
}
