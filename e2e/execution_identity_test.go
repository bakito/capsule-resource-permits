// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0
package e2e

import (
	"context"
	"fmt"
	"strings"

	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
)

func bindServiceAccountToNamespacedResource(
	saNamespace, saName, targetNamespace string,
	resources, verbs []string,
) {
	ctx := context.Background()

	resourceKey := strings.Join(resources, "-")
	roleName := fmt.Sprintf("sa-%s-%s-%s", saName, resourceKey, targetNamespace)
	roleBindingName := fmt.Sprintf("sa-%s-%s-%s-binding", saName, resourceKey, targetNamespace)

	role := &rbacv1.Role{
		Name:      roleName,
		Namespace: targetNamespace,
		Rules: []rbacv1.PolicyRule{{
			APIGroups: []string{""},
			Resources: resources,
			Verbs:     verbs,
		}},
	}

	roleBinding := &rbacv1.RoleBinding{
		Name:      roleBindingName,
		Namespace: targetNamespace,
		Subjects: []rbacv1.Subject{{
			Kind:      "ServiceAccount",
			Name:      saName,
			Namespace: saNamespace,
		}},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     roleName,
		},
	}

	Eventually(func() error {
		current := &rbacv1.Role{}
		err := k8sClient.Get(ctx, types.NamespacedName{Name: roleName, Namespace: targetNamespace}, current)
		if apierrors.IsNotFound(err) {
			return k8sClient.Create(ctx, role)
		}
		if err != nil {
			return err
		}

		current.Rules = role.Rules
		return k8sClient.Update(ctx, current)
	}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())

	Eventually(func() error {
		current := &rbacv1.RoleBinding{}
		err := k8sClient.Get(ctx, types.NamespacedName{Name: roleBindingName, Namespace: targetNamespace}, current)
		if apierrors.IsNotFound(err) {
			return k8sClient.Create(ctx, roleBinding)
		}
		if err != nil {
			return err
		}

		current.Subjects = roleBinding.Subjects
		current.RoleRef = roleBinding.RoleRef
		return k8sClient.Update(ctx, current)
	}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
}

func ensureServiceAccount(namespace, name string) {
	ctx := context.Background()

	sa := &corev1.ServiceAccount{
		Name:      name,
		Namespace: namespace,
	}

	Eventually(func() error {
		current := &corev1.ServiceAccount{}
		err := k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, current)
		if apierrors.IsNotFound(err) {
			return k8sClient.Create(ctx, sa)
		}
		return err
	}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
}

func serviceAccountUsername(namespace, name string) string {
	return fmt.Sprintf("system:serviceaccount:%s:%s", namespace, name)
}

func serviceAccountGroups(namespace string) []string {
	return []string{
		"system:authenticated",
		"system:serviceaccounts",
		fmt.Sprintf("system:serviceaccounts:%s", namespace),
	}
}

func bindServiceAccountToClusterResources(
	saNamespace, saName, clusterRoleName, clusterRoleBindingName string,
	rules []rbacv1.PolicyRule,
) {
	ctx := context.Background()

	clusterRole := &rbacv1.ClusterRole{
		Name: clusterRoleName,
		Labels: map[string]string{
			"e2e.capsule.dev/test-suite": "true",
		},
		Rules: rules,
	}

	clusterRoleBinding := &rbacv1.ClusterRoleBinding{
		Name: clusterRoleBindingName,
		Subjects: []rbacv1.Subject{{
			Kind:      "ServiceAccount",
			Name:      saName,
			Namespace: saNamespace,
		}},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "ClusterRole",
			Name:     clusterRoleName,
		},
	}

	Eventually(func() error {
		current := &rbacv1.ClusterRole{}
		err := k8sClient.Get(ctx, types.NamespacedName{Name: clusterRoleName}, current)
		if apierrors.IsNotFound(err) {
			return k8sClient.Create(ctx, clusterRole)
		}
		if err != nil {
			return err
		}

		current.Labels = clusterRole.Labels
		current.Rules = clusterRole.Rules

		return k8sClient.Update(ctx, current)
	}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())

	Eventually(func() error {
		current := &rbacv1.ClusterRoleBinding{}
		err := k8sClient.Get(ctx, types.NamespacedName{Name: clusterRoleBindingName}, current)
		if apierrors.IsNotFound(err) {
			return k8sClient.Create(ctx, clusterRoleBinding)
		}
		if err != nil {
			return err
		}

		current.Subjects = clusterRoleBinding.Subjects
		current.RoleRef = clusterRoleBinding.RoleRef

		return k8sClient.Update(ctx, current)
	}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
}
