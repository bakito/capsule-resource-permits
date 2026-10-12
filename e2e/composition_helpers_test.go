// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0
package e2e

import (
	"context"
	"time"

	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

var resyncPeriod = metav1.Duration{Duration: 5 * time.Second}

func expectConfigMapData(namespace, name string, expected map[string]string) {
	Eventually(func(g Gomega) {
		cm := &corev1.ConfigMap{}
		g.Expect(k8sClient.Get(context.Background(), types.NamespacedName{Name: name, Namespace: namespace}, cm)).To(
			Succeed(),
			"expected ConfigMap %s/%s",
			namespace,
			name,
		)
		for k, v := range expected {
			g.Expect(cm.Data).To(HaveKeyWithValue(k, v))
		}
	}, defaultTimeoutInterval, defaultPollInterval).Should(Succeed())
}

func expectConfigMapAbsent(namespace, name string) {
	Consistently(func() error {
		return k8sClient.Get(context.Background(), types.NamespacedName{
			Name:      name,
			Namespace: namespace,
		}, &corev1.ConfigMap{})
	}, 5*time.Second, defaultPollInterval).Should(HaveOccurred())
}
