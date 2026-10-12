// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package cmd

import (
	"fmt"
	"os"

	"github.com/projectcapsule/resource-permits/cmd/cli/cmd/resourcepermit"
	capsuleversion "github.com/projectcapsule/resource-permits/internal/version"
)

var rootCmd = resourcepermit.RootCmd

func init() {
	rootCmd.Use = "resource-permits"
	rootCmd.Version = fmt.Sprintf("%s %s%s", capsuleversion.GitTag, capsuleversion.GitCommit, capsuleversion.GitDirty)
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		//nolint:forbidigo // no other option here
		fmt.Println(err)
		os.Exit(1)
	}
}
