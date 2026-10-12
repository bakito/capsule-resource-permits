// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"github.com/spf13/cobra"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"
)

var retryCmd = &cobra.Command{
	Use:   "retry",
	Short: "retry a failed ResourcePermit",
	Args:  cobra.ExactArgs(1),
	Example: `
  # retry a failed ResourcePermit after fixing its execution identity or permissions
  kubectl resource-permits retry grant-admin --namespace default
`,
	RunE: func(cmd *cobra.Command, args []string) error {
		name = args[0]

		return runResourcePermitAction(permitsv1beta2.ResourcePermitPhaseRetrying)
	},
}
