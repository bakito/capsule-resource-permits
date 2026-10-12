// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package serviceaccounts

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"

	admissionv1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"

	capsulev1beta2 "github.com/projectcapsule/capsule/api/v1beta2"
	"github.com/projectcapsule/capsule/pkg/api/meta"

	serviceaccountindexer "github.com/projectcapsule/resource-permits/pkg/runtime/indexers/serviceaccount"
)

func TestReferenceProtectionOnDelete(t *testing.T) {
	t.Parallel()

	reference := &meta.NamespacedRFC1123ObjectReferenceWithNamespace{
		Name:      "runner",
		Namespace: "capsule-system",
	}
	oldServiceAccount, err := json.Marshal(&corev1.ServiceAccount{
		APIVersion: "v1", Kind: "ServiceAccount",
		Name:      "runner",
		Namespace: "capsule-system",
	})
	if err != nil {
		t.Fatal(err)
	}

	deletions := []struct {
		name    string
		request admissionv1.AdmissionRequest
	}{
		{
			name: "individual deletion",
			request: admissionv1.AdmissionRequest{
				Operation: admissionv1.Delete,
				Namespace: "capsule-system",
				Name:      "runner",
			},
		},
		{
			name: "namespace cleanup collection deletion",
			request: admissionv1.AdmissionRequest{
				Operation: admissionv1.Delete,
				Namespace: "capsule-system",
				OldObject: runtime.RawExtension{Raw: oldServiceAccount},
			},
		},
		{
			name: "namespace from old object",
			request: admissionv1.AdmissionRequest{
				Operation: admissionv1.Delete,
				Name:      "runner",
				OldObject: runtime.RawExtension{Raw: oldServiceAccount},
			},
		},
		{
			name: "identity from old object",
			request: admissionv1.AdmissionRequest{
				Operation: admissionv1.Delete,
				OldObject: runtime.RawExtension{Raw: oldServiceAccount},
			},
		},
	}

	tests := []struct {
		name       string
		objects    []client.Object
		wantDenied string
	}{
		{name: "allows an unreferenced ServiceAccount"},
		{
			name: "denies an unexpired ResourcePermit reference",
			objects: []client.Object{&permitsv1beta2.ResourcePermit{
				Name: "temporary-access", Namespace: "team-a",
				Status: permitsv1beta2.ResourcePermitStatus{
					Phase: permitsv1beta2.ResourcePermitPhaseActive,
					Request: &permitsv1beta2.ResourcePermitStatusRequest{
						Impersonation: reference.DeepCopy(),
					},
				},
			}},
			wantDenied: "unexpired ResourcePermit team-a/temporary-access",
		},
		{
			name: "allows an expired ResourcePermit reference",
			objects: []client.Object{&permitsv1beta2.ResourcePermit{
				Name: "expired-access", Namespace: "team-a",
				Status: permitsv1beta2.ResourcePermitStatus{
					Phase: permitsv1beta2.ResourcePermitPhaseExpired,
					Request: &permitsv1beta2.ResourcePermitStatusRequest{
						Impersonation: reference.DeepCopy(),
					},
				},
			}},
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			for _, deletion := range deletions {
				t.Run(deletion.name, func(t *testing.T) {
					cl := referenceProtectionFakeClient(t, testCase.objects...)
					handler := ReferenceProtection()
					response := handler.OnDelete(cl, cl, admission.NewDecoder(cl.Scheme()), nil)(context.Background(), admission.Request{
						AdmissionRequest: deletion.request,
					})

					if testCase.wantDenied == "" {
						if response != nil {
							t.Fatalf("OnDelete() = %#v, want allowed", response)
						}

						return
					}

					if response == nil || response.Allowed {
						t.Fatalf("OnDelete() = %#v, want denial", response)
					}
					if response.Result == nil || !strings.Contains(response.Result.Message, testCase.wantDenied) {
						t.Fatalf("OnDelete() message = %#v, want containing %q", response.Result, testCase.wantDenied)
					}
				})
			}
		})
	}
}

func TestReferenceProtectionOnDeleteInvalidIdentity(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		oldObject  []byte
		wantDenied string
	}{
		{
			name:       "missing old object",
			wantDenied: "decoding ServiceAccount for deletion",
		},
		{
			name:       "malformed old object",
			oldObject:  []byte(`{`),
			wantDenied: "decoding ServiceAccount for deletion",
		},
		{
			name:       "missing name",
			oldObject:  []byte(`{"apiVersion":"v1","kind":"ServiceAccount","metadata":{"namespace":"capsule-system"}}`),
			wantDenied: "empty namespace or name",
		},
		{
			name:       "missing namespace",
			oldObject:  []byte(`{"apiVersion":"v1","kind":"ServiceAccount","metadata":{"name":"runner"}}`),
			wantDenied: "empty namespace or name",
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			cl := referenceProtectionFakeClient(t)
			response := ReferenceProtection().OnDelete(cl, cl, admission.NewDecoder(cl.Scheme()), nil)(context.Background(), admission.Request{
				Operation: admissionv1.Delete,
				OldObject: runtime.RawExtension{Raw: testCase.oldObject},
			})
			if response == nil || response.Allowed {
				t.Fatalf("OnDelete() = %#v, want denial", response)
			}
			if response.Result == nil || !strings.Contains(response.Result.Message, testCase.wantDenied) {
				t.Fatalf("OnDelete() message = %#v, want containing %q", response.Result, testCase.wantDenied)
			}
		})
	}
}

func referenceProtectionFakeClient(t testing.TB, objects ...client.Object) client.Client {
	t.Helper()

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	if err := capsulev1beta2.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	if err := permitsv1beta2.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}

	resourcePermitIndexer := serviceaccountindexer.ResourcePermitReference{}

	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(objects...).
		WithIndex(resourcePermitIndexer.Object(), resourcePermitIndexer.Field(), resourcePermitIndexer.Func()).
		Build()
}
