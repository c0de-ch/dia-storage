{{- define "dia-storage.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "dia-storage.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "dia-storage.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "dia-storage.labels" -}}
helm.sh/chart: {{ include "dia-storage.chart" . }}
{{ include "dia-storage.selectorLabels" . }}
app.kubernetes.io/version: {{ include "dia-storage.imageTag" . | trunc 63 | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: dia-storage
{{- end }}

{{- define "dia-storage.selectorLabels" -}}
app.kubernetes.io/name: {{ include "dia-storage.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "dia-storage.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "dia-storage.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "dia-storage.imageTag" -}}
{{- default .Chart.AppVersion .Values.image.tag }}
{{- end }}

{{- define "dia-storage.image" -}}
{{- printf "%s:%s" .Values.image.repository (include "dia-storage.imageTag" .) }}
{{- end }}

{{/* Name of the Secret with the DIA_* environment variables; empty when there is none. */}}
{{- define "dia-storage.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else if .Values.secrets.create }}
{{- printf "%s-secrets" (include "dia-storage.fullname" .) }}
{{- end }}
{{- end }}

{{/* Name of the PersistentVolumeClaim with the slides. */}}
{{- define "dia-storage.dataClaimName" -}}
{{- if .Values.persistence.existingClaim }}
{{- .Values.persistence.existingClaim }}
{{- else }}
{{- printf "%s-data" (include "dia-storage.fullname" .) }}
{{- end }}
{{- end }}

{{- define "dia-storage.dbClusterName" -}}
{{- printf "%s-db" (include "dia-storage.fullname" .) | trunc 50 | trimSuffix "-" }}
{{- end }}

{{/* DATABASE_URL, from the CloudNativePG app secret or an external secret. */}}
{{- define "dia-storage.databaseUrlEnv" -}}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
{{- if .Values.database.cnpg.enabled }}
      name: {{ include "dia-storage.dbClusterName" . }}-app
      key: uri
{{- else }}
      name: {{ required "database.external.existingSecret is required when database.cnpg.enabled is false" .Values.database.external.existingSecret }}
      key: {{ .Values.database.external.key }}
{{- end }}
{{- end }}
