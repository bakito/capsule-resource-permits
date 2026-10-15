import { describe, expect, it } from 'vitest';
import {
  discoverKubernetesResource,
  kubernetesDiscoveryPath,
  kubernetesResourceListPath,
  kubernetesResourceOptions,
  kubernetesResourceSelectionValue,
  loadKubernetesResourceOptions,
  renderKubernetesResourceOptionTemplate,
} from './resourcePermitKubernetesResource';

describe('ResourcePermit Kubernetes resource form widget', () => {
  it('builds discovery paths for core and grouped API versions', () => {
    expect(kubernetesDiscoveryPath('v1')).toBe('/api/v1');
    expect(kubernetesDiscoveryPath('rbac.authorization.k8s.io/v1')).toBe(
      '/apis/rbac.authorization.k8s.io/v1'
    );
    expect(() => kubernetesDiscoveryPath('apps/v1/extra')).toThrow('Invalid API version');
  });

  it('resolves a concrete listable resource and ignores subresources', () => {
    expect(
      discoverKubernetesResource(
        {
          resources: [
            { kind: 'Pod', name: 'pods/status', namespaced: true, verbs: ['get'] },
            { kind: 'Pod', name: 'pods', namespaced: true, verbs: ['get', 'list'] },
          ],
        },
        'Pod'
      )
    ).toMatchObject({ name: 'pods', namespaced: true });
    expect(() => discoverKubernetesResource({ resources: [] }, 'Widget')).toThrow(
      'does not expose a listable Widget'
    );
  });

  it('builds request, literal, all-Namespace, and cluster-scoped list paths', () => {
    const secret = { kind: 'Secret', name: 'secrets', namespaced: true };
    expect(
      kubernetesResourceListPath({
        apiVersion: 'v1',
        requestNamespace: 'solar-test',
        resource: secret,
        source: {
          fieldSelector: 'metadata.name!=ignored',
          labelSelector: 'app=payments',
          namespace: 'request',
        },
      })
    ).toBe(
      '/api/v1/namespaces/solar-test/secrets?labelSelector=app%3Dpayments&fieldSelector=metadata.name%21%3Dignored'
    );
    expect(
      kubernetesResourceListPath({
        apiVersion: 'v1',
        requestNamespace: 'solar-test',
        resource: secret,
        source: {},
      })
    ).toBe('/api/v1/namespaces/solar-test/secrets');
    expect(
      kubernetesResourceListPath({
        apiVersion: 'v1',
        resource: secret,
        source: { namespace: '*' },
      })
    ).toBe('/api/v1/secrets');
    expect(
      kubernetesResourceListPath({
        apiVersion: 'v1',
        resource: secret,
        source: { namespace: 'shared-secrets' },
      })
    ).toBe('/api/v1/namespaces/shared-secrets/secrets');
    expect(
      kubernetesResourceListPath({
        apiVersion: 'rbac.authorization.k8s.io/v1',
        requestNamespace: 'ignored',
        resource: { kind: 'ClusterRole', name: 'clusterroles', namespaced: false },
        source: {},
      })
    ).toBe('/apis/rbac.authorization.k8s.io/v1/clusterroles');
  });

  it('builds an arbitrary CRD GVK list path from discovery', async () => {
    const requests: string[] = [];
    const options = await loadKubernetesResourceOptions({
      apiRequest: async path => {
        requests.push(path);
        if (path === '/apis/group.example.io/v1') {
          return {
            resources: [
              { kind: 'Example', name: 'examples', namespaced: true, verbs: ['get', 'list'] },
            ],
          };
        }
        return { items: [{ metadata: { name: 'alpha', namespace: 'solar-test' } }] };
      },
      extension: {
        widget: 'kubernetes-resource',
        source: {
          apiVersion: 'group.example.io/v1',
          kind: 'Example',
          namespace: 'request',
          labelSelector: 'key=value',
          fieldSelector: 'metadata.name=alpha',
        },
      },
      requestNamespace: 'solar-test',
    });

    expect(requests).toEqual([
      '/apis/group.example.io/v1',
      '/apis/group.example.io/v1/namespaces/solar-test/examples?labelSelector=key%3Dvalue&fieldSelector=metadata.name%3Dalpha',
    ]);
    expect(options.map(option => option.value)).toEqual(['alpha']);
  });

  it('maps labels and values with safe Go-template object paths', () => {
    const resource = {
      metadata: { name: 'reader', namespace: 'solar-test' },
    };
    expect(renderKubernetesResourceOptionTemplate(undefined, resource)).toBe('reader');
    expect(
      renderKubernetesResourceOptionTemplate(
        '{{ .metadata.name }} ({{ .metadata.namespace }})',
        resource
      )
    ).toBe('reader (solar-test)');
    expect(renderKubernetesResourceOptionTemplate('Static label', resource)).toBe('Static label');
    expect(() =>
      renderKubernetesResourceOptionTemplate('{{ .metadata.name | upper }}', resource)
    ).toThrow('Unsupported option template expression');
  });

  it('sorts mapped API objects by their rendered labels', () => {
    const resources = [
      { metadata: { name: 'writer', namespace: 'solar-test' } },
      { metadata: { name: 'reader', namespace: 'solar-prod' } },
    ];
    expect(
      kubernetesResourceOptions(resources, {
        labelTemplate: '{{ .metadata.name }} ({{ .metadata.namespace }})',
        valueTemplate: '{{ .metadata.namespace }}/{{ .metadata.name }}',
      }).map(option => [option.label, option.value])
    ).toEqual([
      ['reader (solar-prod)', 'solar-prod/reader'],
      ['writer (solar-test)', 'solar-test/writer'],
    ]);
  });

  it('returns a string for scalar selectors and string[] for array selectors', () => {
    const options = kubernetesResourceOptions(
      [{ metadata: { name: 'view' } }, { metadata: { name: 'edit' } }],
      undefined
    );

    expect(kubernetesResourceSelectionValue(options[0], false)).toBe('edit');
    expect(kubernetesResourceSelectionValue(options, true)).toEqual(['edit', 'view']);
  });

  it('surfaces Kubernetes 403 and discovery failures', async () => {
    await expect(
      loadKubernetesResourceOptions({
        apiRequest: async () => {
          throw new Error('403 Forbidden: secrets is forbidden');
        },
        extension: {
          widget: 'kubernetes-resource',
          source: { apiVersion: 'v1', kind: 'Secret' },
        },
        requestNamespace: 'solar-test',
      })
    ).rejects.toThrow('403 Forbidden');

    await expect(
      loadKubernetesResourceOptions({
        apiRequest: async () => ({ resources: [] }),
        extension: {
          widget: 'kubernetes-resource',
          source: { apiVersion: 'example.io/v1', kind: 'Missing' },
        },
      })
    ).rejects.toThrow('does not expose a listable Missing resource');
  });

  it('surfaces option-template failures instead of returning an empty picker', async () => {
    await expect(
      loadKubernetesResourceOptions({
        apiRequest: async path =>
          path === '/api/v1'
            ? {
                resources: [{ kind: 'Secret', name: 'secrets', namespaced: true, verbs: ['list'] }],
              }
            : { items: [{ metadata: { name: 'database' } }] },
        extension: {
          widget: 'kubernetes-resource',
          source: { apiVersion: 'v1', kind: 'Secret' },
          option: { valueTemplate: '{{ .metadata.namespace }}/{{ .metadata.name }}' },
        },
        requestNamespace: 'solar-test',
      })
    ).rejects.toThrow('Option template field .metadata.namespace is unavailable');
  });
});
