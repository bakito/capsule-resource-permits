// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-logr/logr"
	"github.com/projectcapsule/capsule/pkg/api/meta"
	apiruntime "github.com/projectcapsule/capsule/pkg/api/runtime"
	cache "github.com/projectcapsule/capsule/pkg/runtime/cache"
	"github.com/projectcapsule/capsule/pkg/runtime/configuration"
	"github.com/projectcapsule/capsule/pkg/runtime/ssa"
	tpl "github.com/projectcapsule/capsule/pkg/template"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	k8smeta "k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"
)

func TestResolveTemplateServiceAccount(t *testing.T) {
	t.Parallel()

	r := &ResourcePermitReconciler{}

	explicit := &meta.NamespacedRFC1123ObjectReferenceWithNamespace{
		Name:      "template",
		Namespace: "template-ns",
	}
	brt := &permitsv1beta2.GlobalResourcePermitTemplate{
		Spec: permitsv1beta2.GlobalResourcePermitTemplateSpec{Impersonation: explicit},
	}

	got := r.resolveTemplateServiceAccount(logr.Discard(), brt)
	if got == nil || got.Name != explicit.Name || got.Namespace != explicit.Namespace {
		t.Fatalf("explicit template ServiceAccount = %#v, want %#v", got, explicit)
	}
	if got == explicit {
		t.Fatal("resolved explicit ServiceAccount aliases the template spec")
	}

	brt.Spec.Impersonation = nil
	require.Nil(t, r.resolveTemplateServiceAccount(logr.Discard(), brt))
}

func TestResolveTemplateServiceAccountWithoutDefault(t *testing.T) {
	t.Parallel()
	r := &ResourcePermitReconciler{}
	if got := r.resolveTemplateServiceAccount(logr.Discard(), &permitsv1beta2.GlobalResourcePermitTemplate{}); got != nil {
		t.Fatalf("default = %#v, want nil", got)
	}
}

func TestResolveNamespacedTemplateServiceAccount(t *testing.T) {
	t.Parallel()

	r := &ResourcePermitReconciler{}
	brt := &permitsv1beta2.ResourcePermitTemplate{
		Namespace: "team-a",
		Spec: permitsv1beta2.ResourcePermitTemplateSpec{
			Impersonation: &meta.LocalRFC1123ObjectReference{Name: "template-runner"},
		},
	}

	got := r.resolveTemplateServiceAccount(logr.Discard(), brt)
	if got == nil || got.Name != "template-runner" || got.Namespace != "team-a" {
		t.Fatalf("explicit namespaced ServiceAccount = %#v, want team-a/template-runner", got)
	}

	brt.Spec.Impersonation = nil
	require.Nil(t, r.resolveTemplateServiceAccount(logr.Discard(), brt))
}

func TestResourceClientPinsTemplateIdentity(t *testing.T) {
	t.Parallel()

	base := fake.NewClientBuilder().Build()
	impersonated := fake.NewClientBuilder().Build()
	clients := cache.NewImpersonationCache()
	clients.Set("template-ns", "template", impersonated)

	r := &ResourcePermitReconciler{
		Client:             base,
		ImpersonationCache: clients,
	}
	br := &permitsv1beta2.ResourcePermit{}
	brt := &permitsv1beta2.GlobalResourcePermitTemplate{
		Spec: permitsv1beta2.GlobalResourcePermitTemplateSpec{
			Impersonation: &meta.NamespacedRFC1123ObjectReferenceWithNamespace{
				Name:      "template",
				Namespace: "template-ns",
			},
		},
	}

	got, err := r.resourceClient(context.Background(), logr.Discard(), br, brt)
	if err != nil {
		t.Fatalf("resourceClient() error = %v", err)
	}
	if got != impersonated {
		t.Fatalf("resourceClient() = %T, want cached impersonated client", got)
	}
	if br.Status.Request.Impersonation == nil || br.Status.Request.Impersonation.Name != "template" ||
		br.Status.Request.Impersonation.Namespace != "template-ns" {
		t.Fatalf("pinned ServiceAccount = %#v", br.Status.Request.Impersonation)
	}

	// A request keeps using its initially resolved identity even if its template
	// is changed while the request is active.
	brt.Spec.Impersonation = &meta.NamespacedRFC1123ObjectReferenceWithNamespace{
		Name:      "changed",
		Namespace: "changed-ns",
	}
	got, err = r.resourceClient(context.Background(), logr.Discard(), br, brt)
	if err != nil {
		t.Fatalf("resourceClient() with pinned identity error = %v", err)
	}
	if got != impersonated {
		t.Fatal("resourceClient() did not retain the pinned impersonated client")
	}
}

func TestResourceClientRequiresExplicitIdentity(t *testing.T) {
	t.Setenv(configuration.EnvironmentServiceaccountName, "controller")
	t.Setenv(configuration.EnvironmentControllerNamespace, "operations")
	base := fake.NewClientBuilder().Build()
	r := &ResourcePermitReconciler{Client: base}
	for _, template := range []permitsv1beta2.ResourcePermitTemplateSource{
		nil,
		&permitsv1beta2.GlobalResourcePermitTemplate{},
		&permitsv1beta2.ResourcePermitTemplate{Namespace: "team-a"},
		&permitsv1beta2.GlobalResourcePermitTemplate{Spec: permitsv1beta2.GlobalResourcePermitTemplateSpec{Impersonation: &meta.NamespacedRFC1123ObjectReferenceWithNamespace{Name: "runner"}}},
		&permitsv1beta2.ResourcePermitTemplate{Namespace: "team-a", Spec: permitsv1beta2.ResourcePermitTemplateSpec{Impersonation: &meta.LocalRFC1123ObjectReference{}}},
	} {
		br := &permitsv1beta2.ResourcePermit{}
		got, err := r.resourceClient(t.Context(), logr.Discard(), br, template)
		require.ErrorContains(t, err, "must specify a ServiceAccount")
		require.Nil(t, got)
		require.Nil(t, br.Status.Request.Impersonation)
	}

	// Explicit use of the controller identity remains possible.
	template := &permitsv1beta2.GlobalResourcePermitTemplate{Spec: permitsv1beta2.GlobalResourcePermitTemplateSpec{
		Impersonation: &meta.NamespacedRFC1123ObjectReferenceWithNamespace{Name: "controller", Namespace: "operations"},
	}}
	br := &permitsv1beta2.ResourcePermit{}
	got, err := r.resourceClient(t.Context(), logr.Discard(), br, template)
	require.NoError(t, err)
	require.Same(t, base, got)
	require.Equal(t, template.Spec.Impersonation, br.Status.Request.Impersonation)
	require.NotSame(t, template.Spec.Impersonation, br.Status.Request.Impersonation)

	// A prepared permit retains its recorded executor even after its template disappears.
	got, err = r.resourceClient(t.Context(), logr.Discard(), br, nil)
	require.NoError(t, err)
	require.Same(t, base, got)
	br.Status.Request.Impersonation.Namespace = ""
	got, err = r.resourceClient(t.Context(), logr.Discard(), br, nil)
	require.ErrorContains(t, err, "recorded execution ServiceAccount")
	require.Nil(t, got)
}

func TestTemplateContextUsesImpersonatedClient(t *testing.T) {
	t.Parallel()

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}

	base := fake.NewClientBuilder().WithScheme(scheme).Build()
	impersonated := fake.NewClientBuilder().WithScheme(scheme).WithObjects(&corev1.ConfigMap{
		Name: "source", Namespace: "team-a",
		Data: map[string]string{"value": "loaded-with-template-client"},
	}).Build()
	clients := cache.NewImpersonationCache()
	clients.Set("operations", "template-runner", impersonated)

	mapper := k8smeta.NewDefaultRESTMapper([]schema.GroupVersion{corev1.SchemeGroupVersion})
	mapper.Add(corev1.SchemeGroupVersion.WithKind("ConfigMap"), k8smeta.RESTScopeNamespace)

	r := &ResourcePermitReconciler{
		Client:             base,
		ImpersonationCache: clients,
		resources:          ssa.Manager{Mapper: mapper},
	}
	br := &permitsv1beta2.ResourcePermit{
		Name: "request", Namespace: "team-a",
	}
	brt := &permitsv1beta2.GlobalResourcePermitTemplate{
		Spec: permitsv1beta2.GlobalResourcePermitTemplateSpec{
			Impersonation: &meta.NamespacedRFC1123ObjectReferenceWithNamespace{
				Name:      "template-runner",
				Namespace: "operations",
			},
			Context: &tpl.TemplateContext{Resources: []*tpl.TemplateResourceReference{{
				APIVersion: "v1", Kind: "ConfigMap",
				Name:  "source",
				Index: "settings",
			}}},
			Resources: []apiruntime.ResourceTemplate{{
				Targets: []runtime.RawExtension{{Raw: []byte(
					`{"apiVersion":"v1","kind":"ConfigMap","metadata":{"name":"rendered"},"data":{"value":"{{ (index .settings 0).data.value }}"}}`,
				)}},
			}},
		},
	}

	resourceClient, err := r.resourceClient(context.Background(), logr.Discard(), br, brt)
	if err != nil {
		t.Fatalf("resourceClient() error = %v", err)
	}
	if err := r.renderResources(context.Background(), br, brt, resourceClient); err != nil {
		t.Fatalf("renderResources() error = %v", err)
	}

	if br.Status.Request == nil ||
		len(br.Status.Request.Resources) != 1 ||
		len(br.Status.Request.Resources[0].Targets) != 1 {
		t.Fatalf("rendered resources = %#v", br.Status.Request)
	}
	obj, err := object(br.Status.Request.Resources[0].Targets[0])
	if err != nil {
		t.Fatalf("decoding rendered target: %v", err)
	}
	data, found, err := unstructured.NestedStringMap(obj.Object, "data")
	if err != nil || !found || data["value"] != "loaded-with-template-client" {
		t.Fatalf("rendered data = %#v, found=%v, error=%v", data, found, err)
	}
}

func TestResourceClientUsesControllerTransportAndIndependentCache(t *testing.T) {
	usernames := make(chan string, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch req.URL.Path {
		case "/api":
			fmt.Fprint(w, `{"kind":"APIVersions","apiVersion":"v1","versions":["v1"]}`)
		case "/apis":
			fmt.Fprint(w, `{"kind":"APIGroupList","apiVersion":"v1","groups":[]}`)
		case "/api/v1":
			fmt.Fprint(w, `{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"v1","resources":[{"name":"configmaps","namespaced":true,"kind":"ConfigMap","verbs":["get"]}]}`)
		case "/api/v1/namespaces/team-a/configmaps/test":
			usernames <- req.Header.Get("Impersonate-User")
			fmt.Fprint(w, `{"kind":"ConfigMap","apiVersion":"v1","metadata":{"namespace":"team-a","name":"test"}}`)
		default:
			http.Error(w, "unexpected API request", http.StatusNotFound)
		}
	}))
	defer server.Close()
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	config := &rest.Config{Host: server.URL, QPS: 50, Burst: 100, Impersonate: rest.ImpersonationConfig{UserName: "original"}}
	r := &ResourcePermitReconciler{Client: fake.NewClientBuilder().WithScheme(scheme).Build(), RESTConfig: config, ImpersonationCache: cache.NewImpersonationCache()}
	template := &permitsv1beta2.GlobalResourcePermitTemplate{Spec: permitsv1beta2.GlobalResourcePermitTemplateSpec{Impersonation: &meta.NamespacedRFC1123ObjectReferenceWithNamespace{Name: "runner", Namespace: "team-a"}}}
	request := &permitsv1beta2.ResourcePermit{}
	first, err := r.resourceClient(context.Background(), logr.Discard(), request, template)
	require.NoError(t, err)
	require.NoError(t, first.Get(context.Background(), client.ObjectKey{Namespace: "team-a", Name: "test"}, &corev1.ConfigMap{}))
	second, err := r.resourceClient(context.Background(), logr.Discard(), request, template)
	require.NoError(t, err)
	require.Same(t, first, second)
	require.Equal(t, "original", config.Impersonate.UserName, "base transport identity must not be changed")
	require.Equal(t, "system:serviceaccount:team-a:runner", <-usernames)
	other := cache.NewImpersonationCache()
	_, found := other.Get("team-a", "runner")
	require.False(t, found, "addon instances must not share cache state")
	r.ImpersonationCache.Invalidate("team-a", "runner")
	third, err := r.resourceClient(context.Background(), logr.Discard(), request, template)
	require.NoError(t, err)
	require.NotSame(t, first, third)
}

func TestResourceClientMissingRESTConfiguration(t *testing.T) {
	r := &ResourcePermitReconciler{Client: fake.NewClientBuilder().Build(), ImpersonationCache: cache.NewImpersonationCache()}
	request := &permitsv1beta2.ResourcePermit{Status: permitsv1beta2.ResourcePermitStatus{Request: &permitsv1beta2.ResourcePermitStatusRequest{Impersonation: &meta.NamespacedRFC1123ObjectReferenceWithNamespace{Name: "runner", Namespace: "team-a"}}}}
	_, err := r.resourceClient(context.Background(), logr.Discard(), request, nil)
	require.ErrorContains(t, err, "impersonation REST configuration is not configured")
}
