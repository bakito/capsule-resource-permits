import { describe, expect, it } from 'vitest';
import { buildResourcePermitExpireRequest, canExpireResourcePermit } from './resourcePermitExpire';

describe('ResourcePermit expiry contract', () => {
  it('builds the terminal status-subresource transition', () => {
    const request = buildResourcePermitExpireRequest({
      kind: 'ResourcePermit',
      metadata: { name: 'incident access', namespace: 'solar-test' },
      status: { phase: 'Active' },
    });

    expect(request).toEqual({
      body: { status: { phase: 'Expired' } },
      name: 'incident access',
      namespace: 'solar-test',
      resourceUrl:
        '/apis/addons.projectcapsule.dev/v1beta2/namespaces/solar-test/resourcepermits/incident%20access',
      url: '/apis/addons.projectcapsule.dev/v1beta2/namespaces/solar-test/resourcepermits/incident%20access/status',
    });
  });

  it('allows every reported non-terminal phase and hides the action afterward', () => {
    for (const phase of [
      'Created',
      'Requested',
      'Pending',
      'Denied',
      'Approved',
      'Active',
      'Failed',
      'Retrying',
    ]) {
      expect(canExpireResourcePermit({ status: { phase } })).toBe(true);
    }
    expect(canExpireResourcePermit({ status: { phase: 'Expired' } })).toBe(false);
    expect(canExpireResourcePermit({ status: {} })).toBe(false);
  });
});
