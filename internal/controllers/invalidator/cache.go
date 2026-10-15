// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package invalidator

import (
	"context"
	"fmt"
	"time"

	"github.com/projectcapsule/capsule/pkg/runtime/cache"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// Setup owns invalidation of this addon's cache, without watching Capsule APIs.
func Setup(mgr ctrl.Manager, clients *cache.ImpersonationCache, interval time.Duration) error {
	if interval <= 0 {
		return fmt.Errorf("client cache invalidation interval must be positive")
	}

	enqueue := handler.EnqueueRequestsFromMapFunc(func(_ context.Context, obj client.Object) []reconcile.Request {
		invalidateObject(clients, obj)

		return nil
	})
	if err := ctrl.NewControllerManagedBy(mgr).Named("resource-permits/clients").
		Watches(&corev1.ServiceAccount{}, enqueue).
		Complete(reconcile.Func(func(context.Context, reconcile.Request) (reconcile.Result, error) { return reconcile.Result{}, nil })); err != nil {
		return err
	}

	return mgr.Add(manager.RunnableFunc(func(ctx context.Context) error {
		return resetPeriodically(ctx, clients, interval)
	}))
}

func resetPeriodically(ctx context.Context, clients *cache.ImpersonationCache, interval time.Duration) error {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			clients.Reset()
		}
	}
}

func invalidateObject(clients *cache.ImpersonationCache, obj client.Object) {
	clients.Invalidate(obj.GetNamespace(), obj.GetName())
}
