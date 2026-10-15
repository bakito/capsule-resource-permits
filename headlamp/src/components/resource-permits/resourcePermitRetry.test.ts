import { describe, expect, it } from 'vitest';
import { buildResourcePermitRetryRequest, canRetryResourcePermit } from './resourcePermitRetry';

describe('ResourcePermit retry contract', () => {
  it('builds a phase-only retry transition for a failed request', () => {
    const request = buildResourcePermitRetryRequest({
      kind: 'ResourcePermit',
      metadata: { name: 'incident access', namespace: 'solar-test' },
      status: {
        failure: { retryPhase: 'Requested', stage: 'Preflight' },
        phase: 'Failed',
      },
    });

    expect(request).toEqual({
      body: { status: { phase: 'Retrying' } },
      name: 'incident access',
      namespace: 'solar-test',
      resourceUrl:
        '/apis/addons.projectcapsule.dev/v1beta2/namespaces/solar-test/resourcepermits/incident%20access',
      url: '/apis/addons.projectcapsule.dev/v1beta2/namespaces/solar-test/resourcepermits/incident%20access/status',
    });
  });

  it('requires both Failed phase and controller-reported retry state', () => {
    expect(canRetryResourcePermit({ status: { phase: 'Failed' } })).toBe(false);
    expect(
      canRetryResourcePermit({
        status: { failure: { retryPhase: 'Approved' }, phase: 'Failed' },
      })
    ).toBe(true);
    expect(
      canRetryResourcePermit({
        status: { failure: { retryPhase: 'Approved' }, phase: 'Retrying' },
      })
    ).toBe(false);
  });
});
