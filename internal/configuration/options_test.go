// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package configuration

import (
	"flag"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestOptions(t *testing.T) {
	for _, tt := range []struct {
		name    string
		args    []string
		invalid bool
	}{
		{name: "defaults"},
		{name: "configured", args: []string{"--client-cache-invalidation=10m"}},
		{name: "removed administrator", args: []string{"--administrator=User:alice"}, invalid: true},
		{name: "removed Capsule integration", args: []string{"--capsule-integration"}, invalid: true},
		{name: "removed local default", args: []string{"--default-service-account=runner"}, invalid: true},
		{name: "removed global default", args: []string{"--global-default-service-account=ops/runner"}, invalid: true},
		{name: "zero interval", args: []string{"--client-cache-invalidation=0"}, invalid: true},
		{name: "negative interval", args: []string{"--client-cache-invalidation=-1s"}, invalid: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			options := Options{}
			flags := flag.NewFlagSet("test", flag.ContinueOnError)
			flags.SetOutput(io.Discard)
			options.BindFlags(flags)
			err := flags.Parse(tt.args)
			if err == nil {
				err = options.Validate()
			}
			if tt.invalid {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			if tt.name == "defaults" {
				require.Equal(t, time.Hour, options.CacheInvalidation)
			} else {
				require.Equal(t, 10*time.Minute, options.CacheInvalidation)
			}
		})
	}
}
