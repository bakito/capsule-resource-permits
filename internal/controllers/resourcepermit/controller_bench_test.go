// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"fmt"
	"testing"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	k8smeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	capsulev1beta2 "github.com/projectcapsule/capsule/api/v1beta2"
	"github.com/projectcapsule/capsule/pkg/api/meta"
	apiruntime "github.com/projectcapsule/capsule/pkg/api/runtime"
	"github.com/projectcapsule/capsule/pkg/runtime/selectors"
	"github.com/projectcapsule/capsule/pkg/runtime/ssa"

	"github.com/projectcapsule/resource-permits/internal/metrics"
	mockclient "github.com/projectcapsule/resource-permits/internal/mocks/client"
	permitapi "github.com/projectcapsule/resource-permits/pkg/api/resourcepermit"
)

func BenchmarkControllerPermitTemplate(b *testing.B) {
	for _, global := range []bool{false, true} {
		for _, count := range []int{1, 32} {
			b.Run(fmt.Sprintf("global=%t/templates=%d/namespaces=%d", global, count, count), func(b *testing.B) {
				obj := newReadinessTemplate(global)
				resources := []apiruntime.ResourceTemplate{}
				for i := range count {
					resources = append(resources, apiruntime.ResourceTemplate{Template: fmt.Sprintf("apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: config-%d\n", i)})
				}
				switch obj := obj.(type) {
				case *permitsv1beta2.ResourcePermitTemplate:
					obj.Spec.Resources = resources
				case *permitsv1beta2.GlobalResourcePermitTemplate:
					obj.Spec.Resources = resources
					obj.Spec.NamespaceSelectors = []selectors.NamespaceSelector{{LabelSelector: &metav1.LabelSelector{MatchLabels: map[string]string{meta.TenantLabel: "tenant-a"}}}}
				}
				objects := []client.Object{
					obj,
					&capsulev1beta2.Tenant{Name: "tenant-a"},
					&capsulev1beta2.Tenant{Name: "tenant-b"},
					&corev1.Namespace{Name: "unrelated", Labels: map[string]string{meta.TenantLabel: "tenant-b"}},
				}
				for i := range count {
					objects = append(objects, &corev1.Namespace{Name: fmt.Sprintf("team-%d", i), Labels: map[string]string{meta.TenantLabel: "tenant-a"}})
				}
				base := permitTemplateTestClient(b, objects...)
				calls := &mockclient.CallCounter{}
				c := interceptor.NewClient(base, calls.Interceptors())
				r, _ := permitTemplateTestReconciler(global, c)
				req := reconcile.Request{NamespacedName: client.ObjectKeyFromObject(obj)}
				if _, err := r.Reconcile(b.Context(), req); err != nil {
					b.Fatal(err)
				}
				if err := base.Get(b.Context(), req.NamespacedName, obj); err != nil {
					b.Fatal(err)
				}
				generation, conditions := readinessTemplateStatus(obj)
				if generation != obj.GetGeneration() || !meta.IsStatusConditionTrue(conditions, meta.ReadyCondition) {
					b.Fatal("template not ready")
				}
				if g, ok := obj.(*permitsv1beta2.GlobalResourcePermitTemplate); ok && len(g.Status.Namespaces) != count {
					b.Fatal("incorrect namespace selection")
				}
				calls.Reset()
				b.ReportAllocs()
				for b.Loop() {
					if _, err := r.Reconcile(b.Context(), req); err != nil {
						b.Fatal(err)
					}
				}
				calls.Report(b)
			})
		}
	}
}

func BenchmarkControllerResourcePermit(b *testing.B) {
	for _, mode := range []string{"preflight", "requested", "active"} {
		for _, count := range []int{1, 32} {
			b.Run(fmt.Sprintf("%s/resources=%d", mode, count), func(b *testing.B) {
				scheme := runtime.NewScheme()
				for _, add := range []func(*runtime.Scheme) error{corev1.AddToScheme, capsulev1beta2.AddToScheme, permitsv1beta2.AddToScheme} {
					if err := add(scheme); err != nil {
						b.Fatal(err)
					}
				}
				template := &permitsv1beta2.ResourcePermitTemplate{Name: "template", Namespace: "team-a"}
				for i := range count {
					template.Spec.Resources = append(template.Spec.Resources, apiruntime.ResourceTemplate{Template: fmt.Sprintf("apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: config-%d\n", i)})
				}
				obj := &permitsv1beta2.ResourcePermit{
					Name:      "permit",
					Namespace: "team-a",
					UID:       "permit-uid",
					Spec: permitsv1beta2.ResourcePermitSpec{
						Requestor: permitapi.AccessEntity{Name: "alice", Type: permitapi.AccessEntityTypeUser},
						Template:  permitsv1beta2.ResourcePermitTemplateReference{Name: template.Name, Kind: permitsv1beta2.ResourcePermitTemplateKind},
					},
				}
				base := fake.NewClientBuilder().WithScheme(scheme).WithObjects(template, obj, &capsulev1beta2.Tenant{Name: "tenant-a"}, &corev1.Namespace{Name: "team-a", Labels: map[string]string{meta.TenantLabel: "tenant-a"}}).WithStatusSubresource(obj).Build()
				calls := &mockclient.CallCounter{}
				c := interceptor.NewClient(base, calls.Interceptors())
				mapper := k8smeta.NewDefaultRESTMapper([]schema.GroupVersion{corev1.SchemeGroupVersion})
				mapper.Add(corev1.SchemeGroupVersion.WithKind("ConfigMap"), k8smeta.RESTScopeNamespace)
				r := &ResourcePermitReconciler{
					Client:    c,
					Log:       logr.Discard(),
					Metrics:   *metrics.NewResourcePermitsRecorder(),
					resources: ssa.Manager{Reader: c, Mapper: mapper},
				}
				req := reconcile.Request{NamespacedName: client.ObjectKeyFromObject(obj)}
				if _, err := r.Reconcile(b.Context(), req); err != nil {
					b.Fatal(err)
				}
				wantPhase := permitsv1beta2.ResourcePermitPhaseRequested
				if mode == "active" {
					if err := base.Get(b.Context(), req.NamespacedName, obj); err != nil {
						b.Fatal(err)
					}
					obj.Finalizers = []string{meta.ControllerFinalizer}
					if err := base.Update(b.Context(), obj); err != nil {
						b.Fatal(err)
					}
					wantPhase = permitsv1beta2.ResourcePermitPhaseActive
					obj.Status.Phase = wantPhase
					if err := base.Status().Update(b.Context(), obj); err != nil {
						b.Fatal(err)
					}
				}
				calls.Reset()
				b.ReportAllocs()
				for b.Loop() {
					if mode == "preflight" {
						b.StopTimer()
						if err := base.Get(b.Context(), req.NamespacedName, obj); err != nil {
							b.Fatal(err)
						}
						obj.Status = permitsv1beta2.ResourcePermitStatus{}
						if err := base.Status().Update(b.Context(), obj); err != nil {
							b.Fatal(err)
						}
						b.StartTimer()
					}
					if _, err := r.Reconcile(b.Context(), req); err != nil {
						b.Fatal(err)
					}
				}
				calls.Report(b)
				if err := base.Get(b.Context(), req.NamespacedName, obj); err != nil {
					b.Fatal(err)
				}
				if obj.Status.Phase != wantPhase || obj.Status.Request == nil || len(obj.Status.Request.Resources) != count {
					b.Fatalf("permit not prepared for review: %#v", obj.Status)
				}
			})
		}
	}
}
