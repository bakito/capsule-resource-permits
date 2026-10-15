// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0
package invalidator

import (
	"context"
	"testing"
	"time"

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
	invalidateObject(clients, &corev1.ServiceAccount{Namespace: "tenant-b", Name: "runner"})
	_, found = clients.Get("tenant-b", "runner")
	require.False(t, found)
}

func TestPeriodicResetAndCancellation(t *testing.T) {
	clients := cache.NewImpersonationCache()
	clients.Set("team-a", "runner", fake.NewClientBuilder().Build())
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- resetPeriodically(ctx, clients, time.Millisecond) }()
	require.Eventually(t, func() bool { _, found := clients.Get("team-a", "runner"); return !found }, time.Second, time.Millisecond)
	cancel()
	select {
	case err := <-done:
		require.NoError(t, err)
	case <-time.After(time.Second):
		t.Fatal("cache invalidation did not stop")
	}
}
