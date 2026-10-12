// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0
package invalidator

import (
	"testing"

	capsulev1beta2 "github.com/projectcapsule/capsule/api/v1beta2"
	"github.com/projectcapsule/capsule/pkg/runtime/cache"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestInvalidateExecutionIdentity(t *testing.T) {
	clients := cache.NewImpersonationCache()
	runner := fake.NewClientBuilder().WithScheme(runtime.NewScheme()).Build()
	clients.Set("tenant-a", "runner", runner)
	clients.Set("tenant-b", "runner", runner)
	invalidateObject(clients, &corev1.ServiceAccount{Namespace: "tenant-a", Name: "runner"})
	_, found := clients.Get("tenant-a", "runner")
	require.False(t, found)
	other, found := clients.Get("tenant-b", "runner")
	require.True(t, found)
	require.Same(t, runner, other)
	invalidateObject(clients, &capsulev1beta2.CapsuleConfiguration{Name: "default"})
	_, found = clients.Get("tenant-b", "runner")
	require.False(t, found)
}
