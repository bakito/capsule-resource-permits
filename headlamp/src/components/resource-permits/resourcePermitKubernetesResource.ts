export const CAPSULE_FORM_EXTENSION_KEY = 'x-capsule-form';
export const KUBERNETES_RESOURCE_WIDGET = 'kubernetes-resource';
export const DEFAULT_RESOURCE_OPTION_TEMPLATE = '{{ .metadata.name }}';

export interface KubernetesResourceFormSource {
  apiVersion?: string;
  fieldSelector?: string;
  kind?: string;
  labelSelector?: string;
  namespace?: string;
}

export interface KubernetesResourceFormOption {
  labelTemplate?: string;
  valueTemplate?: string;
}

export interface ResourcePermitFormExtension {
  option?: KubernetesResourceFormOption;
  source?: KubernetesResourceFormSource;
  widget?: string;
}

export interface DiscoveredKubernetesResource {
  kind?: string;
  name?: string;
  namespaced?: boolean;
  verbs?: string[];
}

export interface KubernetesResourceOption {
  label: string;
  resource: any;
  value: string;
}

export type KubernetesApiRequest = (path: string, options?: { cluster?: string }) => Promise<any>;

export function kubernetesDiscoveryPath(apiVersion: string): string {
  const parts = apiVersion.split('/').filter(Boolean);
  if (parts.length === 1) return `/api/${encodeURIComponent(parts[0])}`;
  if (parts.length === 2) {
    return `/apis/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`;
  }
  throw new Error(`Invalid API version ${apiVersion || '(empty)'}.`);
}

export function discoverKubernetesResource(
  discovery: any,
  kind: string
): DiscoveredKubernetesResource {
  const resources: DiscoveredKubernetesResource[] = discovery?.resources || [];
  const resource = resources.find(
    candidate =>
      candidate.kind === kind &&
      candidate.name &&
      !candidate.name.includes('/') &&
      (!candidate.verbs || candidate.verbs.includes('list'))
  );
  if (!resource) throw new Error(`The Kubernetes API does not expose a listable ${kind} resource.`);
  return resource;
}

export function kubernetesResourceListPath({
  apiVersion,
  requestNamespace,
  resource,
  source,
}: {
  apiVersion: string;
  requestNamespace?: string;
  resource: DiscoveredKubernetesResource;
  source: KubernetesResourceFormSource;
}): string {
  if (!resource.name) throw new Error('The discovered Kubernetes resource has no API name.');
  let path = kubernetesDiscoveryPath(apiVersion);
  if (resource.namespaced) {
    const configuredNamespace = source.namespace || 'request';
    const namespace = configuredNamespace === 'request' ? requestNamespace : configuredNamespace;
    if (namespace !== '*') {
      if (!namespace)
        throw new Error('Choose the ResourcePermit Namespace before loading options.');
      path += `/namespaces/${encodeURIComponent(namespace)}`;
    }
  }
  path += `/${encodeURIComponent(resource.name)}`;

  const query = new URLSearchParams();
  if (source.labelSelector) query.set('labelSelector', source.labelSelector);
  if (source.fieldSelector) query.set('fieldSelector', source.fieldSelector);
  return `${path}${query.size > 0 ? `?${query.toString()}` : ''}`;
}

function resolveTemplatePath(resource: any, expression: string): any {
  const normalized = expression.trim();
  if (!/^\.[A-Za-z0-9_.-]+$/.test(normalized)) {
    throw new Error(`Unsupported option template expression: ${normalized}`);
  }

  let value = resource;
  for (const segment of normalized.slice(1).split('.')) {
    if (value === null || value === undefined || typeof value !== 'object' || !(segment in value)) {
      throw new Error(`Option template field ${normalized} is unavailable.`);
    }
    value = value[segment];
  }
  if (value === null || value === undefined) {
    throw new Error(`Option template field ${normalized} is unavailable.`);
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * Browser-safe subset of Go text/template for option presentation.
 *
 * Capsule's form contract examples interpolate object paths. Keeping this
 * renderer path-only avoids evaluating arbitrary functions in the browser.
 */
export function renderKubernetesResourceOptionTemplate(
  template: string | undefined,
  resource: any
): string {
  const input = template || DEFAULT_RESOURCE_OPTION_TEMPLATE;
  const result = input.replace(/{{-?\s*([^{}]+?)\s*-?}}/g, (_match, expression: string) => {
    return resolveTemplatePath(resource, expression);
  });
  if (/{{|}}/.test(result)) {
    throw new Error(
      `Option template ${JSON.stringify(input)} is not supported by the browser form.`
    );
  }
  return result;
}

export function kubernetesResourceOptions(
  resources: any[],
  option: KubernetesResourceFormOption | undefined
): KubernetesResourceOption[] {
  return resources
    .map(resource => ({
      label: renderKubernetesResourceOptionTemplate(option?.labelTemplate, resource),
      resource,
      value: renderKubernetesResourceOptionTemplate(option?.valueTemplate, resource),
    }))
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label) || left.value.localeCompare(right.value)
    );
}

export async function loadKubernetesResourceOptions({
  apiRequest,
  cluster,
  extension,
  requestNamespace,
}: {
  apiRequest: KubernetesApiRequest;
  cluster?: string;
  extension?: ResourcePermitFormExtension;
  requestNamespace?: string;
}): Promise<KubernetesResourceOption[]> {
  if (extension?.widget !== KUBERNETES_RESOURCE_WIDGET) {
    throw new Error(
      `Unsupported Capsule form widget ${
        extension?.widget || '(missing)'
      }; expected ${KUBERNETES_RESOURCE_WIDGET}.`
    );
  }
  const source = extension.source;
  if (!source?.apiVersion || !source.kind) {
    throw new Error('This template contains an incomplete Kubernetes resource form extension.');
  }

  const requestOptions = cluster ? { cluster } : undefined;
  const discovery = await apiRequest(kubernetesDiscoveryPath(source.apiVersion), requestOptions);
  const resource = discoverKubernetesResource(discovery, source.kind);
  const listPath = kubernetesResourceListPath({
    apiVersion: source.apiVersion,
    requestNamespace,
    resource,
    source,
  });
  const list = await apiRequest(listPath, requestOptions);
  return kubernetesResourceOptions(list?.items || [], extension.option);
}

export function kubernetesResourceSelectionValue(
  selection: KubernetesResourceOption | KubernetesResourceOption[] | null,
  multiple: boolean
): string | string[] {
  if (multiple) {
    return Array.isArray(selection) ? [...new Set(selection.map(option => option.value))] : [];
  }
  return !Array.isArray(selection) && selection ? selection.value : '';
}
