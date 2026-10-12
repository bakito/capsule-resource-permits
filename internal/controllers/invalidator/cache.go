// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package invalidator

import (
	"context"
	"time"

	capsulev1beta2 "github.com/projectcapsule/capsule/api/v1beta2"
	"github.com/projectcapsule/capsule/pkg/runtime/cache"
	"github.com/projectcapsule/capsule/pkg/runtime/configuration"
	"github.com/projectcapsule/capsule/pkg/runtime/predicates"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// Setup retains the shared cache's bounded invalidation and renews execution
// clients when identities or Capsule's impersonation configuration change.
func Setup(_ context.Context, mgr ctrl.Manager, clients *cache.ImpersonationCache, cfg configuration.Configuration, configurationName string) error {
	enqueue := handler.EnqueueRequestsFromMapFunc(func(_ context.Context, obj client.Object) []reconcile.Request {
		invalidateObject(clients, obj)

		return nil
	})
	if err := ctrl.NewControllerManagedBy(mgr).Named("resource-permits/clients").
		Watches(&corev1.ServiceAccount{}, enqueue).
		Watches(&capsulev1beta2.CapsuleConfiguration{}, enqueue, builder.WithPredicates(predicate.GenerationChangedPredicate{}, predicates.NamesMatchingPredicate{Names: []string{configurationName}})).
		Complete(reconcile.Func(func(context.Context, reconcile.Request) (reconcile.Result, error) { return reconcile.Result{}, nil })); err != nil {
		return err
	}

	return mgr.Add(manager.RunnableFunc(func(ctx context.Context) error {
		for {
			duration := cfg.CacheInvalidation().Duration
			if duration <= 0 {
				duration = time.Hour
			}

			timer := time.NewTimer(duration)
			select {
			case <-ctx.Done():
				timer.Stop()

				return nil
			case <-timer.C:
				clients.Reset()
			}
		}
	}))
}

func invalidateObject(clients *cache.ImpersonationCache, obj client.Object) {
	if _, serviceAccount := obj.(*corev1.ServiceAccount); serviceAccount {
		clients.Invalidate(obj.GetNamespace(), obj.GetName())

		return
	}

	clients.Reset()
}
