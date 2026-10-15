import { describe, expect, it } from 'vitest';
import {
  combineResourcePermitTemplates,
  flattenRenderedResourcePermitTargets,
  formatAccessEntity,
  resourcePermitAuditTrail,
  resourcePermitIsReviewable,
  resourcePermitNamespacesFromSearch,
  resourcePermitPhase,
  resourcePermitPhaseColor,
  resourcePermitPhasePresentation,
  resourcePermitRetentionMessage,
  resourcePermitReviewEntity,
  resourcePermitReviewMessage,
  resourcePermitReviewRecorded,
  resourcePermitReviewVerdict,
  resourcePermitScheduledActivationAt,
  resourcePermitScheduledArchivingAt,
  resourcePermitScheduledLifecycle,
  resourcePermitServiceAccountEntity,
  resourcePermitStatusRequest,
  resourcePermitTemplateDescription,
  resourcePermitTemplateIcon,
  resourcePermitTemplateReference,
  templateApprovalMode,
  templateNamespaces,
  templateTargetCount,
} from './resourcePermitHelpers';

describe('ResourcePermit helpers', () => {
  it('normalizes review readiness and actor labels', () => {
    const request = {
      spec: { requestor: { name: 'alice', type: 'User' } },
      status: {
        phase: 'Requested',
        conditions: [{ type: 'Ready', status: 'True' }],
      },
    };

    expect(resourcePermitPhase(request)).toBe('Requested');
    expect(resourcePermitIsReviewable(request)).toBe(true);
    expect(formatAccessEntity(request.spec.requestor)).toBe('User/alice');
  });

  it('parses Headlamp plus-separated Namespace filters from the URL', () => {
    expect(
      resourcePermitNamespacesFromSearch('?namespace=solar-prod+solar-system+solar-test+solar-uat')
    ).toEqual(['solar-prod', 'solar-system', 'solar-test', 'solar-uat']);
  });

  it('flattens rendered status targets without inventing scope', () => {
    const rows = flattenRenderedResourcePermitTargets({
      status: {
        request: {
          resources: [
            {
              policy: { creation: 'Owner' },
              targets: [
                {
                  apiVersion: 'rbac.authorization.k8s.io/v1',
                  kind: 'Role',
                  metadata: { name: 'temporary-editor', namespace: 'solar-test' },
                },
              ],
            },
          ],
        },
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'Role',
      name: 'temporary-editor',
      namespace: 'solar-test',
      policy: { creation: 'Owner' },
    });
  });

  it('uses the append-only transition audit trail and its authenticated actors', () => {
    const trail = resourcePermitAuditTrail({
      status: {
        transitions: [
          {
            actor: { name: 'alice', type: 'User' },
            message: 'ResourcePermit created by alice',
            reason: 'CreatedByUser',
            timestamp: '2026-08-31T10:00:00Z',
            type: 'Created',
          },
          {
            actor: { name: 'alice', type: 'User' },
            message: 'Pending Review',
            reason: 'PendingReview',
            timestamp: '2026-08-31T10:01:00Z',
            type: 'Requested',
          },
          {
            actor: { name: 'bob', type: 'User' },
            eventTime: '2026-08-31T10:05:01Z',
            message: 'Approved for incident 42',
            reason: 'ApprovedByUser',
            timestamp: '2026-08-31T10:05:00Z',
            type: 'Approved',
          },
          {
            actor: { name: 'capsule-controller', type: 'System' },
            message: 'Access request activated',
            reason: 'ActivatedBySystem',
            timestamp: '2026-08-31T10:05:00Z',
            type: 'Active',
          },
        ],
      },
    });

    expect(trail.map(entry => entry.stage)).toEqual(['Created', 'Requested', 'Approved', 'Active']);
    expect(trail[2]).toMatchObject({
      actor: 'User/bob',
      actorEntity: { name: 'bob', type: 'User' },
      eventTime: '2026-08-31T10:05:01Z',
      message: 'Approved for incident 42',
      reason: 'ApprovedByUser',
      verdict: 'Approved',
    });
    expect(trail[3]).toMatchObject({
      actor: 'System/capsule-controller',
      actorEntity: { name: 'capsule-controller', type: 'System' },
    });
  });

  it('derives the future Archiving marker from keepUntil without changing audit history', () => {
    const request = {
      status: {
        keepUntil: '2026-09-03T10:00:00Z',
        transitions: [
          {
            actor: { name: 'capsule-controller', type: 'System' },
            reason: 'ExpiredBySystem',
            timestamp: '2026-09-02T10:00:00Z',
            type: 'Expired',
          },
        ],
      },
    };

    expect(resourcePermitScheduledArchivingAt(request)).toBe('2026-09-03T10:00:00Z');
    expect(resourcePermitAuditTrail(request).map(entry => entry.stage)).toEqual(['Expired']);
    expect(resourcePermitPhasePresentation('Archiving')).toMatchObject({
      chipColor: 'warning',
      color: '#f9a825',
      icon: 'mdi:archive-clock-outline',
      textColor: '#4f3b00',
    });
  });

  it('hides an invalid Archiving schedule', () => {
    expect(
      resourcePermitScheduledArchivingAt({ status: { keepUntil: 'not-a-date' } })
    ).toBeUndefined();
  });

  it('shows denied retention without inventing a controller deletion deadline', () => {
    const request = { status: { phase: 'Denied', request: { keepFor: '1w' } } };
    expect(resourcePermitScheduledLifecycle(request)).toEqual({
      stage: 'Archiving',
      description: 'Kept for 1 week after expiry.',
    });
    expect(resourcePermitScheduledArchivingAt(request)).toBeUndefined();
    expect(resourcePermitScheduledLifecycle({ jsonData: request })).toEqual(
      resourcePermitScheduledLifecycle(request)
    );
    expect(
      resourcePermitScheduledLifecycle({
        status: {
          ...request.status,
          keepUntil: '2026-09-16T10:00:00Z',
        },
      })
    ).toEqual({ stage: 'Archiving', timestamp: '2026-09-16T10:00:00Z' });
  });

  it('distinguishes resolved immediate deletion from missing retention information', () => {
    expect(resourcePermitRetentionMessage({})).toBe('Archive retention has not been reported yet.');
    for (const keepFor of [undefined, '', '0s', '0h0m0s']) {
      expect(resourcePermitRetentionMessage({ status: { request: { keepFor } } })).toBe(
        'No archive retention. Deleted immediately after expiry.'
      );
    }
    expect(
      resourcePermitRetentionMessage({ jsonData: { status: { request: { keepFor: '1w2d3h' } } } })
    ).toBe('Kept for 1 week, 2 days, 3 hours after expiry.');
  });

  it('schedules Active only for an approved request whose start time is still in the future', () => {
    const now = Date.parse('2026-09-02T10:00:00Z');
    const request = {
      status: {
        phase: 'Approved',
        request: { startTime: '2026-09-02T11:00:00Z' },
        transitions: [
          {
            actor: { name: 'bob', type: 'User' },
            reason: 'ApprovedByUser',
            timestamp: '2026-09-02T09:00:00Z',
            type: 'Approved',
          },
        ],
      },
    };

    expect(resourcePermitScheduledActivationAt(request, now)).toBe('2026-09-02T11:00:00Z');
    expect(resourcePermitScheduledLifecycle(request, now)).toEqual({
      stage: 'Active',
      timestamp: '2026-09-02T11:00:00Z',
    });
    expect(
      resourcePermitScheduledActivationAt(
        { ...request, status: { ...request.status, phase: 'Requested' } },
        now
      )
    ).toBeUndefined();
    expect(
      resourcePermitScheduledActivationAt(request, Date.parse('2026-09-02T12:00:00Z'))
    ).toBeUndefined();
    expect(
      resourcePermitScheduledActivationAt(
        {
          ...request,
          status: {
            ...request.status,
            transitions: [
              ...request.status.transitions,
              {
                actor: { name: 'capsule-controller', type: 'System' },
                reason: 'ActivatedBySystem',
                timestamp: '2026-09-02T11:00:00Z',
                type: 'Active',
              },
            ],
          },
        },
        now
      )
    ).toBeUndefined();
  });

  it('does not reconstruct lifecycle entries from metadata, conditions, or review status', () => {
    const trail = resourcePermitAuditTrail({
      metadata: { creationTimestamp: '2026-09-01T11:12:29Z' },
      spec: { requestor: { name: 'alice', type: 'User' } },
      status: {
        conditions: [
          {
            type: 'Approved',
            status: 'True',
            lastTransitionTime: '2026-09-01T11:15:00Z',
          },
        ],
        review: { reviewer: { name: 'bob', type: 'User' }, verdict: 'Approved' },
      },
    });

    expect(trail).toEqual([]);
  });

  it('uses the audit palette for lifecycle phase presentation', () => {
    expect(resourcePermitPhasePresentation('Approved')).toMatchObject({
      chipColor: 'success',
      color: '#2e7d32',
    });
    expect(resourcePermitPhasePresentation('Active')).toMatchObject({
      chipColor: 'success',
      color: '#00897b',
    });
    expect(resourcePermitPhasePresentation('Requested')).toMatchObject({
      chipColor: 'info',
      color: '#607d8b',
    });
    expect(resourcePermitPhasePresentation('Pending')).toMatchObject({
      chipColor: 'warning',
      color: '#ed6c02',
    });
    expect(resourcePermitPhasePresentation('Expired')).toMatchObject({
      chipColor: 'warning',
      color: '#e65100',
    });
    expect(resourcePermitPhaseColor('Denied')).toBe('error');
  });

  it('derives completed review information from its matching transition when needed', () => {
    const request = {
      status: {
        transitions: [
          {
            actor: { name: 'bob', type: 'User' },
            message: 'Emergency access accepted',
            reason: 'ApprovedByUser',
            timestamp: '2026-08-31T10:00:00Z',
            type: 'Approved',
          },
        ],
      },
    };

    expect(resourcePermitReviewRecorded(request)).toBe(true);
    expect(resourcePermitReviewVerdict(request)).toBe('Approved');
    expect(resourcePermitReviewEntity(request)).toEqual({ name: 'bob', type: 'User' });
    expect(resourcePermitReviewMessage(request)).toBe('Emergency access accepted');
  });

  it('distinguishes a completed review from the pending status placeholder', () => {
    expect(resourcePermitReviewRecorded({ status: { review: { verdict: 'Pending' } } })).toBe(
      false
    );
    expect(
      resourcePermitReviewRecorded({
        status: { review: { message: 'Still pending', reviewer: { name: 'bob' } } },
      })
    ).toBe(false);
    expect(resourcePermitReviewRecorded({ status: { review: { verdict: 'Denied' } } })).toBe(true);
    expect(
      resourcePermitServiceAccountEntity({
        status: {
          request: {
            impersonation: { namespace: 'solar-prod', name: 'capsule-access' },
          },
        },
      })
    ).toEqual({ type: 'ServiceAccount', name: 'solar-prod/capsule-access' });
  });

  it('reads only the controller-resolved status.request contract', () => {
    const request = {
      spec: { template: { kind: 'GlobalResourcePermitTemplate', name: 'requested-template' } },
      status: {
        request: {
          approvals: {
            approvers: [{ kind: 'Group', name: 'on-call' }],
            conditions: ['request.spec.reason == "incident"'],
          },
          duration: '30m',
          impersonation: { namespace: 'capsule-system', name: 'capsule' },
          keepFor: '1h',
          resources: [],
          startTime: '2026-09-02T08:00:00Z',
          template: {
            kind: 'GlobalResourcePermitTemplate',
            name: 'resolved-template',
            resourceVersion: '42',
          },
        },
      },
    };

    expect(resourcePermitStatusRequest(request)).toEqual(request.status.request);
    expect(resourcePermitTemplateReference(request)).toEqual(request.status.request.template);
    expect(
      resourcePermitStatusRequest({ status: { approved: { duration: '15m' } } })
    ).toBeUndefined();
  });
});

describe('GlobalResourcePermitTemplate helpers', () => {
  it('keeps global templates visible when no namespaced templates exist', () => {
    const globalTemplates = [{ metadata: { name: 'clusterrole-distribution' } }];

    expect(combineResourcePermitTemplates([], globalTemplates)).toEqual(globalTemplates);
    expect(
      combineResourcePermitTemplates([{ metadata: { name: 'local' } }], globalTemplates).map(
        template => template.metadata.name
      )
    ).toEqual(['local', 'clusterrole-distribution']);
  });

  it('summarizes approval, targets, and resolved namespaces', () => {
    const template = {
      spec: {
        approvals: { auto: true },
        resources: [{ targets: [{ kind: 'Role' }], template: 'kind: RoleBinding' }],
      },
      status: { namespaces: ['solar-test', 'solar-prod'] },
    };

    expect(templateApprovalMode(template)).toBe('Automatic');
    expect(templateTargetCount(template)).toBe(2);
    expect(templateNamespaces(template)).toEqual(['solar-test', 'solar-prod']);
  });

  it('reads safe catalog presentation annotations', () => {
    const template = {
      metadata: {
        annotations: {
          'info.projectcapsule.dev/description': 'Temporary production diagnostics',
          'info.projectcapsule.dev/icon': 'mdi:shield-search',
        },
      },
    };

    expect(resourcePermitTemplateDescription(template)).toBe('Temporary production diagnostics');
    expect(resourcePermitTemplateIcon(template)).toBe('mdi:shield-search');
    expect(
      resourcePermitTemplateIcon({
        metadata: { annotations: { 'info.projectcapsule.dev/icon': 'javascript:alert(1)' } },
      })
    ).toBeUndefined();
  });
});
