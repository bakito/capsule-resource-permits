// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package e2e

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/projectcapsule/capsule/pkg/api/meta"
	admissionv1 "k8s.io/api/admissionregistration/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	permitmeta "github.com/projectcapsule/resource-permits/pkg/api/meta"
)

var _ = Describe("ResourcePermit admission namespace selection", Serial, Label("config", "resource-permit", "admission-selection"), func() {
	It("protects tenant namespaces and accepts an explicit non-tenant namespace selection", func() {
		ctx := context.Background()
		tenantNamespace := createResourcePermitTenantNamespace(ctx)
		otherNamespace := createResourcePermitTestNamespace(ctx)
		owner := impersonationClient(tenantNamespace.Name+"-owner", withDefaultGroups(nil))
		controller := impersonationClient(ControllerServiceAccountFull, nil)
		targets := []*corev1.ConfigMap{}
		for _, namespace := range []string{tenantNamespace.Name, otherNamespace.Name} {
			target := &corev1.ConfigMap{
				Name: "selected-protection", Namespace: namespace,
				Labels: map[string]string{permitmeta.ResourcePermitProtectionLabel: meta.ValueTrue},
				Data:   map[string]string{"value": "original"},
			}
			Expect(controller.Create(ctx, target)).To(Succeed())
			targets = append(targets, target)
		}

		key := client.ObjectKey{Name: "resource-permits-validating"}
		configuration := &admissionv1.ValidatingWebhookConfiguration{}
		Expect(k8sClient.Get(ctx, key, configuration)).To(Succeed())
		original := configuration.DeepCopy()
		apply := func(selector *metav1.LabelSelector) {
			Eventually(func() error {
				current := &admissionv1.ValidatingWebhookConfiguration{}
				if err := k8sClient.Get(ctx, key, current); err != nil {
					return err
				}
				for i := range current.Webhooks {
					if current.Webhooks[i].Name == "protection.validating.addons.projectcapsule.dev" {
						current.Webhooks[i].NamespaceSelector = selector.DeepCopy()
					}
				}
				return k8sClient.Update(ctx, current)
			}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
		}
		for _, hook := range original.Webhooks {
			if hook.Name == "protection.validating.addons.projectcapsule.dev" {
				DeferCleanup(func() { apply(hook.NamespaceSelector) })
			}
		}

		patch := func(actor client.Client, target *corev1.ConfigMap, value string, dryRun bool) error {
			current := &corev1.ConfigMap{}
			if err := actor.Get(ctx, client.ObjectKeyFromObject(target), current); err != nil {
				return err
			}
			before := current.DeepCopy()
			current.Data["value"] = value
			options := []client.PatchOption{}
			if dryRun {
				options = append(options, client.DryRunAll)
			}
			return actor.Patch(ctx, current, client.MergeFromWithOptions(before, client.MergeFromWithOptimisticLock{}), options...)
		}
		denied := func(actor client.Client, target *corev1.ConfigMap) {
			// Admission configuration is propagated asynchronously. Probe without
			// persisting until the API server observes the new selector.
			Eventually(func(g Gomega) {
				err := patch(actor, target, "unauthorized", true)
				g.Expect(apierrors.IsForbidden(err)).To(BeTrue())
				g.Expect(err).To(MatchError(ContainSubstring("resources protected by a ResourcePermit")))
			}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
			Eventually(func(g Gomega) {
				err := patch(actor, target, "unauthorized", false)
				if err == nil {
					StopTrying("protected write unexpectedly succeeded").Now()
				}
				g.Expect(apierrors.IsForbidden(err)).To(BeTrue())
				g.Expect(err).To(MatchError(ContainSubstring("resources protected by a ResourcePermit")))
			}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
			current := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, client.ObjectKeyFromObject(target), current)).To(Succeed())
			Expect(current.Data["value"]).NotTo(Equal("unauthorized"))
		}
		allowed := func(actor client.Client, target *corev1.ConfigMap, value string) {
			Eventually(func() error { return patch(actor, target, value, false) }, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
			Eventually(func(g Gomega) {
				current := &corev1.ConfigMap{}
				g.Expect(k8sClient.Get(ctx, client.ObjectKeyFromObject(target), current)).To(Succeed())
				g.Expect(current.Data["value"]).To(Equal(value))
			}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
		}

		By("using the chart's default tenant-label expression")
		apply(&metav1.LabelSelector{MatchExpressions: []metav1.LabelSelectorRequirement{{Key: meta.TenantLabel, Operator: metav1.LabelSelectorOpExists}}})
		denied(owner, targets[0])
		allowed(k8sClient, targets[1], "outside-tenant-selection")

		By("replacing the expression to protect a non-tenant namespace")
		apply(&metav1.LabelSelector{MatchLabels: map[string]string{"kubernetes.io/metadata.name": otherNamespace.Name}})
		denied(k8sClient, targets[1])
		allowed(owner, targets[0], "outside-custom-selection")
	})
})
