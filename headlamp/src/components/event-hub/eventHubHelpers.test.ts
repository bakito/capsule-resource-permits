import { describe, expect, it } from 'vitest';
import {
  eventHubTimeframeCutoff,
  eventHubTransitionNotifications,
  filterEventHubNotificationsByTimeframe,
  filterEventHubNotificationsByType,
  resourcePermitBelongsToUser,
  resourcePermitHasUserReviewer,
  userReferenceMatches,
} from './eventHubHelpers';

const alice = {
  groups: ['developers', 'solar-approvers'],
  username: 'alice',
};

interface TransitionInput {
  actor?: { name: string; type: string };
  eventTime?: string;
  message?: string;
  reason?: string;
  timestamp: string;
  type: string;
}

function request({
  approvers = [],
  auto = false,
  name = 'diagnostics',
  namespace = 'solar-test',
  requestor = 'alice',
  transitions = [],
}: {
  approvers?: Array<{ kind: string; name: string }>;
  auto?: boolean;
  name?: string;
  namespace?: string;
  requestor?: string;
  transitions?: TransitionInput[];
}) {
  const data: any = {
    metadata: { name, namespace, uid: `${namespace}-${name}` },
    spec: { requestor: { name: requestor, type: 'User' } },
    status: {
      request: { approvals: { approvers, auto } },
      transitions: transitions.map(transition => ({
        actor: transition.actor || { name: requestor, type: 'User' },
        reason: transition.reason || `${transition.type}Reason`,
        ...transition,
      })),
    },
  };

  return {
    ...data,
    getName: () => name,
    getNamespace: () => namespace,
    jsonData: data,
  };
}

describe('EventHub identity matching', () => {
  it('matches users, groups, and Kubernetes ServiceAccount usernames', () => {
    expect(userReferenceMatches('User', 'alice', alice)).toBe(true);
    expect(userReferenceMatches('Group', 'solar-approvers', alice)).toBe(true);
    expect(userReferenceMatches('Group', 'other', alice)).toBe(false);
    expect(
      userReferenceMatches('ServiceAccount', 'system:serviceaccount:solar-prod:deployer', {
        username: 'system:serviceaccount:solar-prod:deployer',
      })
    ).toBe(true);
  });

  it('matches the exact requestor and explicitly configured manual reviewers', () => {
    expect(resourcePermitBelongsToUser(request({ requestor: 'alice' }), alice)).toBe(true);
    expect(resourcePermitBelongsToUser(request({ requestor: 'bob' }), alice)).toBe(false);
    expect(
      resourcePermitHasUserReviewer(
        request({ approvers: [{ kind: 'Group', name: 'solar-approvers' }] }),
        alice
      )
    ).toBe(true);
    expect(
      resourcePermitHasUserReviewer(
        request({ approvers: [{ kind: 'User', name: 'alice' }], auto: true }),
        alice
      )
    ).toBe(false);
    expect(resourcePermitHasUserReviewer(request({ approvers: [] }), alice)).toBe(false);
  });
});

describe('EventHub transition selection', () => {
  it('shows only the latest appended Active, Approved, Denied, or Expired transition to requestors', () => {
    const requests = [
      request({
        name: 'active',
        transitions: [
          { timestamp: '2026-09-02T08:00:00Z', type: 'Requested' },
          { timestamp: '2026-09-02T09:00:00Z', type: 'Active' },
        ],
      }),
      request({
        name: 'approved',
        transitions: [{ timestamp: '2026-09-02T10:00:00Z', type: 'Approved' }],
      }),
      request({
        name: 'denied',
        transitions: [{ timestamp: '2026-09-02T11:00:00Z', type: 'Denied' }],
      }),
      request({
        name: 'expired',
        transitions: [{ timestamp: '2026-09-02T12:00:00Z', type: 'Expired' }],
      }),
    ];

    expect(
      eventHubTransitionNotifications(requests as any, alice).map(
        notification => notification.transition.type
      )
    ).toEqual(['Expired', 'Denied', 'Approved', 'Active']);
  });

  it('shows Requested to reviewers only while it is the latest transition', () => {
    const reviewRequest = request({
      approvers: [{ kind: 'User', name: 'alice' }],
      requestor: 'bob',
      transitions: [
        { timestamp: '2026-09-02T08:00:00Z', type: 'Created' },
        { timestamp: '2026-09-02T09:00:00Z', type: 'Requested' },
      ],
    });
    const completedRequest = request({
      approvers: [{ kind: 'User', name: 'alice' }],
      name: 'completed',
      requestor: 'bob',
      transitions: [
        { timestamp: '2026-09-02T08:00:00Z', type: 'Requested' },
        { timestamp: '2026-09-02T10:00:00Z', type: 'Denied' },
      ],
    });

    const notifications = eventHubTransitionNotifications(
      [reviewRequest, completedRequest] as any,
      alice
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0].audience).toBe('reviewer');
    expect(notifications[0].transition.type).toBe('Requested');
    expect(notifications[0].request).toBe(reviewRequest);
  });

  it('sorts requestor and reviewer events together by newest transition', () => {
    const ownRequest = request({
      name: 'own',
      transitions: [{ timestamp: '2026-09-02T10:00:00Z', type: 'Approved' }],
    });
    const reviewRequest = request({
      approvers: [{ kind: 'Group', name: 'solar-approvers' }],
      name: 'review',
      requestor: 'bob',
      transitions: [{ timestamp: '2026-09-02T11:00:00Z', type: 'Requested' }],
    });

    expect(
      eventHubTransitionNotifications([ownRequest, reviewRequest] as any, alice).map(
        notification => `${notification.audience}:${notification.request.getName()}`
      )
    ).toEqual(['reviewer:review', 'requestor:own']);
  });

  it('filters action-required reviewer events from informational requestor transitions', () => {
    const ownRequest = request({
      name: 'own',
      transitions: [{ timestamp: '2026-09-02T10:00:00Z', type: 'Active' }],
    });
    const reviewRequest = request({
      approvers: [{ kind: 'User', name: 'alice' }],
      name: 'review',
      requestor: 'bob',
      transitions: [{ timestamp: '2026-09-02T11:00:00Z', type: 'Requested' }],
    });
    const notifications = eventHubTransitionNotifications(
      [ownRequest, reviewRequest] as any,
      alice
    );

    expect(
      filterEventHubNotificationsByType(notifications, 'action-required').map(notification =>
        notification.request.getName()
      )
    ).toEqual(['review']);
    expect(
      filterEventHubNotificationsByType(notifications, 'informational').map(notification =>
        notification.request.getName()
      )
    ).toEqual(['own']);
    expect(filterEventHubNotificationsByType(notifications, 'all')).toEqual(notifications);
  });

  it('filters relative timeframes inclusively and supports all time', () => {
    const now = Date.parse('2026-09-03T12:00:00Z');
    const requests = [
      request({
        name: 'recent',
        transitions: [{ timestamp: '2026-09-03T11:30:00Z', type: 'Active' }],
      }),
      request({
        name: 'one-day',
        transitions: [{ timestamp: '2026-09-02T12:00:00Z', type: 'Approved' }],
      }),
      request({
        name: 'two-weeks',
        transitions: [{ timestamp: '2026-08-20T12:00:00Z', type: 'Denied' }],
      }),
    ];
    const notifications = eventHubTransitionNotifications(requests as any, alice);

    expect(eventHubTimeframeCutoff('1h', now)).toBe(Date.parse('2026-09-03T11:00:00Z'));
    expect(filterEventHubNotificationsByTimeframe(notifications, '1h', now)).toHaveLength(1);
    expect(filterEventHubNotificationsByTimeframe(notifications, '24h', now)).toHaveLength(2);
    expect(filterEventHubNotificationsByTimeframe(notifications, '7d', now)).toHaveLength(2);
    expect(filterEventHubNotificationsByTimeframe(notifications, '30d', now)).toHaveLength(3);
    expect(filterEventHubNotificationsByTimeframe(notifications, 'all', now)).toEqual(
      notifications
    );
  });
});
