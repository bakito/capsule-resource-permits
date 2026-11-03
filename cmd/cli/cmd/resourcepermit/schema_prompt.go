// Copyright 2020-2026 Project Capsule Authors
// SPDX-License-Identifier: Apache-2.0

package resourcepermit

import (
	"bufio"
	"encoding/json"
	"fmt"
	"maps"
	"os"
	"slices"
	"strconv"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v5"
)

// SchemaField represents a single property extracted from a JSON Schema for
// driving an interactive prompt.
type SchemaField struct {
	Name        string
	Type        string
	Title       string
	Description string
	Default     any
	Enum        []string
	Required    bool
}

// WalkParamSchema extracts flat field metadata from a JSON Schema RawExtension.
// It handles `properties`, `allOf` composition, and `$ref` resolution within
// the same schema document. Nested objects are flattened with a dot-separated
// prefix. Complex conditionals (`oneOf`/`anyOf`) are skipped with a warning.
func WalkParamSchema(rawJSON []byte) ([]SchemaField, error) {
	var schema map[string]any
	if err := json.Unmarshal(rawJSON, &schema); err != nil {
		return nil, fmt.Errorf("invalid JSON Schema: %w", err)
	}

	// Collect $ref definitions for resolution.
	defs := make(map[string]map[string]any)

	if defsNode, ok := schema["definitions"].(map[string]any); ok {
		for k, v := range defsNode {
			if m, ok := v.(map[string]any); ok {
				defs[k] = m
			}
		}
	}

	// Also check "$defs" (draft-2019-09+).
	if defsNode, ok := schema["$defs"].(map[string]any); ok {
		for k, v := range defsNode {
			if m, ok := v.(map[string]any); ok {
				defs[k] = m
			}
		}
	}

	var fields []SchemaField

	required := stringList(schema["required"])

	fields = walkProperties(schema, required, defs, "", fields)

	return fields, nil
}

func walkProperties(schema map[string]any, required []string, defs map[string]map[string]any, prefix string, fields []SchemaField) []SchemaField {
	// Resolve $ref at the top level.
	if resolved := resolveRef(schema, defs); resolved != nil {
		return walkProperties(resolved, required, defs, prefix, fields)
	}

	// Handle allOf: merge all subschemas.
	if merged, mergedRequired := mergeAllOf(schema); merged != nil {
		return walkProperties(merged, mergedRequired, defs, prefix, fields)
	}

	// Skip oneOf/anyOf with a warning — too complex for flat prompts.
	if oneOf, ok := schema["oneOf"].([]any); ok && len(oneOf) > 0 {
		fmt.Fprintf(os.Stderr, "Warning: skipping oneOf in schema (complex conditional)\n")

		return fields
	}

	if anyOf, ok := schema["anyOf"].([]any); ok && len(anyOf) > 0 {
		fmt.Fprintf(os.Stderr, "Warning: skipping anyOf in schema (complex conditional)\n")

		return fields
	}

	// Extract and process properties.
	props, ok := schema["properties"].(map[string]any)
	if !ok {
		return fields
	}

	for name, value := range props {
		propSchema, ok := value.(map[string]any)
		if !ok {
			continue
		}

		fields = processProperty(name, propSchema, required, defs, prefix, fields)
	}

	return fields
}

// resolveRef resolves a $ref in the schema to its definition.
func resolveRef(schema map[string]any, defs map[string]map[string]any) map[string]any {
	ref, ok := schema["$ref"].(string)
	if !ok {
		return nil
	}

	resolved, ok := defs[ref]
	if ok {
		return resolved
	}

	// Try stripping "#/definitions/" or "#/$defs/" prefix.
	for _, prefixStr := range []string{"#/definitions/", "#/$defs/", "#/"} {
		if cut, ok := strings.CutPrefix(ref, prefixStr); ok {
			if def, ok := defs[cut]; ok {
				return def
			}
		}
	}

	return nil
}

// mergeAllOf merges all subschemas in an allOf array into a single schema
// and returns the merged schema along with the merged required fields.
func mergeAllOf(schema map[string]any) (map[string]any, []string) {
	allOf, ok := schema["allOf"].([]any)
	if !ok {
		return nil, nil
	}

	mergedProps := make(map[string]any)
	mergedRequired := make([]string, 0)

	for _, item := range allOf {
		sub, ok := item.(map[string]any)
		if !ok {
			continue
		}

		if props, ok := sub["properties"].(map[string]any); ok {
			maps.Copy(mergedProps, props)
		}

		if req, ok := sub["required"].([]any); ok {
			mergedRequired = append(mergedRequired, stringList(req)...)
		}
	}

	if len(mergedProps) == 0 {
		return nil, nil
	}

	merged := map[string]any{
		"type":       "object",
		"properties": mergedProps,
	}

	if len(mergedRequired) > 0 {
		merged["required"] = mergedRequired
	}

	return merged, mergedRequired
}

// processProperty handles a single property, including $ref resolution and
// nested object recursion.
func processProperty(name string, propSchema map[string]any, required []string, defs map[string]map[string]any, prefix string, fields []SchemaField) []SchemaField {
	fieldName := name
	if prefix != "" {
		fieldName = prefix + "." + name
	}

	// Resolve $ref within a property if present.
	if resolved := resolveRef(propSchema, defs); resolved != nil {
		return processResolvedRef(fieldName, resolved, required, name, defs, fields)
	}

	fieldType := "string"
	if t, ok := propSchema["type"].(string); ok {
		fieldType = t
	}

	field := SchemaField{
		Name:        fieldName,
		Type:        fieldType,
		Title:       stringValue(propSchema["title"]),
		Description: stringValue(propSchema["description"]),
		Default:     propSchema["default"],
		Required:    contains(required, name),
	}

	// Extract enum values.
	if enumVals, ok := propSchema["enum"].([]any); ok {
		for _, v := range enumVals {
			field.Enum = append(field.Enum, fmt.Sprintf("%v", v))
		}
	}

	// For nested objects, recurse.
	if fieldType == "object" {
		nestedRequired := stringList(propSchema["required"])

		return walkProperties(propSchema, nestedRequired, defs, fieldName, fields)
	}

	return append(fields, field)
}

// processResolvedRef handles a resolved $ref, either recursing into an object
// or creating a simple field.
func processResolvedRef(fieldName string, resolved map[string]any, required []string, propName string, defs map[string]map[string]any, fields []SchemaField) []SchemaField {
	if resolvedType, ok := resolved["type"].(string); ok && resolvedType == "object" {
		nestedRequired := stringList(resolved["required"])

		return walkProperties(resolved, nestedRequired, defs, fieldName, fields)
	}

	// Treat as a simple field from the ref.
	field := SchemaField{
		Name:     fieldName,
		Type:     "string",
		Required: contains(required, propName),
	}

	if t, ok := resolved["type"].(string); ok {
		field.Type = t
	}

	return append(fields, field)
}

// PromptField displays an interactive prompt for a single SchemaField and
// returns the user's input value. It handles string, boolean, number, and
// enum types with defaults shown in brackets.
func PromptField(field SchemaField) any {
	prompt := buildPrompt(field)

	for {
		_, _ = fmt.Fprintf(os.Stdout, "%s: ", prompt)
		reader := bufio.NewReader(os.Stdin)
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		// Use default if empty.
		if input == "" && field.Default != nil {
			return field.Default
		}

		if input == "" && !field.Required {
			return nil
		}

		if input == "" {
			_, _ = fmt.Fprintln(os.Stdout, "This field is required.")

			continue
		}

		switch field.Type {
		case "boolean":
			input = strings.ToLower(input)
			if input == "y" || input == "yes" || input == "true" || input == "1" {
				return true
			}

			if input == "n" || input == "no" || input == "false" || input == "0" {
				return false
			}

			_, _ = fmt.Fprintln(os.Stdout, "Invalid boolean. Please enter y/n.")

		case "integer", "number":
			if field.Type == "integer" {
				if intVal, intErr := strconv.ParseInt(input, 10, 64); intErr == nil {
					return intVal
				}
			}

			val, err := strconv.ParseFloat(input, 64)
			if err != nil {
				_, _ = fmt.Fprintln(os.Stdout, "Invalid number.")

				continue
			}

			return val

		case "string":
			if len(field.Enum) > 0 {
				if slices.Contains(field.Enum, input) {
					return input
				}

				_, _ = fmt.Fprintln(os.Stdout, "Invalid value. Please choose from the listed options.")
			} else {
				return input
			}

		default:
			return input
		}
	}
}

func buildPrompt(field SchemaField) string {
	var parts []string

	if field.Title != "" {
		parts = append(parts, field.Title)
	} else if field.Name != "" {
		parts = append(parts, field.Name)
	}

	if field.Description != "" {
		parts = append(parts, "("+field.Description+")")
	}

	if field.Required {
		parts = append(parts, "[required]")
	}

	prompt := strings.Join(parts, " ")

	if field.Default != nil {
		defaultStr := fmt.Sprintf("%v", field.Default)
		prompt += fmt.Sprintf(" [default: %s]", defaultStr)
	}

	if len(field.Enum) > 0 {
		prompt += fmt.Sprintf(" (choices: %s)", strings.Join(field.Enum, ", "))
	}

	return prompt
}

// ValidateParams validates a map of collected parameters against a JSON Schema
// using the jsonschema library. Returns an error if validation fails.
func ValidateParams(rawJSON []byte, params map[string]any) error {
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("schema", strings.NewReader(string(rawJSON))); err != nil {
		return fmt.Errorf("failed to load schema: %w", err)
	}

	schema, err := compiler.Compile("schema")
	if err != nil {
		return fmt.Errorf("invalid schema: %w", err)
	}

	// Build a JSON object from params for validation.
	paramsJSON, err := json.Marshal(params)
	if err != nil {
		return fmt.Errorf("failed to marshal params: %w", err)
	}

	var decoded any
	if err := json.Unmarshal(paramsJSON, &decoded); err != nil {
		return fmt.Errorf("failed to decode params: %w", err)
	}

	if err := schema.Validate(decoded); err != nil {
		return fmt.Errorf("params validation failed: %w", err)
	}

	return nil
}

// stringList converts a []any of strings to []string.
func stringList(v any) []string {
	var result []string

	if arr, ok := v.([]any); ok {
		for _, item := range arr {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
	}

	return result
}

// stringValue extracts a string from an any value.
func stringValue(v any) string {
	if s, ok := v.(string); ok {
		return s
	}

	return ""
}

// contains checks if a string slice contains a value.
func contains(slice []string, val string) bool {
	return slices.Contains(slice, val)
}
