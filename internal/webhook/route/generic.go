// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package route

import (
	"github.com/projectcapsule/capsule/pkg/runtime/handlers"

	"github.com/projectcapsule/resource-permits/internal/webhook/generic"
)

type resourcePermitResourcesHandler struct{}

func GenericResourcePermitHandler() handlers.Webhook {
	return &resourcePermitResourcesHandler{}
}

func (w *resourcePermitResourcesHandler) GetHandlers() []handlers.Handler {
	return []handlers.Handler{
		generic.ResourcePermitResourceHandler(),
	}
}

func (w *resourcePermitResourcesHandler) GetPath() string {
	return "/generic/resourcepermit"
}
