// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0
package v1beta2

import (
	"testing"

	capsulev1beta2 "github.com/projectcapsule/capsule/api/v1beta2"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/runtime"
)

func TestAddonAPIGroup(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, capsulev1beta2.AddToScheme(scheme))
	require.NoError(t, AddToScheme(scheme))
	require.Equal(t, "addons.projectcapsule.dev", GroupVersion.Group)
	for _, kind := range []string{"ResourcePermit", "ResourcePermitTemplate", "GlobalResourcePermitTemplate"} {
		obj, err := scheme.New(GroupVersion.WithKind(kind))
		require.NoError(t, err)
		require.NotNil(t, obj)
		_, err = scheme.New(capsulev1beta2.GroupVersion.WithKind(kind))
		require.Error(t, err)
	}
	_, err := scheme.New(capsulev1beta2.GroupVersion.WithKind("Tenant"))
	require.NoError(t, err)
}
