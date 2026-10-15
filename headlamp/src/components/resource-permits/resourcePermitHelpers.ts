import { isPermitRequest } from '../../resources/permitApi';
import type {
  GlobalResourcePermitTemplateResource,
  ResourcePermitAccessEntity,
  ResourcePermitPhase,
  ResourcePermitRenderedResource,
  ResourcePermitStatusRequest,
  ResourcePermitTemplateReference,
  ResourcePermitTransition,
  ResourcePermitVerdict,
} from '../../resources/resourcePermits';
import { normalizeIconRef } from '../../utils/tenantMeta';

function objectData(item: any) {
  return item?.jsonData || item || {};
}

export type ResourcePermitPhaseColor = 'error' | 'info' | 'success' | 'warning';

export interface ResourcePermitPhasePresentation {
  chipColor: ResourcePermitPhaseColor;
  color: string;
  icon: string;
  textColor?: string;
}

export function resourcePermitPhase(item: any): ResourcePermitPhase | 'Unknown' {
  return objectData(item).status?.phase || 'Unknown';
}

export function resourcePermitPhaseColor(phase: string): ResourcePermitPhaseColor {
  return resourcePermitPhasePresentation(phase).chipColor;
}

/** Shared lifecycle presentation for phase chips, summaries, and the audit timeline. */
export function resourcePermitPhasePresentation(phase: string): ResourcePermitPhasePresentation {
  switch (phase.toLowerCase()) {
    case 'created':
      return {
        chipColor: 'info',
        color: '#1976d2',
        icon: 'mdi:file-document-plus-outline',
      };
    case 'active':
      return { chipColor: 'success', color: '#00897b', icon: 'mdi:key-variant' };
    case 'denied':
      return { chipColor: 'error', color: '#d32f2f', icon: 'mdi:close-thick' };
    case 'failed':
      return { chipColor: 'error', color: '#c62828', icon: 'mdi:alert-circle-outline' };
    case 'expired':
      return { chipColor: 'warning', color: '#e65100', icon: 'mdi:timer-off-outline' };
    case 'archiving':
      return {
        chipColor: 'warning',
        color: '#f9a825',
        icon: 'mdi:archive-clock-outline',
        textColor: '#4f3b00',
      };
    case 'approved':
      return { chipColor: 'success', color: '#2e7d32', icon: 'mdi:check-bold' };
    case 'requested':
      return { chipColor: 'info', color: '#607d8b', icon: 'mdi:file-clock-outline' };
    case 'pending':
      return { chipColor: 'warning', color: '#ed6c02', icon: 'mdi:clock-outline' };
    case 'retrying':
      return { chipColor: 'warning', color: '#f9a825', icon: 'mdi:sync' };
    default:
      return { chipColor: 'info', color: '#7b1fa2', icon: 'mdi:circle-medium' };
  }
}

export function formatAccessEntity(entity?: ResourcePermitAccessEntity): string {
  if (!entity?.name) return 'Unknown';
  return entity.type ? `${entity.type}/${entity.name}` : entity.name;
}

/** The controller-resolved request snapshot is authoritative for review and execution details. */
export function resourcePermitStatusRequest(item: any): ResourcePermitStatusRequest | undefined {
  return objectData(item).status?.request;
}

/** Resolved template identity with spec as a fallback before status reconciliation. */
export function resourcePermitTemplateReference(
  item: any
): ResourcePermitTemplateReference | undefined {
  const data = objectData(item);
  return resourcePermitStatusRequest(data)?.template || data.spec?.template;
}

/** The concrete ServiceAccount Capsule reports as the request execution identity. */
export function resourcePermitServiceAccountEntity(
  item: any
): ResourcePermitAccessEntity | undefined {
  const serviceAccount = resourcePermitStatusRequest(item)?.impersonation;
  const name = String(serviceAccount?.name || '').trim();
  const namespace = String(serviceAccount?.namespace || '').trim();
  if (!name) return undefined;

  const qualifiedName =
    namespace && !name.includes('/') && !name.startsWith('system:serviceaccount:')
      ? `${namespace}/${name}`
      : name;
  return { type: 'ServiceAccount', name: qualifiedName };
}

/** Chronological, append-only lifecycle transitions reported by Capsule. */
export function resourcePermitTransitions(item: any): ResourcePermitTransition[] {
  const transitions = objectData(item).status?.transitions;
  return Array.isArray(transitions) ? transitions : [];
}

/** Future retention deadline shown separately from the authenticated transition history. */
export function resourcePermitScheduledArchivingAt(item: any): string | undefined {
  const data = objectData(item);
  const keepUntil = String(data.status?.keepUntil || '').trim();
  if (!keepUntil || Number.isNaN(Date.parse(keepUntil))) return undefined;

  return keepUntil;
}

/** Retention is captured in the immutable review snapshot; a missing deadline is not zero retention. */
export function resourcePermitRetentionMessage(item: any): string {
  const request = resourcePermitStatusRequest(item);
  if (!request) return 'Archive retention has not been reported yet.';
  const keepFor = String(request.keepFor || '').trim();
  if (!keepFor) return 'No archive retention. Deleted immediately after expiry.';
  if (!/^([0-9]+(\.[0-9]+)?[smhdw])+$/.test(keepFor)) {
    return `Archive retention: ${keepFor}.`;
  }
  const units: Record<string, string> = {
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
    w: 'week',
  };
  const parts = [...keepFor.matchAll(/([0-9]+(?:\.[0-9]+)?)([smhdw])/g)]
    .filter(match => Number(match[1]) > 0)
    .map(match => `${Number(match[1])} ${units[match[2]]}${Number(match[1]) === 1 ? '' : 's'}`);
  return parts.length
    ? `Kept for ${parts.join(', ')} after expiry.`
    : 'No archive retention. Deleted immediately after expiry.';
}

/** Future approved activation time, before Capsule has recorded the Active transition. */
export function resourcePermitScheduledActivationAt(
  item: any,
  now: number = Date.now()
): string | undefined {
  const data = objectData(item);
  if (resourcePermitPhase(data) !== 'Approved') return undefined;
  if (resourcePermitTransitions(data).some(transition => transition.type === 'Active')) {
    return undefined;
  }

  const startTime = String(resourcePermitStatusRequest(data)?.startTime || '').trim();
  const activationTime = Date.parse(startTime);
  if (!startTime || Number.isNaN(activationTime) || activationTime <= now) return undefined;
  return startTime;
}

export interface ResourcePermitScheduledLifecycle {
  stage: 'Active' | 'Archiving';
  timestamp?: string;
  description?: string;
}

/** The one pending controller lifecycle action displayed after authenticated history. */
export function resourcePermitScheduledLifecycle(
  item: any,
  now: number = Date.now()
): ResourcePermitScheduledLifecycle | undefined {
  const activationAt = resourcePermitScheduledActivationAt(item, now);
  if (activationAt) return { stage: 'Active', timestamp: activationAt };

  const archivingAt = resourcePermitScheduledArchivingAt(item);
  if (archivingAt) return { stage: 'Archiving', timestamp: archivingAt };
  if (resourcePermitPhase(item) === 'Denied') {
    return { stage: 'Archiving', description: resourcePermitRetentionMessage(item) };
  }
  return undefined;
}

export function resourcePermitReviewTransition(item: any): ResourcePermitTransition | undefined {
  const transitions = resourcePermitTransitions(item);
  const verdict = String(objectData(item).status?.review?.verdict || '');
  const expectedType = verdict === 'Approved' || verdict === 'Denied' ? verdict : undefined;

  for (let index = transitions.length - 1; index >= 0; index -= 1) {
    const transition = transitions[index];
    if (
      (expectedType && transition.type === expectedType) ||
      (!expectedType && (transition.type === 'Approved' || transition.type === 'Denied'))
    ) {
      return transition;
    }
  }

  return undefined;
}

/** Authenticated reviewer, falling back to the authoritative review transition actor. */
export function resourcePermitReviewEntity(item: any): ResourcePermitAccessEntity | undefined {
  const reviewer = objectData(item).status?.review?.reviewer;
  if (reviewer?.name) return reviewer;
  return resourcePermitReviewTransition(item)?.actor;
}

export function resourcePermitReviewVerdict(item: any): ResourcePermitVerdict | undefined {
  const verdict = objectData(item).status?.review?.verdict;
  if (verdict === 'Approved' || verdict === 'Denied') return verdict;
  const transitionType = resourcePermitReviewTransition(item)?.type;
  return transitionType === 'Approved' || transitionType === 'Denied' ? transitionType : undefined;
}

export function resourcePermitReviewMessage(item: any): string | undefined {
  return objectData(item).status?.review?.message || resourcePermitReviewTransition(item)?.message;
}

/** Pending review placeholders are not completed verdicts. */
export function resourcePermitReviewRecorded(item: any): boolean {
  return resourcePermitReviewVerdict(item) !== undefined;
}

export function resourcePermitReady(item: any): boolean {
  const conditions = objectData(item).status?.conditions || [];
  return conditions.some(
    (condition: any) =>
      condition?.type === 'Ready' && String(condition.status).toLowerCase() === 'true'
  );
}

export function resourcePermitIsReviewable(item: any): boolean {
  const phase = resourcePermitPhase(item);
  return (
    isPermitRequest(item) &&
    (phase === 'Requested' || phase === 'Pending') &&
    resourcePermitReady(item)
  );
}

/** Headlamp serializes its Namespace filter as a space-delimited query value. */
export function resourcePermitNamespacesFromSearch(search: string): string[] {
  const value = new URLSearchParams(search).get('namespace') || '';
  return [
    ...new Set(
      value
        .split(/\s+/)
        .map(namespace => namespace.trim())
        .filter(Boolean)
    ),
  ];
}

export interface RenderedResourcePermitTarget {
  apiVersion: string;
  id: string;
  kind: string;
  manifest: Record<string, any>;
  name: string;
  namespace?: string;
  policy: Record<string, any>;
  resourceIndex: number;
  targetIndex: number;
}

export function flattenRenderedResourcePermitTargets(item: any): RenderedResourcePermitTarget[] {
  const resources: ResourcePermitRenderedResource[] =
    resourcePermitStatusRequest(item)?.resources || [];
  return resources.flatMap((resource, resourceIndex) =>
    (resource.targets || []).map((target, targetIndex) => ({
      apiVersion: target.apiVersion || 'v1',
      id: `${resourceIndex}-${targetIndex}-${target.kind || 'Resource'}-${
        target.metadata?.namespace || '-'
      }-${target.metadata?.name || targetIndex}`,
      kind: target.kind || 'Resource',
      manifest: target,
      name: target.metadata?.name || 'Unnamed',
      namespace: target.metadata?.namespace,
      policy: resource.policy || {},
      resourceIndex,
      targetIndex,
    }))
  );
}

export interface ResourcePermitAuditEntry {
  actor: string;
  actorEntity?: ResourcePermitAccessEntity;
  eventTime?: string;
  message: string;
  reason: string;
  stage: string;
  timestamp?: string;
  verdict?: ResourcePermitVerdict;
}

export function resourcePermitAuditTrail(item: any): ResourcePermitAuditEntry[] {
  return resourcePermitTransitions(item).map(transition => ({
    actor: formatAccessEntity(transition.actor),
    actorEntity: transition.actor,
    eventTime: transition.eventTime,
    message: transition.message || transition.reason,
    reason: transition.reason,
    stage: transition.type,
    timestamp: transition.timestamp,
    verdict:
      transition.type === 'Approved' || transition.type === 'Denied' ? transition.type : undefined,
  }));
}

export function templateApprovalMode(item: any): 'Automatic' | 'Manual' {
  return objectData(item).spec?.approvals?.auto ? 'Automatic' : 'Manual';
}

export function templateTargetCount(item: any): number {
  const resources: GlobalResourcePermitTemplateResource[] = objectData(item).spec?.resources || [];
  return resources.reduce(
    (count, resource) => count + (resource.targets?.length || 0) + (resource.template ? 1 : 0),
    0
  );
}

export function templateNamespaces(item: any): string[] {
  const namespaces = objectData(item).status?.namespaces;
  return Array.isArray(namespaces) ? namespaces : [];
}

/** One catalog inventory can contain both local and cluster-scoped templates. */
export function combineResourcePermitTemplates<TNamespaced, TGlobal>(
  namespaced: TNamespaced[] | null | undefined,
  global: TGlobal[] | null | undefined
): Array<TNamespaced | TGlobal> {
  return [...(namespaced || []), ...(global || [])];
}

function templateAnnotations(item: any): Record<string, string> {
  return objectData(item).metadata?.annotations || {};
}

/** Optional catalog description shared by template lists, details, and creation. */
export function resourcePermitTemplateDescription(item: any): string | undefined {
  const description = templateAnnotations(item)['info.projectcapsule.dev/description'];
  return typeof description === 'string' && description.trim() ? description.trim() : undefined;
}

/** Safe Iconify, Font Awesome, or image reference from the conventional info annotation. */
export function resourcePermitTemplateIcon(item: any): string | undefined {
  return normalizeIconRef(templateAnnotations(item)['info.projectcapsule.dev/icon']);
}
