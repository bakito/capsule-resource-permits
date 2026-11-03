// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"

	permitsv1beta2 "github.com/projectcapsule/resource-permits/api/v1beta2"
)

func TestFilterTemplates_searchMatch(t *testing.T) {
	templates := []templateEntry{
		{name: "admin-access", description: "Grant admin access", tags: []string{"admin"}},
		{name: "temp-network", description: "Temporary network policy", tags: []string{"network"}},
		{name: "db-access", description: "Database access", tags: []string{"database"}},
	}

	// Search by name.
	filtered := filterTemplates(templates, "admin", nil)
	assert.Len(t, filtered, 1)
	assert.Equal(t, "admin-access", filtered[0].name)

	// Search by description.
	filtered = filterTemplates(templates, "network", nil)
	assert.Len(t, filtered, 1)
	assert.Equal(t, "temp-network", filtered[0].name)

	// No match.
	filtered = filterTemplates(templates, "xyz", nil)
	assert.Empty(t, filtered)
}

func TestFilterTemplates_tagFilter(t *testing.T) {
	templates := []templateEntry{
		{name: "admin-access", tags: []string{"admin", "security"}},
		{name: "temp-network", tags: []string{"network"}},
		{name: "db-access", tags: []string{"database", "security"}},
	}

	// Filter by single tag.
	filtered := filterTemplates(templates, "", []string{"security"})
	assert.Len(t, filtered, 2)

	// Filter by two tags (AND).
	filtered = filterTemplates(templates, "", []string{"admin", "security"})
	assert.Len(t, filtered, 1)
	assert.Equal(t, "admin-access", filtered[0].name)

	// No matching tag.
	filtered = filterTemplates(templates, "", []string{"network", "database"})
	assert.Empty(t, filtered)
}

func TestFilterTemplates_combinedFilter(t *testing.T) {
	templates := []templateEntry{
		{name: "admin-access", description: "Grant admin access", tags: []string{"admin", "security"}},
		{name: "admin-review", description: "Review admin requests", tags: []string{"admin"}},
		{name: "temp-network", description: "Temporary network policy", tags: []string{"network"}},
	}

	// Search + tag filter.
	filtered := filterTemplates(templates, "review", []string{"admin"})
	assert.Len(t, filtered, 1)
	assert.Equal(t, "admin-review", filtered[0].name)
}

func TestParseTags(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{"", nil},
		{"admin", []string{"admin"}},
		{"admin, security", []string{"admin", "security"}},
		{"admin,security,network", []string{"admin", "security", "network"}},
		{"  admin  ,  security  ", []string{"admin", "security"}},
		{",,", nil},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseTags(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBuildResourcePermitBody_explicitName(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		reason:       "Need access for migration",
		duration:     "2h",
		params:       map[string]any{"user": "alice"},
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)

	assert.Equal(t, "my-permit", rp.Name)
	assert.Empty(t, rp.GenerateName)
	assert.Equal(t, "default", rp.Namespace)
	assert.Equal(t, "GlobalResourcePermitTemplate", rp.Spec.Template.Kind)
	assert.Equal(t, "admin-access", rp.Spec.Template.Name)
	assert.Equal(t, "Need access for migration", rp.Spec.Reason)
	require.NotNil(t, rp.Spec.Duration)
	assert.Equal(t, "2h0m0s", rp.Spec.Duration.Duration.String())
	require.NotNil(t, rp.Spec.Params)
}

func TestBuildResourcePermitBody_generateName(t *testing.T) {
	state := &createWizardState{
		templateKind: "ResourcePermitTemplate",
		templateName: "temp-network",
		namespace:    "kube-system",
		generateName: "net-",
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)

	assert.Empty(t, rp.Name)
	assert.Equal(t, "net-", rp.GenerateName)
	assert.Equal(t, "ResourcePermitTemplate", rp.Spec.Template.Kind)
}

func TestBuildResourcePermitBody_missingName(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
	}

	_, err := buildResourcePermitBody(state)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "name or generate-name")
}

func TestBuildResourcePermitBody_missingNamespace(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		name:         "my-permit",
	}

	_, err := buildResourcePermitBody(state)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "namespace")
}

func TestBuildResourcePermitBody_missingTemplate(t *testing.T) {
	state := &createWizardState{
		namespace: "default",
		name:      "my-permit",
	}

	_, err := buildResourcePermitBody(state)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "template")
}

func TestBuildResourcePermitBody_withStartTime(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		startTime:    "2025-07-15T14:45:00Z",
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)
	require.NotNil(t, rp.Spec.StartTime)
	assert.Equal(t, "2025-07-15T14:45:00Z", rp.Spec.StartTime.UTC().Format("2006-01-02T15:04:05Z"))
}

func TestBuildResourcePermitBody_noParams(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)
	assert.Nil(t, rp.Spec.Params)
}

func TestBuildResourcePermitBody_withParams(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		params:       map[string]any{"user": "alice", "count": 5},
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)
	require.NotNil(t, rp.Spec.Params)
	assert.NotEmpty(t, rp.Spec.Params.Raw)
}

func TestRenderResourcePermitYaml(t *testing.T) {
	rp := &permitsv1beta2.ResourcePermit{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "addons.projectcapsule.dev/v1beta2",
			Kind:       "ResourcePermit",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-permit",
			Namespace: "default",
		},
		Spec: permitsv1beta2.ResourcePermitSpec{
			Template: permitsv1beta2.ResourcePermitTemplateReference{
				Kind: "GlobalResourcePermitTemplate",
				Name: "admin-access",
			},
			Reason: "Test reason",
		},
	}

	yamlStr := renderResourcePermitYaml(rp)
	assert.Contains(t, yamlStr, "apiVersion: addons.projectcapsule.dev/v1beta2")
	assert.Contains(t, yamlStr, "kind: ResourcePermit")
	assert.Contains(t, yamlStr, "name: test-permit")
	assert.Contains(t, yamlStr, "namespace: default")
	assert.Contains(t, yamlStr, "reason: Test reason")
}

func TestParseParamsFile_json(t *testing.T) {
	data := []byte(`{"user": "alice", "count": 5}`)
	params, err := parseParamsFile(data)
	require.NoError(t, err)
	assert.Equal(t, "alice", params["user"])
	assert.Equal(t, float64(5), params["count"])
}

func TestParseParamsFile_yaml(t *testing.T) {
	data := []byte(`user: alice
count: 5`)
	params, err := parseParamsFile(data)
	require.NoError(t, err)
	assert.Equal(t, "alice", params["user"])
	assert.Equal(t, float64(5), params["count"])
}

func TestParseParamsFile_invalid(t *testing.T) {
	data := []byte(`{ invalid content`)
	_, err := parseParamsFile(data)
	assert.Error(t, err)
}

func TestBuildResourcePermitBody_generateNameSuffix(t *testing.T) {
	// When generateName doesn't end with "-", it should be appended.
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		generateName: "rp",
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)
	assert.Equal(t, "rp-", rp.GenerateName)
}

func TestBuildResourcePermitBody_emptyParamsMap(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		params:       map[string]any{},
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)
	// Empty params map should not set Params.
	assert.Nil(t, rp.Spec.Params)
}

func TestBuildResourcePermitBody_rawExtensionParams(t *testing.T) {
	// Verify params are properly serialized as RawExtension.
	params := map[string]any{
		"nested": map[string]any{
			"key": "value",
		},
	}
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		params:       params,
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)
	require.NotNil(t, rp.Spec.Params)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(rp.Spec.Params.Raw, &decoded))
	assert.Equal(t, "value", decoded["nested"].(map[string]any)["key"])
}

func TestBuildResourcePermitBody_apiVersionAndKind(t *testing.T) {
	state := &createWizardState{
		templateKind: "ResourcePermitTemplate",
		templateName: "temp-network",
		namespace:    "default",
		name:         "my-permit",
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)
	assert.Equal(t, "addons.projectcapsule.dev/v1beta2", rp.APIVersion)
	assert.Equal(t, "ResourcePermit", rp.Kind)
}

func TestBuildResourcePermitBody_durationParsing(t *testing.T) {
	tests := []struct {
		duration string
		want     string
	}{
		{"5m", "5m0s"},
		{"1h30m", "1h30m0s"},
		{"2h", "2h0m0s"},
	}

	for _, tt := range tests {
		t.Run(tt.duration, func(t *testing.T) {
			state := &createWizardState{
				templateKind: "GlobalResourcePermitTemplate",
				templateName: "admin-access",
				namespace:    "default",
				name:         "my-permit",
				duration:     tt.duration,
			}

			rp, err := buildResourcePermitBody(state)
			require.NoError(t, err)
			require.NotNil(t, rp.Spec.Duration)
			assert.Equal(t, tt.want, rp.Spec.Duration.Duration.String())
		})
	}
}

func TestBuildResourcePermitBody_invalidDuration(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		duration:     "invalid",
	}

	_, err := buildResourcePermitBody(state)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid duration")
}

func TestBuildResourcePermitBody_invalidStartTime(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		startTime:    "not-a-date",
	}

	_, err := buildResourcePermitBody(state)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid start time")
}

func TestBuildResourcePermitBody_marshalError(t *testing.T) {
	// A params map with a non-serializable value.
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		params: map[string]any{
			"ch": make(chan int),
		},
	}

	_, err := buildResourcePermitBody(state)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "marshal")
}

func TestBuildResourcePermitBody_paramsRawExtension(t *testing.T) {
	state := &createWizardState{
		templateKind: "GlobalResourcePermitTemplate",
		templateName: "admin-access",
		namespace:    "default",
		name:         "my-permit",
		params:       map[string]any{"key": "value"},
	}

	rp, err := buildResourcePermitBody(state)
	require.NoError(t, err)
	require.NotNil(t, rp.Spec.Params)
	assert.IsType(t, &k8sruntime.RawExtension{}, rp.Spec.Params)
}
