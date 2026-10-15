// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

// Package configuration owns addon settings, independently of Capsule resources.
package configuration

import (
	"flag"
	"fmt"
	"time"
)

// Options are immutable after startup. Updating Helm values rolls out new pods.
type Options struct {
	CacheInvalidation time.Duration
}

func (o *Options) BindFlags(flags *flag.FlagSet) {
	flags.DurationVar(&o.CacheInvalidation, "client-cache-invalidation", time.Hour, "Maximum interval between impersonation client cache resets")
}

func (o Options) Validate() error {
	if o.CacheInvalidation <= 0 {
		return fmt.Errorf("client-cache-invalidation must be positive")
	}

	return nil
}
