import { describe, expect, it } from 'vitest';
import {
  buildResourcePermitReviewRequest,
  hasResourcePermitReviewSnapshot,
  normalizeResourcePermitReviewStartTime,
  resourcePermitReviewDateTimeInput,
} from './resourcePermitReview';

function reviewableRequest(withSnapshot = true) {
  return {
    kind: 'ResourcePermit',
    metadata: { name: 'incident-access', namespace: 'solar-test' },
    status: {
      ...(withSnapshot ? { request: { resources: [] } } : {}),
      conditions: [{ type: 'Ready', status: 'True' }],
      phase: 'Requested',
    },
  };
}

describe('ResourcePermit review contract', () => {
  it('patches the status subresource without claiming a reviewer identity', () => {
    const request = buildResourcePermitReviewRequest(
      reviewableRequest(),
      'Approved',
      '  Approved for incident 42  '
    );

    expect(request).toEqual({
      body: {
        status: {
          phase: 'Approved',
          review: {
            message: 'Approved for incident 42',
          },
        },
      },
      name: 'incident-access',
      namespace: 'solar-test',
      url: '/apis/addons.projectcapsule.dev/v1beta2/namespaces/solar-test/resourcepermits/incident-access/status',
      verdict: 'Approved',
    });
    expect(request?.body.status.review).not.toHaveProperty('reviewer');
    expect(request?.body.status.review).not.toHaveProperty('verdict');
  });

  it('blocks approval until the controller publishes its approval snapshot', () => {
    const item = reviewableRequest(false);

    expect(hasResourcePermitReviewSnapshot(item)).toBe(false);
    expect(buildResourcePermitReviewRequest(item, 'Approved', 'Looks good')).toBeNull();
    expect(
      buildResourcePermitReviewRequest(item, 'Denied', 'Missing rendered resources')
    ).not.toBeNull();
  });

  it('submits reviewer-adjusted lifecycle values without replacing rendered resources', () => {
    const startTimeInput = resourcePermitReviewDateTimeInput('2026-09-01T12:30:45Z');
    const request = buildResourcePermitReviewRequest(
      reviewableRequest(),
      'Approved',
      'Adjusted to the incident window',
      { duration: ' 45m ', startTime: startTimeInput }
    );

    expect(request?.body.status.request).toEqual({
      duration: '45m',
      startTime: '2026-09-01T12:30:45.000Z',
    });
    expect(request?.body.status.request).not.toHaveProperty('resources');
    expect(normalizeResourcePermitReviewStartTime(startTimeInput)).toBe('2026-09-01T12:30:45.000Z');
  });

  it('uses an explicit zero duration for an unlimited reviewer approval', () => {
    const request = buildResourcePermitReviewRequest(
      reviewableRequest(),
      'Approved',
      'Unlimited until manual expiration',
      { duration: '  ', startTime: resourcePermitReviewDateTimeInput('2026-09-01T12:30:45Z') }
    );

    expect(request?.body.status.request?.duration).toBe('0s');
  });

  it('allows approval without a comment and omits the empty message', () => {
    const request = buildResourcePermitReviewRequest(reviewableRequest(), 'Approved', '   ');

    expect(request?.body.status).toEqual({
      phase: 'Approved',
    });
  });

  it('requires a valid start time only when lifecycle values accompany approval', () => {
    expect(
      buildResourcePermitReviewRequest(reviewableRequest(), 'Approved', 'Looks good', {
        duration: '1h',
        startTime: '',
      })
    ).toBeNull();
    expect(
      buildResourcePermitReviewRequest(reviewableRequest(), 'Denied', 'Not required', {
        duration: '1h',
        startTime: '',
      })?.body.status
    ).not.toHaveProperty('request');
  });

  it('requires a reviewable request and a non-empty decline comment', () => {
    expect(buildResourcePermitReviewRequest(reviewableRequest(), 'Denied', '   ')).toBeNull();
    expect(
      buildResourcePermitReviewRequest(
        { ...reviewableRequest(), status: { phase: 'Active', request: {} } },
        'Denied',
        'Too late'
      )
    ).toBeNull();
  });
});
