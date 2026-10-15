import { describe, expect, it } from 'vitest';
import {
  buildResourcePermitExpireRequest,
  canExpireResourcePermit,
} from '../components/resource-permits/resourcePermitExpire';
import { resourcePermitIsReviewable } from '../components/resource-permits/resourcePermitHelpers';
import {
  buildResourcePermitRetryRequest,
  canRetryResourcePermit,
} from '../components/resource-permits/resourcePermitRetry';
import { buildResourcePermitReviewRequest } from '../components/resource-permits/resourcePermitReview';
import { PERMITS_API_VERSION } from './permitApi';

describe('Permit action API boundaries', () => {
  const request = {
    kind: 'ResourcePermit',
    metadata: { name: 'access', namespace: 'tenant-a' },
    status: {
      phase: 'Requested',
      conditions: [{ type: 'Ready', status: 'True' }],
      request: { resources: [] },
      failure: { retryPhase: 'Requested' },
    },
  };
  it.each(['capsule.clastix.io/v1beta2', 'other.example.com/v1', 'v1'])(
    'excludes foreign API %s from all lifecycle controls',
    apiVersion => {
      const item = { ...request, apiVersion };
      expect(resourcePermitIsReviewable(item)).toBe(false);
      expect(canExpireResourcePermit(item)).toBe(false);
      expect(buildResourcePermitReviewRequest(item, 'Denied', 'Not permitted')).toBeNull();
      expect(buildResourcePermitExpireRequest(item)).toBeNull();
      const failed = { ...item, status: { ...item.status, phase: 'Failed' } };
      expect(canRetryResourcePermit(failed)).toBe(false);
      expect(buildResourcePermitRetryRequest(failed)).toBeNull();
    }
  );
  it('targets only the addon status subresource and submits no authenticated actor', () => {
    const item = { ...request, apiVersion: PERMITS_API_VERSION };
    const review = buildResourcePermitReviewRequest(item, 'Denied', 'Not needed');
    expect(resourcePermitIsReviewable(item)).toBe(true);
    expect(review?.url).toBe(
      '/apis/addons.projectcapsule.dev/v1beta2/namespaces/tenant-a/resourcepermits/access/status'
    );
    expect(review?.body).toEqual({
      status: { phase: 'Denied', review: { message: 'Not needed' } },
    });
    expect(buildResourcePermitExpireRequest(item)?.body).toEqual({ status: { phase: 'Expired' } });
    expect(
      buildResourcePermitRetryRequest({ ...item, status: { ...item.status, phase: 'Failed' } })
        ?.body
    ).toEqual({ status: { phase: 'Retrying' } });
  });
  it('ignores other resource kinds even in the addon group', () => {
    expect(
      resourcePermitIsReviewable({
        ...request,
        kind: 'ResourcePermitTemplate',
        apiVersion: PERMITS_API_VERSION,
      })
    ).toBe(false);
  });
});
