{{/*
Expand the name of the chart.
*/}}
{{- define "resource-permits.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "resource-permits.fullname" -}}
{{- default .Release.Name .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "resource-permits.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "resource-permits.labels" -}}
helm.sh/chart: {{ include "resource-permits.chart" . }}
{{ include "resource-permits.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "resource-permits.selectorLabels" -}}
app.kubernetes.io/name: {{ include "resource-permits.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "resource-permits.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "resource-permits.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Determine the Kubernetes version to use for jobsFullyQualifiedDockerImage tag
*/}}
{{- define "helm.jobsTagKubeVersion" -}}
{{- if contains "-eks-" .Capabilities.KubeVersion.GitVersion }}
{{- print "v" .Capabilities.KubeVersion.Major "." (.Capabilities.KubeVersion.Minor | replace "+" "") -}}
{{- else }}
{{- print "v" .Capabilities.KubeVersion.Major "." .Capabilities.KubeVersion.Minor -}}
{{- end }}
{{- end }}

{{/*
Create the jobs fully-qualified Docker image to use
*/}}
{{- define "resource-permits.jobsFullyQualifiedDockerImage" -}}
{{- if .Values.global.jobs.kubectl.image.tag }}
{{- printf "%s/%s:%s" .Values.global.jobs.kubectl.image.registry .Values.global.jobs.kubectl.image.repository .Values.global.jobs.kubectl.image.tag -}}
{{- else }}
{{- printf "%s/%s:%s" .Values.global.jobs.kubectl.image.registry .Values.global.jobs.kubectl.image.repository (include "helm.jobsTagKubeVersion" .) -}}
{{- end }}
{{- end }}

{{/*
 Webhook service (Called with $.Path)
*/}}
{{- define "resource-permits.webhooks.service" -}}
  {{- include "resource-permits.webhooks.cabundle" $.ctx | nindent 0 }}
  {{- if $.ctx.Values.webhooks.service.url }}
url: {{ printf "%s/%s" (trimSuffix "/" $.ctx.Values.webhooks.service.url ) (trimPrefix "/" (required "Path is required for the function" $.path)) | quote }}
  {{- else }}
service:
  name: {{ default (printf "%s-webhook" (include "resource-permits.fullname" $.ctx)) $.ctx.Values.webhooks.service.name | quote }}
  namespace: {{ default $.ctx.Release.Namespace $.ctx.Values.webhooks.service.namespace | quote }}
  port: {{ default 443 $.ctx.Values.webhooks.service.port }}
  path: {{ required "Path is required for the function" $.path }}
  {{- end }}
{{- end }}

{{/*
 Webhook service (Without Path)
*/}}
{{- define "resource-permits.webhooks.serviceConfig" -}}
  {{- include "resource-permits.webhooks.cabundle" $ | nindent 0 }}
  {{- if $.Values.webhooks.service.url }}
url: {{ trimSuffix "/" $.Values.webhooks.service.url | quote }}
  {{- else }}
service:
  name: {{ default (printf "%s-webhook" (include "resource-permits.fullname" $)) $.Values.webhooks.service.name | quote }}
  namespace: {{ default $.Release.Namespace $.Values.webhooks.service.namespace | quote }}
  port: {{ default 443 $.Values.webhooks.service.port }}
  {{- end }}
{{- end }}

{{/*
 Webhook endpoint CA Bundle
*/}}
{{- define "resource-permits.webhooks.cabundle" -}}
  {{- if $.Values.webhooks.service.caBundle -}}
caBundle: {{ $.Values.webhooks.service.caBundle | quote -}}
  {{- end -}}
{{- end -}}

{{- define "resource-permits.webhooks.secret" -}}
{{- default (printf "%s-tls" (include "resource-permits.fullname" $)) $.Values.webhooks.certificate.secret.name -}}
{{- end -}}


{{- define "resource-permits.webhooks.labels" -}}
  {{- with $.Values.webhooks.labels }}
    {{- toYaml . | nindent 0 }}
  {{- end }}
{{- end }}

{{- define "resource-permits.webhooks.annotations" -}}
  {{- if and ($.Values.webhooks.certificate.generate.enabled) (not $.Values.webhooks.service.url) (not $.Values.webhooks.service.caBundle) }}
cert-manager.io/inject-ca-from: {{ $.Release.Namespace }}/{{ include "resource-permits.fullname" $  }}
  {{-  end }}
  {{- with $.Values.webhooks.annotations }}
    {{- toYaml . | nindent 0 }}
  {{- end }}
{{- end }}
