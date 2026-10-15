{{/*
Render webhook values before serialization, so quotes and newlines produced by
tpl remain scalar content. Only webhook values are evaluated; the root context
is available to templates but is never mutated. JSON preserves collection types
between recursive includes. Templates are evaluated once, without recursive tpl.
*/}}
{{- define "resource-permits.webhooks.renderValue" -}}
{{- $value := .value -}}
{{- if kindIs "map" $value -}}
  {{- $result := dict -}}
  {{- range $key, $entry := $value -}}
    {{- if contains "{{" $key -}}
      {{- $key = tpl $key $.ctx -}}
    {{- end -}}
    {{- if hasKey $result $key -}}
      {{- fail (printf "%s contains duplicate key %q after templating" $.path $key) -}}
    {{- end -}}
    {{- $_ := set $result $key (include "resource-permits.webhooks.renderValue" (dict "value" $entry "ctx" $.ctx "path" (printf "%s.%s" $.path $key)) | mustFromJson) -}}
  {{- end -}}
  {{- $value = $result -}}
{{- else if kindIs "slice" $value -}}
  {{- $result := list -}}
  {{- range $index, $entry := $value -}}
    {{- $result = append $result (include "resource-permits.webhooks.renderValue" (dict "value" $entry "ctx" $.ctx "path" (printf "%s[%d]" $.path $index)) | mustFromJson) -}}
  {{- end -}}
  {{- $value = $result -}}
{{- else if kindIs "string" $value -}}
  {{- if contains "{{" $value -}}
    {{- $value = tpl $value .ctx -}}
  {{- end -}}
  {{- if regexMatch "^webhooks\\.(enabled|exclusive|certificate\\.generate\\.enabled)$" .path -}}
    {{- if not (has (trim $value) (list "true" "false")) -}}
      {{- fail (printf "%s must render to true or false" .path) -}}
    {{- end -}}
    {{- $value = eq (trim $value) "true" -}}
  {{- else if or (regexMatch `^webhooks\.hooks\.[^.]+\.timeoutSeconds$` .path) (eq .path "webhooks.service.port") -}}
    {{- if not (regexMatch "^-?[0-9]+$" (trim $value)) -}}
      {{- fail (printf "%s must render to an integer" .path) -}}
    {{- end -}}
    {{- $number := int64 (trim $value) -}}
    {{- if ne (printf "%d" $number) (trim $value) -}}
      {{- fail (printf "%s must render to an integer without leading zeros, within the signed 64-bit range" .path) -}}
    {{- end -}}
    {{- $value = $number -}}
  {{- end -}}
{{- end -}}
{{- mustToJson $value -}}
{{- end -}}

{{/* Shared configuration for one admission endpoint. */}}
{{- define "resource-permits.webhooks.hook" -}}
name: {{ .name }}
admissionReviewVersions: [v1]
sideEffects: None
failurePolicy: {{ .hook.failurePolicy | quote }}
matchPolicy: {{ .hook.matchPolicy | quote }}
timeoutSeconds: {{ .hook.timeoutSeconds }}
clientConfig:
  {{- include "resource-permits.webhooks.service" (dict "ctx" .ctx "path" .path) | nindent 2 }}
{{- with .hook.objectSelector }}
objectSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .hook.namespaceSelector }}
namespaceSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .hook.matchConditions }}
matchConditions:
  {{- toYaml . | nindent 2 }}
{{- end }}
rules:
  {{- toYaml .hook.rules | nindent 2 }}
{{- end }}
