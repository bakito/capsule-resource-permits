// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWalkParamSchema_simpleProperties(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"properties": {
			"username": {
				"type": "string",
				"title": "Username",
				"description": "The user account name"
			},
			"count": {
				"type": "integer",
				"default": 10
			},
			"enabled": {
				"type": "boolean",
				"default": true
			}
		},
		"required": ["username"]
	}`)

	fields, err := WalkParamSchema(schema)
	require.NoError(t, err)

	assert.Len(t, fields, 3)

	usernameField := findField(fields, "username")
	require.NotNil(t, usernameField)
	assert.Equal(t, "string", usernameField.Type)
	assert.Equal(t, "Username", usernameField.Title)
	assert.Equal(t, "The user account name", usernameField.Description)
	assert.True(t, usernameField.Required)

	countField := findField(fields, "count")
	require.NotNil(t, countField)
	assert.Equal(t, "integer", countField.Type)
	assert.Equal(t, float64(10), countField.Default)
	assert.False(t, countField.Required)

	enabledField := findField(fields, "enabled")
	require.NotNil(t, enabledField)
	assert.Equal(t, "boolean", enabledField.Type)
	assert.Equal(t, true, enabledField.Default)
}

func TestWalkParamSchema_enum(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"properties": {
			"environment": {
				"type": "string",
				"enum": ["dev", "staging", "prod"],
				"default": "dev"
			}
		}
	}`)

	fields, err := WalkParamSchema(schema)
	require.NoError(t, err)

	assert.Len(t, fields, 1)

	field := fields[0]
	assert.Equal(t, "environment", field.Name)
	assert.Equal(t, []string{"dev", "staging", "prod"}, field.Enum)
	assert.Equal(t, "dev", field.Default)
}

func TestWalkParamSchema_nestedObject(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"properties": {
			"database": {
				"type": "object",
				"properties": {
					"host": {
						"type": "string",
						"title": "Database Host"
					},
					"port": {
						"type": "integer",
						"default": 5432
					}
				},
				"required": ["host"]
			}
		}
	}`)

	fields, err := WalkParamSchema(schema)
	require.NoError(t, err)

	assert.Len(t, fields, 2)

	hostField := findField(fields, "database.host")
	require.NotNil(t, hostField)
	assert.Equal(t, "string", hostField.Type)
	assert.True(t, hostField.Required)

	portField := findField(fields, "database.port")
	require.NotNil(t, portField)
	assert.Equal(t, "integer", portField.Type)
	assert.Equal(t, float64(5432), portField.Default)
}

func TestWalkParamSchema_ref(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"definitions": {
			"ServerConfig": {
				"type": "object",
				"properties": {
					"host": {
						"type": "string"
					},
					"port": {
						"type": "integer"
					}
				},
				"required": ["host"]
			}
		},
		"properties": {
			"server": {
				"$ref": "#/definitions/ServerConfig"
			}
		}
	}`)

	fields, err := WalkParamSchema(schema)
	require.NoError(t, err)

	// The $ref resolves to an object with properties, so we get flattened fields.
	assert.Len(t, fields, 2)

	hostField := findField(fields, "server.host")
	require.NotNil(t, hostField)
	assert.Equal(t, "string", hostField.Type)
	assert.True(t, hostField.Required)
}

func TestWalkParamSchema_allOf(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"allOf": [
			{
				"properties": {
					"name": {
						"type": "string"
					}
				},
				"required": ["name"]
			},
			{
				"properties": {
					"age": {
						"type": "integer"
					}
				}
			}
		]
	}`)

	fields, err := WalkParamSchema(schema)
	require.NoError(t, err)

	assert.Len(t, fields, 2)

	nameField := findField(fields, "name")
	require.NotNil(t, nameField)
	assert.True(t, nameField.Required)

	ageField := findField(fields, "age")
	require.NotNil(t, ageField)
	assert.Equal(t, "integer", ageField.Type)
}

func TestWalkParamSchema_noProperties(t *testing.T) {
	schema := []byte(`{
		"type": "object"
	}`)

	fields, err := WalkParamSchema(schema)
	require.NoError(t, err)

	assert.Empty(t, fields)
}

func TestWalkParamSchema_emptySchema(t *testing.T) {
	schema := []byte(`{}`)

	fields, err := WalkParamSchema(schema)
	require.NoError(t, err)

	assert.Empty(t, fields)
}

func TestWalkParamSchema_invalidJSON(t *testing.T) {
	schema := []byte(`{ invalid json`)

	_, err := WalkParamSchema(schema)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid JSON Schema")
}

func TestValidateParams_valid(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"properties": {
			"name": {"type": "string"},
			"count": {"type": "integer", "minimum": 1}
		},
		"required": ["name"]
	}`)

	params := map[string]any{
		"name":  "test",
		"count": 5,
	}

	err := ValidateParams(schema, params)
	require.NoError(t, err)
}

func TestValidateParams_missingRequired(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"properties": {
			"name": {"type": "string"}
		},
		"required": ["name"]
	}`)

	params := map[string]any{}

	err := ValidateParams(schema, params)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "validation failed")
}

func TestValidateParams_typeMismatch(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"properties": {
			"count": {"type": "integer"}
		}
	}`)

	params := map[string]any{
		"count": "not a number",
	}

	err := ValidateParams(schema, params)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "validation failed")
}

func TestValidateParams_emptyParams(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"properties": {
			"name": {"type": "string"}
		}
	}`)

	params := map[string]any{}

	err := ValidateParams(schema, params)
	require.NoError(t, err)
}

func TestBuildPrompt(t *testing.T) {
	tests := []struct {
		name     string
		field    SchemaField
		expected string
	}{
		{
			name: "simple required field",
			field: SchemaField{
				Name:     "username",
				Type:     "string",
				Required: true,
			},
			expected: "username [required]: ",
		},
		{
			name: "field with title and description",
			field: SchemaField{
				Name:        "user",
				Type:        "string",
				Title:       "Username",
				Description: "Enter your username",
			},
			expected: "Username (Enter your username): ",
		},
		{
			name: "field with default",
			field: SchemaField{
				Name:    "count",
				Type:    "integer",
				Default: float64(10),
			},
			expected: "count [default: 10]: ",
		},
		{
			name: "enum field",
			field: SchemaField{
				Name: "env",
				Type: "string",
				Enum: []string{"dev", "prod"},
			},
			expected: "env (choices: dev, prod): ",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prompt := buildPrompt(tt.field)
			assert.Equal(t, tt.expected, prompt+": ")
		})
	}
}

func TestWalkParamSchema_dollarDefs(t *testing.T) {
	// Test $defs (draft-2019-09+) support.
	schema := []byte(`{
		"type": "object",
		"$defs": {
			"Address": {
				"type": "object",
				"properties": {
					"street": {"type": "string"},
					"city": {"type": "string"}
				}
			}
		},
		"properties": {
			"address": {
				"$ref": "#/$defs/Address"
			}
		}
	}`)

	fields, err := WalkParamSchema(schema)
	require.NoError(t, err)

	assert.Len(t, fields, 2)

	streetField := findField(fields, "address.street")
	require.NotNil(t, streetField)
	assert.Equal(t, "string", streetField.Type)
}

func findField(fields []SchemaField, name string) *SchemaField {
	for i := range fields {
		if fields[i].Name == name {
			return &fields[i]
		}
	}
	return nil
}
