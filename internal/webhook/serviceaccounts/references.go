// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package serviceaccounts

import (
	"context"
	"fmt"

	ad "github.com/projectcapsule/capsule/pkg/runtime/admission"
	"github.com/projectcapsule/capsule/pkg/runtime/events"
	"github.com/projectcapsule/capsule/pkg/runtime/handlers"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"
	serviceaccountindexer "github.com/projectcapsule/resource-permits/pkg/runtime/indexers/serviceaccount"
)

// ReferenceProtection prevents deletion of execution identities which are
// still required by an unexpired ResourcePermit.
func ReferenceProtection() handlers.Handler {
	return &referenceProtection{}
}

type referenceProtection struct{}

func (*referenceProtection) OnCreate(
	client.Client,
	client.Reader,
	admission.Decoder,
	events.EventRecorder,
) handlers.Func {
	return allowServiceAccountReferenceOperation
}

func (*referenceProtection) OnUpdate(
	client.Client,
	client.Reader,
	admission.Decoder,
	events.EventRecorder,
) handlers.Func {
	return allowServiceAccountReferenceOperation
}

func (*referenceProtection) OnDelete(
	c client.Client,
	_ client.Reader,
	decoder admission.Decoder,
	_ events.EventRecorder,
) handlers.Func {
	return func(ctx context.Context, req admission.Request) *admission.Response {
		namespace, name := req.Namespace, req.Name
		if namespace == "" || name == "" {
			// DeleteCollection leaves the request name empty, but admission is
			// called for each ServiceAccount with its identity in OldObject.
			serviceAccount := &corev1.ServiceAccount{}
			if err := decoder.DecodeRaw(req.OldObject, serviceAccount); err != nil {
				return handlers.ErroredResponse(fmt.Errorf("decoding ServiceAccount for deletion: %w", err))
			}

			if namespace == "" {
				namespace = serviceAccount.Namespace
			}

			if name == "" {
				name = serviceAccount.Name
			}
		}

		key := serviceaccountindexer.ReferenceKey(namespace, name)
		if key == "" {
			return handlers.ErroredResponse(fmt.Errorf("ServiceAccount deletion request has an empty namespace or name"))
		}

		requests := &permitsv1beta2.ResourcePermitList{}
		if err := c.List(ctx, requests, client.MatchingFields{
			serviceaccountindexer.ReferenceFieldName: key,
		}); err != nil {
			return handlers.ErroredResponse(fmt.Errorf("listing ResourcePermits for ServiceAccount %s: %w", key, err))
		}

		for index := range requests.Items {
			request := &requests.Items[index]
			if request.Status.Phase != permitsv1beta2.ResourcePermitPhaseExpired {
				return ad.Denyf(
					"ServiceAccount %s cannot be deleted because it is used by unexpired ResourcePermit %s/%s",
					key,
					request.Namespace,
					request.Name,
				)
			}
		}

		return nil
	}
}

func allowServiceAccountReferenceOperation(context.Context, admission.Request) *admission.Response {
	return nil
}
