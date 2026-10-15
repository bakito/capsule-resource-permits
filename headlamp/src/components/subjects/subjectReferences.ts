import type { ResourcePermitAccessEntity } from '../../resources/resourcePermits';
import {
  resourcePermitStatusRequest,
  resourcePermitTransitions,
} from '../resource-permits/resourcePermitHelpers';

export interface CapsuleSubject {
  kind: string;
  name: string;
  namespace?: string;
}

function objectData(item: any) {
  return item?.jsonData || item || {};
}

function normalizedKind(kind?: string): string {
  const value = String(kind || 'User').trim();
  switch (value.toLowerCase()) {
    case 'group':
      return 'Group';
    case 'serviceaccount':
    case 'service account':
      return 'ServiceAccount';
    case 'system':
      return 'System';
    case 'user':
      return 'User';
    default:
      return value || 'User';
  }
}

/** Normalizes Capsule and Kubernetes subject spellings into one identity. */
export function normalizeCapsuleSubject(subject: {
  kind?: string;
  name?: string;
  namespace?: string;
  type?: string;
}): CapsuleSubject | undefined {
  let kind = normalizedKind(subject.kind || subject.type);
  let name = String(subject.name || '').trim();
  let namespace = String(subject.namespace || '').trim() || undefined;
  if (!name) return undefined;

  const serviceAccountMatch = name.match(/^system:serviceaccount:([^:]+):(.+)$/);
  if (serviceAccountMatch) {
    kind = 'ServiceAccount';
    namespace = serviceAccountMatch[1];
    name = serviceAccountMatch[2];
  } else if (kind === 'ServiceAccount' && !namespace && name.includes('/')) {
    const separator = name.indexOf('/');
    namespace = name.slice(0, separator) || undefined;
    name = name.slice(separator + 1);
  }

  return { kind, name, ...(namespace ? { namespace } : {}) };
}

export function capsuleSubjectFromAccessEntity(
  entity?: ResourcePermitAccessEntity
): CapsuleSubject | undefined {
  if (!entity) return undefined;
  return normalizeCapsuleSubject({ kind: entity.type, name: entity.name });
}

/** Normalizes a Capsule ServiceAccount reference, using object scope when the API omits it. */
export function capsuleSubjectFromServiceAccountReference(
  reference: { name?: string; namespace?: string } | undefined,
  fallbackNamespace?: string
): CapsuleSubject | undefined {
  return normalizeCapsuleSubject({
    kind: 'ServiceAccount',
    name: reference?.name,
    namespace: reference?.namespace || fallbackNamespace,
  });
}

export function capsuleSubjectLabel(subject: CapsuleSubject): string {
  if (subject.kind === 'ServiceAccount' && subject.namespace) {
    return `${subject.kind}/${subject.namespace}/${subject.name}`;
  }
  return `${subject.kind}/${subject.name}`;
}

export function capsuleSubjectRouteIdentity(subject: CapsuleSubject): string {
  if (subject.kind === 'ServiceAccount' && subject.namespace) {
    return `system:serviceaccount:${subject.namespace}:${subject.name}`;
  }
  return subject.name;
}

export function capsuleSubjectKey(subject: CapsuleSubject): string {
  return `${subject.kind.toLowerCase()}|${subject.namespace || ''}|${subject.name}`;
}

export function capsuleSubjectsEqual(
  left: CapsuleSubject | undefined,
  right: CapsuleSubject | undefined
): boolean {
  return !!left && !!right && capsuleSubjectKey(left) === capsuleSubjectKey(right);
}

function accessEntityMentionsSubject(
  entity: ResourcePermitAccessEntity | undefined,
  subject: CapsuleSubject
): boolean {
  if (capsuleSubjectsEqual(capsuleSubjectFromAccessEntity(entity), subject)) return true;
  return subject.kind === 'Group' && !!entity?.groups?.some(group => group === subject.name);
}

/** Every place where a Tenant refers to the selected subject. */

/** Status-reported Tenant promotions for one exact ServiceAccount identity. */

/** Whether a TenantOwner object is defined for the selected identity. */

/** Whether a native RoleBinding or ClusterRoleBinding contains the subject. */
export function bindingMentionsSubject(binding: any, subject: CapsuleSubject): boolean {
  const data = objectData(binding);
  return (data.subjects || []).some((candidate: any) =>
    capsuleSubjectsEqual(normalizeCapsuleSubject(candidate), subject)
  );
}

/** Subject identities declared by a rendered RBAC-style manifest. */
export function manifestSubjects(manifest: any): CapsuleSubject[] {
  const subjects = manifest?.subjects || manifest?.spec?.subjects || [];
  const result = new Map<string, CapsuleSubject>();
  for (const candidate of subjects) {
    const subject = normalizeCapsuleSubject(candidate);
    if (subject) result.set(capsuleSubjectKey(subject), subject);
  }
  return [...result.values()];
}

/** Proxy rules in a GlobalProxySettings object that grant access to the selected subject. */

/** Every place where a ResourcePermit refers to the selected subject. */
export function resourcePermitSubjectMentions(request: any, subject: CapsuleSubject): string[] {
  const data = objectData(request);
  const mentions = new Set<string>();
  const isRequestor = accessEntityMentionsSubject(data.spec?.requestor, subject);
  if (isRequestor) mentions.add('Requestor');
  if (accessEntityMentionsSubject(data.status?.review?.reviewer, subject)) mentions.add('Reviewer');

  for (const transition of resourcePermitTransitions(data)) {
    if (!capsuleSubjectsEqual(normalizeCapsuleSubject(transition.actor), subject)) continue;
    if (transition.type === 'Approved' || transition.type === 'Denied') {
      mentions.add('Reviewer');
    } else if (!isRequestor || (transition.type !== 'Created' && transition.type !== 'Requested')) {
      mentions.add(`${transition.type} actor`);
    }
  }

  const statusRequest = resourcePermitStatusRequest(data);
  const serviceAccount = capsuleSubjectFromServiceAccountReference(statusRequest?.impersonation);
  if (capsuleSubjectsEqual(serviceAccount, subject)) mentions.add('Execution ServiceAccount');

  for (const resource of statusRequest?.resources || []) {
    for (const target of resource.targets || []) {
      if (manifestSubjects(target).some(candidate => capsuleSubjectsEqual(candidate, subject))) {
        mentions.add(`Rendered ${target.kind || 'resource'} subject`);
      }
    }
  }

  return [...mentions];
}
