{{- define "resource-permits.crds.name" -}}
{{- printf "%s-crds" (include "resource-permits.fullname" $) -}}
{{- end }}

{{- define "resource-permits.crds.annotations" -}}
"helm.sh/hook": "pre-install,pre-upgrade"
"helm.sh/hook-delete-policy": "before-hook-creation,hook-succeeded"
{{- end }}

{{- define "resource-permits.crds.component" -}}
crd-install-hook
{{- end }}

{{- define "resource-permits.crds.regexReplace" -}}
{{- printf "%s" ($ | base | trimSuffix ".yaml" | regexReplaceAll "[_.]" "-") -}}
{{- end }}

{{- define "resource-permits.crds.hash" -}}
{{- $paths := list -}}
{{- range $p, $_ := .Files.Glob "crds/**.yaml" }}
  {{- $paths = append $paths $p -}}
{{- end -}}
{{- $paths = sortAlpha $paths -}}

{{- $sizes := list -}}
{{- range $paths }}
  {{- $sizes = append $sizes (sha256sum ($.Files.Get .)) -}}
{{- end -}}

{{- $joined := join "," $sizes -}}
{{- sha256sum $joined -}}
{{- end -}}
