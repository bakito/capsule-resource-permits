// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

// Package v1beta2 contains API Schema definitions for the Resource Permits v1beta2 API group
// +kubebuilder:object:generate=true
// +groupName=addons.projectcapsule.dev
package v1beta2

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var (
	// GroupVersion is group version used to register these objects.
	GroupVersion = schema.GroupVersion{Group: "addons.projectcapsule.dev", Version: "v1beta2"}

	// SchemeBuilder is used to add go types to the GroupVersionKind scheme.
	SchemeBuilder = runtime.NewSchemeBuilder(addKnownTypes)

	// AddToScheme adds the types in this group-version to the given scheme.
	AddToScheme = SchemeBuilder.AddToScheme
)

func addKnownTypes(scheme *runtime.Scheme) error {
	scheme.AddKnownTypes(GroupVersion, &ResourcePermit{}, &ResourcePermitList{}, &ResourcePermitTemplate{}, &ResourcePermitTemplateList{}, &GlobalResourcePermitTemplate{}, &GlobalResourcePermitTemplateList{})
	metav1.AddToGroupVersion(scheme, GroupVersion)

	return nil
}
