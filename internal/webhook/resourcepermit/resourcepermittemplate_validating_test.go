// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"context"
	"net/http"
	"testing"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"

	"github.com/projectcapsule/capsule/pkg/api/meta"
	apiruntime "github.com/projectcapsule/capsule/pkg/api/runtime"

	"github.com/projectcapsule/resource-permits/internal/webhook/test"
	"github.com/projectcapsule/resource-permits/pkg/api/resourcepermit"
)

func TestResourcePermitTemplateValidationHandler(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		template *permitsv1beta2.ResourcePermitTemplate
		expected int32
		message  string
	}{
		{
			name: "valid template",
			template: &permitsv1beta2.ResourcePermitTemplate{Spec: permitsv1beta2.ResourcePermitTemplateSpec{Impersonation: &meta.LocalRFC1123ObjectReference{Name: "runner"},
				Approvals: resourcepermit.ApprovalSpec{Conditions: []string{`requestor.name == "alice"`}},
				Resources: []apiruntime.ResourceTemplate{{Targets: []runtime.RawExtension{{Object: &corev1.ConfigMap{}}}}},
			}},
		},
		{
			name: "invalid condition",
			template: &permitsv1beta2.ResourcePermitTemplate{Spec: permitsv1beta2.ResourcePermitTemplateSpec{Impersonation: &meta.LocalRFC1123ObjectReference{Name: "runner"},
				Approvals: resourcepermit.ApprovalSpec{Conditions: []string{`unknown.name == "alice"`}},
				Resources: []apiruntime.ResourceTemplate{{Targets: []runtime.RawExtension{{Object: &corev1.ConfigMap{}}}}},
			}},
			expected: http.StatusForbidden,
			message:  "approval conditions are invalid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			decoder := &test.Decoder[*permitsv1beta2.ResourcePermitTemplate]{Object: tt.template}
			handler := ResourcePermitTemplateValidationHandler(ctrl.Log.WithName("test"))
			response := handler.OnCreate(nil, nil, decoder, nil)(context.Background(), admission.Request{})
			if tt.expected == 0 {
				assert.Nil(t, response)
				return
			}

			test.VerifyResponse(t, response, tt.expected, tt.message)
		})
	}
}
