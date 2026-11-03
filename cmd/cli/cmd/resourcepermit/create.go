// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"os"

	"github.com/spf13/cobra"
)

var (
	createTemplate     string
	createTemplateKind string
	createParamsFile   string
	createName         string
	createGenerateName string
	createReason       string
	createDuration     string
	createStartTime    string
	createDryRun       bool
	createNamespace    string
)

var createCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new ResourcePermit interactively",
	Long: `Guide you through creating a new ResourcePermit by selecting a template,
configuring setup details, filling in template-specific parameters, and
previewing the generated YAML before creation.

In interactive mode, the wizard walks you through:
  1. Template selection from available ResourcePermitTemplates
  2. Setup: namespace, name, reason, duration, start time
  3. Template parameters based on the selected template's schema
  4. YAML preview before creation

In non-interactive mode, provide --template and any other flags to skip
the interactive prompts.`,
	Example: `
  # Interactive wizard
  kubectl resource-permits create

  # Non-interactive with template and params file
  kubectl resource-permits create --template my-template --params-file params.json

  # Non-interactive with all flags
  kubectl resource-permits create --template my-template --namespace default \
    --name my-permit --reason "Need access for migration" --duration 2h

  # Dry run to preview YAML without creating
  kubectl resource-permits create --template my-template --dry-run`,
	Args: cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		return runCreate(cmd)
	},
}

func runCreate(cmd *cobra.Command) error {
	// Non-interactive mode: --template is provided.
	if createTemplate != "" {
		return runCreateNonInteractive(cmd)
	}

	// Interactive wizard mode.
	return runCreateWizard(cmd)
}

func runCreateNonInteractive(cmd *cobra.Command) error {
	// Use the local --namespace flag if set; otherwise fall back to the
	// persistent -n/--namespace flag from the root command.
	ns := createNamespace
	if ns == "" {
		ns = namespace
	}

	state := &createWizardState{
		templateKind: createTemplateKind,
		templateName: createTemplate,
		namespace:    ns,
		name:         createName,
		generateName: createGenerateName,
		reason:       createReason,
		duration:     createDuration,
		startTime:    createStartTime,
	}

	// Default template kind if not specified.
	if state.templateKind == "" {
		state.templateKind = "GlobalResourcePermitTemplate"
	}

	// Load params from file if provided.
	if createParamsFile != "" {
		data, err := os.ReadFile(createParamsFile)
		if err != nil {
			return err
		}

		var parseErr error

		state.params, parseErr = parseParamsFile(data)
		if parseErr != nil {
			return parseErr
		}
	}

	// Validate and build the ResourcePermit.
	rp, err := buildResourcePermitBody(state)
	if err != nil {
		return err
	}

	// Dry run: just show the YAML.
	if createDryRun {
		cmd.Println(renderResourcePermitYaml(rp))

		return nil
	}

	// Create the ResourcePermit.
	if err := createResourcePermit(rp); err != nil {
		return err
	}

	cmd.Printf("ResourcePermit '%s' created in namespace '%s'\n", rp.Name, rp.Namespace)

	return nil
}

func init() {
	createCmd.Flags().StringVar(&createTemplate, "template", "",
		"Template name (skips interactive wizard if set)")
	createCmd.Flags().StringVar(&createTemplateKind, "template-kind", "",
		"Template kind: ResourcePermitTemplate or GlobalResourcePermitTemplate (default: GlobalResourcePermitTemplate)")
	createCmd.Flags().StringVar(&createParamsFile, "params-file", "",
		"Path to a JSON or YAML file with template parameters")
	createCmd.Flags().StringVar(&createName, "name", "",
		"ResourcePermit name (use either --name or --generate-name)")
	createCmd.Flags().StringVar(&createGenerateName, "generate-name", "",
		"ResourcePermit name prefix (server appends a suffix)")
	createCmd.Flags().StringVar(&createReason, "reason", "",
		"Reason for the request")
	createCmd.Flags().StringVar(&createDuration, "duration", "",
		"Duration the permit is valid for (e.g. 5m, 1h30m)")
	createCmd.Flags().StringVar(&createStartTime, "start-time", "",
		"Start time in RFC3339 format (e.g. 2025-07-15T14:45:00Z)")
	createCmd.Flags().StringVar(&createNamespace, "namespace", "",
		"Target namespace for the ResourcePermit")
	createCmd.Flags().BoolVar(&createDryRun, "dry-run", false,
		"Generate and display the YAML without creating the ResourcePermit")
}
