import type { ResourcePermit, ResourcePermitTransition } from '../../resources/resourcePermits';
import {
  resourcePermitStatusRequest,
  resourcePermitTransitions,
} from '../resource-permits/resourcePermitHelpers';

export type EventHubAudience = 'requestor' | 'reviewer';
export type EventHubEventType = 'all' | 'action-required' | 'informational';
export type EventHubTimeframe = '1h' | '24h' | '7d' | '30d' | 'all';

const REQUESTOR_TRANSITIONS = new Set(['Active', 'Approved', 'Denied', 'Expired']);
const TIMEFRAME_MILLISECONDS: Record<Exclude<EventHubTimeframe, 'all'>, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export interface EventHubUserInfo {
  groups?: string[];
  username?: string;
}

function objectData(item: any): any {
  return item?.jsonData || item || {};
}

/** Mirrors Capsule's UserListSpec matching contract. */
export function userReferenceMatches(
  kind: string | undefined,
  name: string | undefined,
  user: EventHubUserInfo | null | undefined
): boolean {
  const normalizedKind = String(kind || '')
    .trim()
    .toLowerCase();
  const normalizedName = String(name || '').trim();
  if (!normalizedName || !user?.username) return false;

  if (normalizedKind === 'group') {
    return (user.groups || []).includes(normalizedName);
  }

  return (
    (normalizedKind === 'user' || normalizedKind === 'serviceaccount') &&
    user.username === normalizedName
  );
}

/** Whether this is the exact authenticated requestor rather than merely one of its groups. */
export function resourcePermitBelongsToUser(
  request: ResourcePermit | any,
  user: EventHubUserInfo | null | undefined
): boolean {
  const requestor = objectData(request).spec?.requestor;
  return userReferenceMatches(requestor?.type, requestor?.name, user);
}

/** Review events are emitted only for explicitly named manual approvers. */
export function resourcePermitHasUserReviewer(
  request: ResourcePermit | any,
  user: EventHubUserInfo | null | undefined
): boolean {
  const approvals = resourcePermitStatusRequest(request)?.approvals;
  if (!approvals || approvals.auto) return false;

  return (approvals.approvers || []).some(approver =>
    userReferenceMatches(approver.kind, approver.name, user)
  );
}

export function newestFirst<T>(items: T[], timestamp: (item: T) => string): T[] {
  return [...items].sort((left, right) => {
    const leftTimestamp = Date.parse(timestamp(left)) || 0;
    const rightTimestamp = Date.parse(timestamp(right)) || 0;
    return rightTimestamp - leftTimestamp;
  });
}

export interface ResourcePermitTransitionNotification {
  audience: EventHubAudience;
  id: string;
  request: ResourcePermit;
  transition: ResourcePermitTransition;
}

export function filterEventHubNotificationsByType(
  notifications: ResourcePermitTransitionNotification[],
  eventType: EventHubEventType
): ResourcePermitTransitionNotification[] {
  if (eventType === 'all') return notifications;
  const audience: EventHubAudience = eventType === 'action-required' ? 'reviewer' : 'requestor';
  return notifications.filter(notification => notification.audience === audience);
}

export function eventHubTransitionNotifications(
  requests: ResourcePermit[] | null | undefined,
  user: EventHubUserInfo | null | undefined
): ResourcePermitTransitionNotification[] {
  const notifications = (requests || []).flatMap<ResourcePermitTransitionNotification>(request => {
    const uid =
      objectData(request).metadata?.uid || `${request.getNamespace()}/${request.getName()}`;
    const transitions = resourcePermitTransitions(request);
    const transition = transitions[transitions.length - 1];
    const result: ResourcePermitTransitionNotification[] = [];
    if (!transition) return result;

    if (resourcePermitBelongsToUser(request, user) && REQUESTOR_TRANSITIONS.has(transition.type)) {
      result.push({
        audience: 'requestor',
        id: `requestor:${uid}:${transition.type}:${transition.timestamp}:${transitions.length - 1}`,
        request,
        transition,
      });
    }

    if (resourcePermitHasUserReviewer(request, user) && transition.type === 'Requested') {
      result.push({
        audience: 'reviewer',
        id: `reviewer:${uid}:${transition.type}:${transition.timestamp}:${transitions.length - 1}`,
        request,
        transition,
      });
    }

    return result;
  });

  return newestFirst(
    notifications,
    notification => notification.transition.timestamp || notification.transition.eventTime || ''
  );
}

export function eventHubTimeframeCutoff(
  timeframe: EventHubTimeframe,
  now: number = Date.now()
): number | undefined {
  if (timeframe === 'all') return undefined;
  return now - TIMEFRAME_MILLISECONDS[timeframe];
}

export function filterEventHubNotificationsByTimeframe(
  notifications: ResourcePermitTransitionNotification[],
  timeframe: EventHubTimeframe,
  now: number = Date.now()
): ResourcePermitTransitionNotification[] {
  const cutoff = eventHubTimeframeCutoff(timeframe, now);
  if (cutoff === undefined) return notifications;

  return notifications.filter(notification => {
    const timestamp = Date.parse(
      notification.transition.timestamp || notification.transition.eventTime || ''
    );
    return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= now;
  });
}
