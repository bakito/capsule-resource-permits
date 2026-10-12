// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0
package metrics

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
)

func assertGauge(t *testing.T, gauge interface {
	GetMetricWithLabelValues(...string) (prometheus.Gauge, error)
}, want float64, labels ...string) {
	t.Helper()

	metric, err := gauge.GetMetricWithLabelValues(labels...)
	if err != nil {
		t.Fatal(err)
	}
	value := &dto.Metric{}
	if err := metric.Write(value); err != nil {
		t.Fatal(err)
	}
	if got := value.GetGauge().GetValue(); got != want {
		t.Fatalf("metric %v = %v, want %v", labels, got, want)
	}
}

func metricCount(collector prometheus.Collector) int {
	metrics := make(chan prometheus.Metric, 32)
	collector.Collect(metrics)
	close(metrics)

	count := 0
	for range metrics {
		count++
	}

	return count
}
