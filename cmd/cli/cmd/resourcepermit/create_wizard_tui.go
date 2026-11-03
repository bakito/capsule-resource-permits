// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"fmt"
	"os"
	"slices"
	"strings"

	"charm.land/bubbles/v2/key"
	"charm.land/bubbles/v2/list"
	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
)

// wizardStep represents the current step in the interactive wizard.
type wizardStep int

const (
	stepTemplate wizardStep = iota
	stepNamespace
	stepName
	stepReason
	stepDuration
	stepStartTime
	stepParams
	stepPreview
)

// wizardModel holds the full state of the TUI wizard.
type wizardModel struct {
	// Terminal dimensions.
	width  int
	height int

	// Current wizard step.
	step wizardStep

	// Template selection.
	templates   []templateEntry
	filtered    []templateEntry
	tagFilter   []string
	searchQuery string
	listModel   list.Model
	listReady   bool

	// Setup fields.
	namespaceInput textinput.Model
	nameInput      textinput.Model
	reasonInput    textinput.Model
	durationInput  textinput.Model
	startTimeInput textinput.Model

	// Template parameters.
	paramFields []SchemaField
	paramInputs map[string]*textinput.Model
	paramIndex  int

	// Result state.
	state *createWizardState

	// Preview.
	previewYaml string

	// Error message.
	err error

	// Styles.
	styles wizardStyles
}

// wizardStyles defines the visual style for the wizard.
type wizardStyles struct {
	title        lipgloss.Style
	stepTitle    lipgloss.Style
	label        lipgloss.Style
	input        lipgloss.Style
	hint         lipgloss.Style
	error        lipgloss.Style
	success      lipgloss.Style
	divider      lipgloss.Style
	preview      lipgloss.Style
	selected     lipgloss.Style
	description  lipgloss.Style
	tag          lipgloss.Style
	autoApprove  lipgloss.Style
	footer       lipgloss.Style
	footerActive lipgloss.Style
}

func newWizardStyles() wizardStyles {
	return wizardStyles{
		title: lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#7D56F4")).
			Padding(0, 1),
		stepTitle: lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#04B575")).
			MarginBottom(1),
		label: lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#949E5B")).
			MarginRight(1),
		input: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#E2E27D")).
			PaddingLeft(1),
		hint: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#666666")).
			Italic(true),
		error: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FF0000")).
			Bold(true),
		success: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#04B575")).
			Bold(true),
		divider: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#333333")),
		preview: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#CCCCCC")).
			Padding(1, 2).
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#444444")),
		selected: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#7D56F4")).
			Bold(true),
		description: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#999999")),
		tag: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#04B575")).
			Padding(0, 1).
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#04B575")),
		autoApprove: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#E2E27D")).
			Bold(true),
		footer: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#666666")).
			MarginTop(1),
		footerActive: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#7D56F4")).
			Bold(true).
			MarginTop(1),
	}
}

// templateListItem implements list.Item for template entries.
type templateListItem struct {
	entry templateEntry
}

func (i templateListItem) Title() string {
	var parts []string

	parts = append(parts, i.entry.name)
	if i.entry.kind == "ResourcePermitTemplate" && i.entry.namespace != "" {
		parts = append(parts, fmt.Sprintf("[%s]", i.entry.namespace))
	}

	title := strings.Join(parts, " ")

	if i.entry.autoApprove {
		title += " " + newWizardStyles().autoApprove.Render("[auto-approve]")
	}

	return title
}

func (i templateListItem) Description() string {
	var parts []string

	if i.entry.kind != "" {
		parts = append(parts, templateKindBadge(i.entry.kind))
	}

	if len(i.entry.tags) > 0 {
		var tagStrs []string
		for _, tag := range i.entry.tags {
			tagStrs = append(tagStrs, newWizardStyles().tag.Render(tag))
		}

		parts = append(parts, strings.Join(tagStrs, " "))
	}

	if i.entry.description != "" {
		parts = append(parts, i.entry.description)
	}

	return strings.Join(parts, " • ")
}

// templateKindBadge returns a short styled badge for the template kind.
func templateKindBadge(kind string) string {
	s := newWizardStyles()

	switch kind {
	case "GlobalResourcePermitTemplate":
		return s.tag.Render("G")
	case "ResourcePermitTemplate":
		return s.tag.Render("R")
	default:
		return kind
	}
}

func (i templateListItem) FilterValue() string {
	var parts []string

	parts = append(parts, i.entry.name)
	parts = append(parts, i.entry.description)
	parts = append(parts, i.entry.namespace)
	parts = append(parts, i.entry.kind)
	parts = append(parts, i.entry.tags...)

	return strings.Join(parts, " ")
}

// initWizardModel creates the initial wizard model.
func initWizardModel(templates []templateEntry) wizardModel {
	m := wizardModel{
		templates: templates,
		state:     &createWizardState{},
		styles:    newWizardStyles(),
	}

	// Build list items.
	items := make([]list.Item, len(templates))
	for i, t := range templates {
		items[i] = templateListItem{entry: t}
	}

	// Create the list delegate.
	delegate := list.NewDefaultDelegate()
	delegate.ShowDescription = true
	delegate.Styles.SelectedTitle = m.styles.selected
	delegate.Styles.SelectedDesc = m.styles.description

	m.listModel = list.New(items, delegate, 60, 15)
	m.listModel.Title = "Select a Template"
	m.listModel.SetShowStatusBar(true)
	m.listModel.SetShowFilter(true)
	m.listModel.SetShowHelp(false)
	m.listReady = true

	m.filtered = templates

	// Create text inputs.
	m.namespaceInput = textinput.New()
	m.namespaceInput.Placeholder = "default"
	m.namespaceInput.Focus()

	m.nameInput = textinput.New()
	m.nameInput.Placeholder = "my-permit (or prefix- for auto-generate)"

	m.reasonInput = textinput.New()
	m.reasonInput.Placeholder = "Reason for this request"

	m.durationInput = textinput.New()
	m.durationInput.Placeholder = "5m, 1h30m (empty for unlimited)"

	m.startTimeInput = textinput.New()
	m.startTimeInput.Placeholder = "2025-07-15T14:45:00Z (empty for now)"

	return m
}

// Init is the first function that will be called.
func (m wizardModel) Init() tea.Cmd {
	return textinput.Blink
}

// Update handles messages and updates the model.
func (m wizardModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		// Global quit.
		if msg.String() == "ctrl+c" || msg.String() == "q" {
			m.err = fmt.Errorf("wizard cancelled")

			return m, tea.Quit
		}

		switch m.step {
		case stepTemplate:
			return m.updateTemplateStep(msg)
		case stepNamespace:
			return m.updateInputStep(msg, &m.namespaceInput, func() {
				if m.namespaceInput.Value() == "" {
					m.err = fmt.Errorf("namespace is required")

					return
				}

				m.state.namespace = m.namespaceInput.Value()
				m.step = stepName
				m.nameInput.Focus()
			})
		case stepName:
			return m.updateInputStep(msg, &m.nameInput, func() {
				val := m.nameInput.Value()
				if val == "" {
					m.state.generateName = "rp-"
				} else if strings.HasSuffix(val, "-") {
					m.state.generateName = val
				} else {
					m.state.name = val
				}

				m.step = stepReason
				m.reasonInput.Focus()
			})
		case stepReason:
			return m.updateInputStep(msg, &m.reasonInput, func() {
				m.state.reason = m.reasonInput.Value()
				m.step = stepDuration
				m.durationInput.Focus()
			})
		case stepDuration:
			return m.updateInputStep(msg, &m.durationInput, func() {
				m.state.duration = m.durationInput.Value()
				m.step = stepStartTime
				m.startTimeInput.Focus()
			})
		case stepStartTime:
			return m.updateInputStep(msg, &m.startTimeInput, func() {
				m.state.startTime = m.startTimeInput.Value()
				m.step = stepParams
				m.initParamInputs()
			})
		case stepParams:
			return m.updateParamStep(msg)
		case stepPreview:
			return m.updatePreviewStep(msg)
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width

		m.height = msg.Height
		if m.listReady {
			m.listModel.SetSize(msg.Width-4, min(msg.Height-10, 15))
		}
	}

	return m, tea.Batch(cmds...)
}

// updateTemplateStep handles the template selection step.
func (m wizardModel) updateTemplateStep(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	newModel, cmd := m.listModel.Update(msg)
	m.listModel = newModel

	if msg.String() == "enter" {
		if selected, ok := m.listModel.SelectedItem().(templateListItem); ok {
			m.state.templateKind = selected.entry.kind
			m.state.templateName = selected.entry.name
			m.state.templateNs = selected.entry.namespace
			m.step = stepNamespace
			m.namespaceInput.SetValue("")
			m.namespaceInput.Focus()
			cmds := []tea.Cmd{cmd, m.namespaceInput.Focus()}

			return m, tea.Batch(cmds...)
		}
	}

	return m, cmd
}

// updateInputStep handles a generic text input step.
func (m wizardModel) updateInputStep(
	msg tea.KeyMsg,
	input *textinput.Model,
	onNext func(),
) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg.String() {
	case "enter":
		if input.Value() == "" && input.Placeholder != "" {
			// Allow empty for optional fields; required check is in onNext.
		}

		onNext()

		if m.err != nil {
			return m, nil
		}

		return m, nil
	case "esc":
		// Blur and go back.
		input.Blur()

		return m, nil
	default:
		*input, cmd = input.Update(msg)
	}

	return m, cmd
}

// initParamInputs initializes the parameter input fields.
func (m wizardModel) initParamInputs() {
	if m.state.paramSchema == nil || len(m.state.paramSchema.Raw) == 0 {
		m.state.params = make(map[string]any)
		m.step = stepPreview
		m.buildPreview()

		return
	}

	fields, err := WalkParamSchema(m.state.paramSchema.Raw)
	if err != nil || len(fields) == 0 {
		m.state.params = make(map[string]any)
		m.step = stepPreview
		m.buildPreview()

		return
	}

	m.paramFields = fields
	m.paramInputs = make(map[string]*textinput.Model)
	m.paramIndex = 0

	for _, field := range fields {
		ti := textinput.New()

		var placeholder string
		if field.Default != nil {
			placeholder = fmt.Sprintf("%v", field.Default)
		} else if field.Description != "" {
			placeholder = field.Description
		} else {
			placeholder = field.Name
		}

		ti.Placeholder = placeholder
		m.paramInputs[field.Name] = &ti
	}

	// Focus the first input.
	if len(fields) > 0 {
		_ = m.paramInputs[m.paramFields[0].Name].Focus()
	}
}

// updateParamStep handles the template parameters step.
func (m wizardModel) updateParamStep(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if len(m.paramFields) == 0 {
		m.step = stepPreview
		m.buildPreview()

		return m, nil
	}

	field := m.paramFields[m.paramIndex]

	input, ok := m.paramInputs[field.Name]
	if !ok {
		m.step = stepPreview
		m.buildPreview()

		return m, nil
	}

	switch msg.String() {
	case "enter":
		// Process the value.
		value := input.Value()
		if value == "" && field.Default != nil {
			value = fmt.Sprintf("%v", field.Default)
		}

		if value != "" || !field.Required {
			m.state.params[field.Name] = parseParamValue(field, value)
		}

		// Move to next field or finish.
		if m.paramIndex < len(m.paramFields)-1 {
			input.Blur()

			m.paramIndex++
			nextField := m.paramFields[m.paramIndex]
			_ = m.paramInputs[nextField.Name].Focus()
		} else {
			// Validate and move to preview.
			if len(m.state.params) > 0 && m.state.paramSchema != nil {
				if err := ValidateParams(m.state.paramSchema.Raw, m.state.params); err != nil {
					m.err = err

					return m, nil
				}
			}

			m.step = stepPreview
			m.buildPreview()
		}

	case "up", "k":
		if m.paramIndex > 0 {
			input.Blur()

			m.paramIndex--
			prevField := m.paramFields[m.paramIndex]
			_ = m.paramInputs[prevField.Name].Focus()
		}

	case "down", "j":
		if m.paramIndex < len(m.paramFields)-1 {
			input.Blur()

			m.paramIndex++
			nextField := m.paramFields[m.paramIndex]
			_ = m.paramInputs[nextField.Name].Focus()
		}

	case "ctrl+c":
		m.err = fmt.Errorf("wizard cancelled")

		return m, tea.Quit

	default:
		newInput, cmd := input.Update(msg)
		m.paramInputs[field.Name] = &newInput

		return m, cmd
	}

	return m, nil
}

// parseParamValue converts a string value to the appropriate type based on the field schema.
func parseParamValue(field SchemaField, value string) any {
	if value == "" {
		return nil
	}

	switch field.Type {
	case "boolean":
		lower := strings.ToLower(value)

		return lower == "y" || lower == "yes" || lower == "true" || lower == "1"
	case "integer":
		var intVal int64
		if _, err := fmt.Sscanf(value, "%d", &intVal); err == nil {
			return intVal
		}

		return value
	case "number":
		var floatVal float64
		if _, err := fmt.Sscanf(value, "%f", &floatVal); err == nil {
			return floatVal
		}

		return value
	default:
		if len(field.Enum) > 0 && slices.Contains(field.Enum, value) {
			return value
		}

		return value
	}
}

// updatePreviewStep handles the YAML preview step.
func (m wizardModel) updatePreviewStep(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "yes":
		// Confirm creation.
		return m, tea.Quit
	case "n", "no", "q", "esc":
		m.err = fmt.Errorf("creation cancelled by user")

		return m, tea.Quit
	case "c":
		// Copy to file — for simplicity, just quit with the YAML.
		// The caller can handle file output.
		return m, tea.Quit
	}

	return m, nil
}

// buildPreview constructs the YAML preview.
func (m *wizardModel) buildPreview() {
	rp, err := buildResourcePermitBody(m.state)
	if err != nil {
		m.err = err
		m.previewYaml = err.Error()

		return
	}

	m.previewYaml = renderResourcePermitYaml(rp)
}

// View renders the program's UI.
func (m wizardModel) View() tea.View {
	v := tea.NewView("")
	v.AltScreen = true

	switch m.step {
	case stepTemplate:
		v.SetContent(m.renderTemplateStep())
	case stepNamespace:
		v.SetContent(m.renderInputStep(
			"Target Namespace",
			"Enter the namespace for the ResourcePermit",
			&m.namespaceInput,
		))
	case stepName:
		v.SetContent(m.renderInputStep(
			"Permit Name",
			"Enter a name or prefix (ending with -) for auto-generation",
			&m.nameInput,
		))
	case stepReason:
		v.SetContent(m.renderInputStep(
			"Reason",
			"Provide a reason for this request (optional)",
			&m.reasonInput,
		))
	case stepDuration:
		v.SetContent(m.renderInputStep(
			"Duration",
			"e.g. 5m, 1h30m — leave empty for unlimited",
			&m.durationInput,
		))
	case stepStartTime:
		v.SetContent(m.renderInputStep(
			"Start Time",
			"RFC3339 format, e.g. 2025-07-15T14:45:00Z — leave empty for now",
			&m.startTimeInput,
		))
	case stepParams:
		v.SetContent(m.renderParamStep())
	case stepPreview:
		v.SetContent(m.renderPreviewStep())
	}

	return v
}

// renderTemplateStep renders the template selection view.
func (m wizardModel) renderTemplateStep() string {
	var b strings.Builder

	b.WriteString(m.styles.title.Render("Resource Permit Wizard") + "\n")
	b.WriteString(m.styles.stepTitle.Render("Step 1: Select a Template") + "\n")
	b.WriteString(m.styles.hint.Render("Use ↑/↓ to navigate, / to filter, Enter to select") + "\n\n")

	b.WriteString(m.listModel.View())

	return b.String()
}

// renderInputStep renders a generic text input step.
func (m wizardModel) renderInputStep(title, hint string, input *textinput.Model) string {
	var b strings.Builder

	stepNum := m.step + 1
	b.WriteString(m.styles.title.Render("Resource Permit Wizard") + "\n")
	b.WriteString(m.styles.stepTitle.Render(fmt.Sprintf("Step %d: %s", stepNum, title)) + "\n")
	b.WriteString(m.styles.hint.Render(hint) + "\n\n")

	b.WriteString(m.styles.label.Render(":") + "\n")
	b.WriteString(m.styles.input.Render(input.View()) + "\n\n")

	footer := m.styles.footer.Render("Enter: Next  |  Esc: Back")
	b.WriteString(footer)

	if m.err != nil {
		b.WriteString("\n" + m.styles.error.Render("Error: "+m.err.Error()))
	}

	return b.String()
}

// renderParamStep renders the template parameters step.
func (m wizardModel) renderParamStep() string {
	var b strings.Builder

	b.WriteString(m.styles.title.Render("Resource Permit Wizard") + "\n")
	b.WriteString(m.styles.stepTitle.Render("Step 6: Template Parameters") + "\n")
	b.WriteString(m.styles.hint.Render("Use ↑/↓ to navigate between fields, Enter to confirm") + "\n\n")

	for i, field := range m.paramFields {
		input, ok := m.paramInputs[field.Name]
		if !ok {
			continue
		}

		label := field.Name
		if field.Title != "" {
			label = field.Title
		}

		if field.Required {
			label += " *"
		}

		prefix := fmt.Sprintf("%d. ", i+1)
		if i == m.paramIndex {
			prefix = m.styles.footerActive.Render("▸ " + prefix)
		} else {
			prefix = m.styles.footer.Render(prefix)
		}

		b.WriteString(prefix)
		b.WriteString(m.styles.label.Render(label))

		if field.Description != "" {
			b.WriteString(" " + m.styles.description.Render("("+field.Description+")"))
		}

		if len(field.Enum) > 0 {
			b.WriteString(" " + m.styles.hint.Render("["+strings.Join(field.Enum, ", ")+"]"))
		}

		b.WriteString("\n")
		b.WriteString("    " + input.View() + "\n")
	}

	b.WriteString("\n")

	footer := m.styles.footer.Render("Enter: Next  |  ↑/↓: Navigate  |  Ctrl+C: Cancel")
	b.WriteString(footer)

	if m.err != nil {
		b.WriteString("\n" + m.styles.error.Render("Error: "+m.err.Error()))
	}

	return b.String()
}

// renderPreviewStep renders the YAML preview step.
func (m wizardModel) renderPreviewStep() string {
	var b strings.Builder

	b.WriteString(m.styles.title.Render("Resource Permit Wizard") + "\n")
	b.WriteString(m.styles.stepTitle.Render("Step 7: Preview & Confirm") + "\n\n")

	if m.err != nil {
		b.WriteString(m.styles.error.Render("Error: "+m.err.Error()) + "\n\n")
		b.WriteString(m.styles.footer.Render("Press Enter to go back"))

		return b.String()
	}

	// Truncate preview for display.
	preview := m.previewYaml

	maxLines := max(m.height-12, 10)

	lines := strings.Split(preview, "\n")
	if len(lines) > maxLines {
		lines = lines[:maxLines]
		lines = append(lines, "...")
	}

	b.WriteString(m.styles.preview.Render(strings.Join(lines, "\n")) + "\n\n")

	b.WriteString(m.styles.footer.Render("Y: Create  |  N: Cancel  |  C: Save to file"))

	return b.String()
}

// wizardQuitMsg is returned when the wizard completes.
type wizardQuitMsg struct {
	state *createWizardState
	err   error
}

// runCreateWizardTUI runs the interactive TUI wizard.
func runCreateWizardTUI(templates []templateEntry) (*createWizardState, error) {
	if len(templates) == 0 {
		return nil, fmt.Errorf("no templates available")
	}

	model := initWizardModel(templates)

	// Check if we're in a TTY.
	if !isTTY() {
		return nil, fmt.Errorf("interactive wizard requires a TTY")
	}

	p := tea.NewProgram(model)

	result, err := p.Run()
	if err != nil {
		return nil, fmt.Errorf("wizard error: %w", err)
	}

	wm, ok := result.(wizardModel)
	if !ok {
		return nil, fmt.Errorf("unexpected wizard result")
	}

	if wm.err != nil {
		return nil, wm.err
	}

	return wm.state, nil
}

// isTTY checks if stdin is a TTY.
func isTTY() bool {
	stat, err := os.Stdin.Stat()
	if err != nil {
		return false
	}

	return (stat.Mode() & os.ModeCharDevice) != 0
}

// key bindings for the wizard (unused struct for potential future key map).
type wizardKeyMap struct {
	Confirm key.Binding
	Cancel  key.Binding
	Back    key.Binding
}

func defaultWizardKeyMap() wizardKeyMap {
	return wizardKeyMap{
		Confirm: key.NewBinding(key.WithKeys("enter"), key.WithHelp("enter", "confirm")),
		Cancel:  key.NewBinding(key.WithKeys("ctrl+c", "q"), key.WithHelp("ctrl+c/q", "cancel")),
		Back:    key.NewBinding(key.WithKeys("esc"), key.WithHelp("esc", "back")),
	}
}
