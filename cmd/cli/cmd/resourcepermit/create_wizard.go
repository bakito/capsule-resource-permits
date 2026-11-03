// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/jedib0t/go-pretty/v6/table"
	"github.com/spf13/cobra"
	"github.com/xhit/go-str2duration/v2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"
)

const (
	tagsAnnotation        = "info.projectcapsule.dev/tags"
	descriptionAnnotation = "info.projectcapsule.dev/description"
)

// createWizardState holds the wizard state across all interactive steps.
type createWizardState struct {
	templateKind string
	templateName string
	templateNs   string
	paramSchema  *k8sruntime.RawExtension
	namespace    string
	name         string
	generateName string
	reason       string
	duration     string
	startTime    string
	params       map[string]any
}

// runCreateWizard drives the interactive wizard flow using the TUI.
func runCreateWizard(cmd *cobra.Command) error {
	_, k8sClient, err := newK8sClient()
	if err != nil {
		return err
	}

	ctx := context.Background()

	// List available templates.
	templates, err := listTemplates(ctx, k8sClient)
	if err != nil {
		return err
	}

	if len(templates) == 0 {
		return fmt.Errorf("no templates available")
	}

	// Run the interactive TUI wizard.
	state, err := runCreateWizardTUI(templates)
	if err != nil {
		return err
	}

	// Fetch the paramSchema for the selected template.
	state.paramSchema, err = fetchTemplateParamSchema(ctx, k8sClient, state)
	if err != nil {
		return err
	}

	// If the TUI didn't collect params (no schema at TUI time), collect them now.
	if state.paramSchema != nil && len(state.paramSchema.Raw) > 0 && state.params == nil {
		// Re-run the TUI with schema-aware param collection.
		// For now, fall back to the original prompt-based approach for params.
		if err := promptParams(cmd, state); err != nil {
			return err
		}
	}

	// Build and preview the ResourcePermit.
	rp, err := buildResourcePermitBody(state)
	if err != nil {
		return err
	}

	if err := previewYaml(cmd, rp); err != nil {
		return err
	}

	// Create the ResourcePermit.
	if err := createResourcePermit(rp); err != nil {
		return err
	}

	cmd.Printf("ResourcePermit '%s' created in namespace '%s'\n", rp.Name, rp.Namespace)

	return nil
}

// fetchTemplateParamSchema retrieves the paramSchema for the selected template.
func fetchTemplateParamSchema(ctx context.Context, k8sClient ctrlclient.Client, state *createWizardState) (*k8sruntime.RawExtension, error) {
	if state.templateKind == "ResourcePermitTemplate" {
		tpl := &permitsv1beta2.ResourcePermitTemplate{}

		if err := k8sClient.Get(ctx, ctrlclient.ObjectKey{Name: state.templateName, Namespace: state.templateNs}, tpl); err != nil {
			return nil, fmt.Errorf("failed to get template: %w", err)
		}

		return tpl.Spec.ParamSchema, nil
	}

	tpl := &permitsv1beta2.GlobalResourcePermitTemplate{}

	if err := k8sClient.Get(ctx, ctrlclient.ObjectKey{Name: state.templateName}, tpl); err != nil {
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

	return tpl.Spec.ParamSchema, nil
}

// templateEntry holds display data for a template in the catalog.
type templateEntry struct {
	kind        string
	name        string
	namespace   string
	description string
	tags        []string
	autoApprove bool
}

// listTemplates queries both ResourcePermitTemplate and GlobalResourcePermitTemplate
// and returns a combined, filterable list.
func listTemplates(ctx context.Context, k8sClient ctrlclient.Client) ([]templateEntry, error) {
	var entries []templateEntry

	// List namespaced ResourcePermitTemplates.
	rptList := &permitsv1beta2.ResourcePermitTemplateList{}

	if err := k8sClient.List(ctx, rptList); err != nil {
		return nil, fmt.Errorf("failed to list namespaced templates: %w", err)
	}

	for _, tpl := range rptList.Items {
		entries = append(entries, templateEntry{
			kind:        "ResourcePermitTemplate",
			name:        tpl.Name,
			namespace:   tpl.Namespace,
			description: tpl.Annotations[descriptionAnnotation],
			tags:        parseTags(tpl.Annotations[tagsAnnotation]),
			autoApprove: tpl.Spec.Approvals.Auto,
		})
	}

	// List global templates.
	grptList := &permitsv1beta2.GlobalResourcePermitTemplateList{}

	if err := k8sClient.List(ctx, grptList); err != nil {
		return nil, fmt.Errorf("failed to list global templates: %w", err)
	}

	for _, tpl := range grptList.Items {
		entries = append(entries, templateEntry{
			kind:        "GlobalResourcePermitTemplate",
			name:        tpl.Name,
			namespace:   "",
			description: tpl.Annotations[descriptionAnnotation],
			tags:        parseTags(tpl.Annotations[tagsAnnotation]),
			autoApprove: tpl.Spec.Approvals.Auto,
		})
	}

	return entries, nil
}

// filterTemplates applies search and tag filters to the template list.
func filterTemplates(templates []templateEntry, search string, selectedTags []string) []templateEntry {
	query := strings.ToLower(strings.TrimSpace(search))

	var filtered []templateEntry

	for _, t := range templates {
		// Tag filter: all selected tags must be present.
		if len(selectedTags) > 0 {
			tagSet := make(map[string]bool)
			for _, tag := range t.tags {
				tagSet[strings.ToLower(tag)] = true
			}

			match := true

			for _, st := range selectedTags {
				if !tagSet[strings.ToLower(st)] {
					match = false

					break
				}
			}

			if !match {
				continue
			}
		}

		// Search filter.
		if query != "" {
			var parts []string

			parts = append(parts, t.name, t.description, t.namespace)
			parts = append(parts, t.tags...)
			searchable := strings.Join(parts, " ")

			if !strings.Contains(strings.ToLower(searchable), query) {
				continue
			}
		}

		filtered = append(filtered, t)
	}

	return filtered
}

// parseTags splits the comma-separated tags annotation.
func parseTags(annotation string) []string {
	if annotation == "" {
		return nil
	}

	var tags []string

	for tag := range strings.SplitSeq(annotation, ",") {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			tags = append(tags, tag)
		}
	}

	return tags
}

// selectTemplate guides the user through template selection with search and tag filtering.
func selectTemplate(ctx context.Context, cmd *cobra.Command, k8sClient ctrlclient.Client) (*createWizardState, error) {
	templates, err := listTemplates(ctx, k8sClient)
	if err != nil {
		return nil, err
	}

	if len(templates) == 0 {
		return nil, fmt.Errorf("no templates available")
	}

	// Collect all available tags for filtering.
	allTags := make(map[string]bool)

	for _, t := range templates {
		for _, tag := range t.tags {
			allTags[tag] = true
		}
	}

	var selectedTags []string

	//nolint:nestif // tag filtering logic is inherently nested
	if len(allTags) > 0 {
		tagList := make([]string, 0, len(allTags))

		for tag := range allTags {
			tagList = append(tagList, tag)
		}

		sort.Strings(tagList)

		cmd.Println("Available tags:")

		for i, tag := range tagList {
			cmd.Printf("  %d. %s\n", i+1, tag)
		}

		cmd.Print("Filter by tags (comma-separated numbers, or press Enter to skip): ")

		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		if input != "" {
			for numStr := range strings.SplitSeq(input, ",") {
				numStr = strings.TrimSpace(numStr)

				if numStr == "" {
					continue
				}

				// Simple number parsing.
				var num int

				if _, err := fmt.Sscanf(numStr, "%d", &num); err == nil && num >= 1 && num <= len(tagList) {
					selectedTags = append(selectedTags, tagList[num-1])
				}
			}
		}
	}

	// Search filter.
	cmd.Print("Search templates (or press Enter to skip): ")

	reader := bufio.NewReader(os.Stdin)
	search, _ := reader.ReadString('\n')
	search = strings.TrimSpace(search)

	// Apply filters.
	filtered := filterTemplates(templates, search, selectedTags)
	if len(filtered) == 0 {
		return nil, fmt.Errorf("no templates match the filter criteria")
	}

	// Display filtered templates.
	for {
		renderTemplateList(cmd, filtered)

		cmd.Printf("\nSelect a template (1-%d): ", len(filtered))

		reader = bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		var num int

		if _, err := fmt.Sscanf(input, "%d", &num); err != nil || num < 1 || num > len(filtered) {
			cmd.Println("Invalid selection.")

			continue
		}

		chosen := filtered[num-1]

		// Fetch the full template to get paramSchema.
		var paramSchema *k8sruntime.RawExtension

		if chosen.kind == "ResourcePermitTemplate" {
			tpl := &permitsv1beta2.ResourcePermitTemplate{}

			if err := k8sClient.Get(ctx, ctrlclient.ObjectKey{Name: chosen.name, Namespace: chosen.namespace}, tpl); err != nil {
				return nil, fmt.Errorf("failed to get template: %w", err)
			}

			paramSchema = tpl.Spec.ParamSchema
		} else {
			tpl := &permitsv1beta2.GlobalResourcePermitTemplate{}

			if err := k8sClient.Get(ctx, ctrlclient.ObjectKey{Name: chosen.name}, tpl); err != nil {
				return nil, fmt.Errorf("failed to get template: %w", err)
			}

			paramSchema = tpl.Spec.ParamSchema
		}

		return &createWizardState{
			templateKind: chosen.kind,
			templateName: chosen.name,
			templateNs:   chosen.namespace,
			paramSchema:  paramSchema,
		}, nil
	}
}

func renderTemplateList(cmd *cobra.Command, templates []templateEntry) {
	cmd.Println("Available templates:")

	t := table.NewWriter()
	t.SetOutputMirror(os.Stdout)
	t.SetStyle(table.StyleRounded)
	t.AppendHeader(table.Row{"#", "Name", "Kind", "Namespace", "Auto-Approve", "Tags"})

	for i, tpl := range templates {
		tags := "-"
		if len(tpl.tags) > 0 {
			tags = strings.Join(tpl.tags, ", ")
		}

		ns := tpl.namespace
		if ns == "" {
			ns = "(global)"
		}

		auto := "No"

		if tpl.autoApprove {
			auto = "Yes"
		}

		t.AppendRow(table.Row{
			i + 1,
			tpl.name,
			tpl.kind,
			ns,
			auto,
			tags,
		})
	}

	t.Render()
}

// promptSetup collects namespace, name/generateName, reason, duration, and start time.
func promptSetup(cmd *cobra.Command, state *createWizardState) error {
	cmd.Println("\n--- Setup ---")

	// Namespace.
	if state.namespace == "" {
		cmd.Print("Target namespace: ")

		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')
		state.namespace = strings.TrimSpace(input)
	}

	if state.namespace == "" {
		return fmt.Errorf("namespace is required")
	}

	// Name or generateName.
	for state.name == "" && state.generateName == "" {
		cmd.Print("Name (or prefix for auto-generated name, empty for auto-generate): ")

		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		switch {
		case input == "":
			state.generateName = "rp-"
		case strings.HasSuffix(input, "-"):
			state.generateName = input
		default:
			state.name = input
		}
	}

	// Reason.
	if state.reason == "" {
		cmd.Print("Reason for this request: ")

		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')

		state.reason = strings.TrimSpace(input)
	}

	// Duration.
	if state.duration == "" {
		cmd.Print("Duration (e.g. 5m, 1h30m, or press Enter for unlimited): ")

		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')
		state.duration = strings.TrimSpace(input)
		// Validate duration format if provided.
		if state.duration != "" {
			if _, err := str2duration.ParseDuration(state.duration); err != nil {
				return fmt.Errorf("invalid duration %q: %w", state.duration, err)
			}
		}
	}

	// Start time.
	if state.startTime == "" {
		cmd.Print("Start time (RFC3339, e.g. 2025-07-15T14:45:00Z, or press Enter for now): ")

		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')

		state.startTime = strings.TrimSpace(input)

		if state.startTime != "" {
			// Validate RFC3339 format.
			var st metav1.Time
			if err := st.UnmarshalJSON(fmt.Appendf(nil, "%q", state.startTime)); err != nil {
				return fmt.Errorf("invalid start time %q: %w", state.startTime, err)
			}
		}
	}

	return nil
}

// promptParams collects template-specific parameters based on the paramSchema.
func promptParams(cmd *cobra.Command, state *createWizardState) error {
	if state.paramSchema == nil || len(state.paramSchema.Raw) == 0 {
		// No schema — no params needed.
		state.params = make(map[string]any)

		return nil
	}

	fields, err := WalkParamSchema(state.paramSchema.Raw)
	if err != nil {
		return fmt.Errorf("failed to parse template schema: %w", err)
	}

	if len(fields) == 0 {
		state.params = make(map[string]any)

		return nil
	}

	cmd.Println("\n--- Template Parameters ---")

	state.params = make(map[string]any)

	for _, field := range fields {
		value := PromptField(field)
		if value != nil {
			state.params[field.Name] = value
		}
	}

	// Validate if we have a schema.
	if len(state.params) > 0 {
		if err := ValidateParams(state.paramSchema.Raw, state.params); err != nil {
			return fmt.Errorf("parameter validation failed: %w", err)
		}
	}

	return nil
}

// buildResourcePermitBody constructs a ResourcePermit object from the wizard state.
func buildResourcePermitBody(state *createWizardState) (*permitsv1beta2.ResourcePermit, error) {
	name := strings.TrimSpace(state.name)

	generateName := strings.TrimSpace(state.generateName)

	if generateName != "" && !strings.HasSuffix(generateName, "-") {
		generateName += "-"
	}

	if name == "" && generateName == "" {
		return nil, fmt.Errorf("either name or generate-name is required")
	}

	if state.namespace == "" {
		return nil, fmt.Errorf("namespace is required")
	}

	if state.templateName == "" {
		return nil, fmt.Errorf("template is required")
	}

	//nolint:modernize // TypeMeta is not a truly embedded field
	rp := &permitsv1beta2.ResourcePermit{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "addons.projectcapsule.dev/v1beta2",
			Kind:       "ResourcePermit",
		},
		ObjectMeta: metav1.ObjectMeta{
			Namespace: state.namespace,
		},
		Spec: permitsv1beta2.ResourcePermitSpec{
			Template: permitsv1beta2.ResourcePermitTemplateReference{
				Kind: state.templateKind,
				Name: state.templateName,
			},
		},
	}

	if name != "" {
		rp.Name = name
	} else {
		rp.GenerateName = generateName
	}

	if state.reason != "" {
		rp.Spec.Reason = state.reason
	}

	if state.duration != "" {
		d, err := str2duration.ParseDuration(state.duration)
		if err != nil {
			return nil, fmt.Errorf("invalid duration: %w", err)
		}

		rp.Spec.Duration = &metav1.Duration{Duration: d}
	}

	if state.startTime != "" {
		var t metav1.Time
		if err := t.UnmarshalJSON(fmt.Appendf(nil, "%q", state.startTime)); err != nil {
			return nil, fmt.Errorf("invalid start time: %w", err)
		}

		rp.Spec.StartTime = &t
	}

	if len(state.params) > 0 {
		paramsJSON, err := json.Marshal(state.params)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal params: %w", err)
		}

		rp.Spec.Params = &k8sruntime.RawExtension{Raw: paramsJSON}
	}

	return rp, nil
}

// previewYaml displays the ResourcePermit YAML and asks the user to confirm.
func previewYaml(cmd *cobra.Command, rp *permitsv1beta2.ResourcePermit) error {
	yamlStr := renderResourcePermitYaml(rp)

	cmd.Println("\n--- YAML Preview ---")
	cmd.Println(colorizeYAML(yamlStr))

	for {
		cmd.Print("\nProceed with creation? [y/n/c=copy to file]: ")

		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')
		input = strings.ToLower(strings.TrimSpace(input))

		switch input {
		case "y", "yes":
			return nil
		case "n", "no":
			return fmt.Errorf("creation cancelled by user")
		case "c":
			cmd.Print("File path to save YAML: ")

			path, _ := reader.ReadString('\n')

			path = strings.TrimSpace(path)
			if path == "" {
				cmd.Println("No path provided.")

				continue
			}

			if err := os.WriteFile(path, []byte(yamlStr), 0o600); err != nil {
				return fmt.Errorf("failed to save YAML: %w", err)
			}

			cmd.Printf("YAML saved to %s\n", path)
		default:
			cmd.Println("Invalid input. Please enter 'y', 'n', or 'c'.")
		}
	}
}

// renderResourcePermitYaml converts a ResourcePermit to a YAML string.
func renderResourcePermitYaml(rp *permitsv1beta2.ResourcePermit) string {
	data, err := json.Marshal(rp)
	if err != nil {
		return fmt.Sprintf("Error serializing ResourcePermit: %v", err)
	}

	if yamlData, err := yaml.JSONToYAML(data); err == nil {
		return string(yamlData)
	}

	return string(data)
}

// createResourcePermit creates the ResourcePermit via the Kubernetes API.
func createResourcePermit(rp *permitsv1beta2.ResourcePermit) error {
	ctx := context.Background()

	_, k8sClient, err := newK8sClient()
	if err != nil {
		return err
	}

	return k8sClient.Create(ctx, rp)
}

// parseParamsFile parses a JSON or YAML file into a map for template parameters.
func parseParamsFile(data []byte) (map[string]any, error) {
	// Try JSON first.
	var params map[string]any
	if err := json.Unmarshal(data, &params); err == nil {
		return params, nil
	}

	// Try YAML.
	jsonData, err := yaml.YAMLToJSON(data)
	if err != nil {
		return nil, fmt.Errorf("params file must be valid JSON or YAML: %w", err)
	}

	if err := json.Unmarshal(jsonData, &params); err != nil {
		return nil, fmt.Errorf("failed to parse params: %w", err)
	}

	return params, nil
}
