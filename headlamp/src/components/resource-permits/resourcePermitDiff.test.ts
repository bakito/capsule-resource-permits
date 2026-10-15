import { describe, expect, it } from 'vitest';
import {
  isKubernetesNotFound,
  resourcePermitTargetDiff,
  resourcePermitTargetDiscoveryURL,
  resourcePermitTargetURL,
} from './resourcePermitDiff';

describe('ResourcePermit resulting changes', () => {
  it('builds namespaced and cluster-scoped target URLs', () => {
    expect(
      resourcePermitTargetURL({
        apiVersion: 'rbac.authorization.k8s.io/v1',
        id: 'role',
        kind: 'Role',
        manifest: {},
        name: 'incident editor',
        namespace: 'solar-test',
        policy: {},
        resourceIndex: 0,
        targetIndex: 0,
      })
    ).toBe('/apis/rbac.authorization.k8s.io/v1/namespaces/solar-test/roles/incident%20editor');
    expect(
      resourcePermitTargetDiscoveryURL({
        apiVersion: 'rbac.authorization.k8s.io/v1',
      } as any)
    ).toBe('/apis/rbac.authorization.k8s.io/v1');
    expect(
      resourcePermitTargetURL({
        apiVersion: 'v1',
        id: 'namespace',
        kind: 'Namespace',
        manifest: {},
        name: 'solar-test',
        policy: {},
        resourceIndex: 0,
        targetIndex: 0,
      })
    ).toBe('/api/v1/namespaces/solar-test');
    expect(
      resourcePermitTargetURL(
        {
          apiVersion: 'example.io/v1',
          id: 'person',
          kind: 'Person',
          manifest: {},
          name: 'alice',
          policy: {},
          resourceIndex: 0,
          targetIndex: 0,
        },
        'people'
      )
    ).toBe('/apis/example.io/v1/people/alice');
  });

  it('diffs only desired fields and ignores live status and generated metadata', () => {
    const changes = resourcePermitTargetDiff(
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'incident', resourceVersion: '42' },
        data: { access: 'viewer' },
        status: { ready: true },
      },
      {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: 'incident' },
        data: { access: 'editor' },
      }
    );
    const removed = changes
      .filter(change => change.removed)
      .map(change => change.value)
      .join('');
    const added = changes
      .filter(change => change.added)
      .map(change => change.value)
      .join('');

    expect(removed).toContain('"access": "viewer"');
    expect(added).toContain('"access": "editor"');
    expect(removed).not.toContain('resourceVersion');
    expect(removed).not.toContain('status');
  });

  it('recognizes common Kubernetes not-found errors', () => {
    expect(isKubernetesNotFound({ status: 404 })).toBe(true);
    expect(isKubernetesNotFound(new Error('404 Not Found'))).toBe(true);
    expect(isKubernetesNotFound(new Error('Forbidden'))).toBe(false);
  });
});
