import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { Autocomplete, Box, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import type { RJSFSchema, WidgetProps } from '@rjsf/utils';
import { useEffect, useMemo, useState } from 'react';
import {
  CAPSULE_FORM_EXTENSION_KEY,
  type KubernetesResourceOption,
  kubernetesResourceSelectionValue,
  loadKubernetesResourceOptions,
  type ResourcePermitFormExtension,
} from './resourcePermitKubernetesResource';

export interface ResourcePermitSchemaFormContext {
  cluster?: string;
  requestNamespace?: string;
}

export interface KubernetesResourceSchemaFieldInputProps {
  cluster?: string;
  disabled?: boolean;
  error?: string;
  extension?: ResourcePermitFormExtension;
  helperText?: string;
  label: string;
  multiple?: boolean;
  onBlur?: () => void;
  onChange: (value: string | string[]) => void;
  onFocus?: () => void;
  readonly?: boolean;
  requestNamespace?: string;
  required?: boolean;
  value: any;
}

function optionKey(option: KubernetesResourceOption): string {
  return (
    option.resource?.metadata?.uid ||
    `${option.resource?.metadata?.namespace || ''}/${option.resource?.metadata?.name || ''}/${
      option.value
    }`
  );
}

function ResourceOption({ option }: { option: KubernetesResourceOption }) {
  return (
    <Stack sx={{ minWidth: 0 }}>
      <Typography>{option.label}</Typography>
      {option.value !== option.label && (
        <Typography color="text.secondary" noWrap variant="caption">
          {option.value}
        </Typography>
      )}
    </Stack>
  );
}

/** Discovery-backed scalar or array input for Capsule's form extension. */
export function KubernetesResourceSchemaFieldInput({
  cluster,
  disabled,
  error,
  extension,
  helperText,
  label,
  multiple = false,
  onBlur,
  onChange,
  onFocus,
  readonly,
  requestNamespace,
  required,
  value,
}: KubernetesResourceSchemaFieldInputProps) {
  const source = extension?.source;
  const [options, setOptions] = useState<KubernetesResourceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const extensionKey = JSON.stringify(extension || {});

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      setOptions([]);
      try {
        const nextOptions = await loadKubernetesResourceOptions({
          apiRequest: (path, requestOptions) => ApiProxy.request(path, requestOptions || {}),
          cluster,
          extension,
          requestNamespace,
        });
        if (active) setOptions(nextOptions);
      } catch (requestError: any) {
        if (active) {
          setLoadError(
            requestError?.response?.data?.message ||
              requestError?.data?.message ||
              requestError?.message ||
              `Unable to load visible ${source?.kind || 'Kubernetes resource'} options.`
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [cluster, extensionKey, requestNamespace]);

  const selected = useMemo(() => {
    if (multiple) {
      return (Array.isArray(value) ? value.map(String) : [])
        .map(selectedValue => options.find(option => option.value === selectedValue))
        .filter(Boolean) as KubernetesResourceOption[];
    }
    return options.find(option => option.value === String(value ?? '')) || null;
  }, [multiple, options, value]);
  const effectiveHelper =
    error ||
    loadError ||
    (loading
      ? `Loading visible ${source?.kind || 'Kubernetes resource'} objects…`
      : options.length === 0
      ? `No visible ${source?.kind || 'Kubernetes resource'} objects match this source.`
      : helperText);
  const commonInput = (params: any) => (
    <TextField
      {...params}
      error={Boolean(error || loadError)}
      helperText={effectiveHelper}
      label={label}
      required={required}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {loading && <CircularProgress color="inherit" size={18} />}
            {params.InputProps.endAdornment}
          </>
        ),
      }}
    />
  );
  const commonProps = {
    disabled: disabled || readonly || (Boolean(loadError) && options.length === 0),
    getOptionKey: optionKey,
    getOptionLabel: (option: KubernetesResourceOption) => option.label,
    isOptionEqualToValue: (
      option: KubernetesResourceOption,
      selectedOption: KubernetesResourceOption
    ) =>
      option.value === selectedOption.value &&
      option.resource?.metadata?.uid === selectedOption.resource?.metadata?.uid,
    loading,
    noOptionsText: loadError || `No visible ${source?.kind || 'resources'} found`,
    onBlur,
    onFocus,
    options,
    renderInput: commonInput,
    renderOption: (props: any, option: KubernetesResourceOption) => (
      <Box component="li" {...props}>
        <ResourceOption option={option} />
      </Box>
    ),
  };

  if (multiple) {
    return (
      <Autocomplete
        {...commonProps}
        disableCloseOnSelect
        multiple
        onChange={(_event, option) =>
          onChange(kubernetesResourceSelectionValue(option, true) as string[])
        }
        value={selected as KubernetesResourceOption[]}
      />
    );
  }

  return (
    <Autocomplete
      {...commonProps}
      onChange={(_event, option) =>
        onChange(kubernetesResourceSelectionValue(option, false) as string)
      }
      value={selected as KubernetesResourceOption | null}
    />
  );
}

/** RJSF widget adapter; Capsule configuration is carried in ui:options. */
export function KubernetesResourceSchemaWidget(
  props: WidgetProps<any, RJSFSchema, ResourcePermitSchemaFormContext>
) {
  const options = props.options as Record<string, any>;
  const extension =
    (options.capsuleForm as ResourcePermitFormExtension | undefined) ||
    (props.schema as any)[CAPSULE_FORM_EXTENSION_KEY];
  const multiple = Boolean(options.capsuleMultiple || props.schema.type === 'array');

  return (
    <KubernetesResourceSchemaFieldInput
      cluster={props.formContext?.cluster}
      disabled={props.disabled}
      error={(props.rawErrors || []).join(' · ')}
      extension={extension}
      helperText={props.schema.description}
      label={props.label}
      multiple={multiple}
      onBlur={() => props.onBlur(props.id, props.value)}
      onChange={props.onChange}
      onFocus={() => props.onFocus(props.id, props.value)}
      readonly={props.readonly}
      requestNamespace={props.formContext?.requestNamespace}
      required={props.required}
      value={props.value}
    />
  );
}

export default KubernetesResourceSchemaFieldInput;
