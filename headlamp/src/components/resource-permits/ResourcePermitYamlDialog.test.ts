import { describe, expect, it } from 'vitest';
import { resourcePermitYaml, resourcePermitYamlFilename } from './ResourcePermitYamlDialog';

describe('ResourcePermit YAML export', () => {
  it('serializes the exact request object without adding a requestor', () => {
    const resource = {
      apiVersion: 'addons.projectcapsule.dev/v1beta2',
      kind: 'ResourcePermit',
      metadata: { name: 'incident-access', namespace: 'solar-test' },
      spec: {
        params: { clusterRoles: ['view', 'edit'] },
        reason: 'Incident 42',
        template: { kind: 'GlobalResourcePermitTemplate', name: 'clusterrole-binding' },
      },
    };

    const yaml = resourcePermitYaml(resource);

    expect(yaml).toBe(`apiVersion: addons.projectcapsule.dev/v1beta2
kind: ResourcePermit
metadata:
  name: incident-access
  namespace: solar-test
spec:
  params:
    clusterRoles:
      - view
      - edit
  reason: Incident 42
  template:
    kind: GlobalResourcePermitTemplate
    name: clusterrole-binding
`);
    expect(yaml).not.toContain('requestor:');
    expect(resourcePermitYamlFilename(resource)).toBe('incident-access.yaml');
  });

  it('uses the generated-name prefix for the download filename', () => {
    expect(resourcePermitYamlFilename({ metadata: { generateName: 'incident-access-' } })).toBe(
      'incident-access.yaml'
    );
    expect(resourcePermitYamlFilename({})).toBe('resourcepermit.yaml');
  });
});
