import { resourcePermitIsReviewable, resourcePermitStatusRequest } from './resourcePermitHelpers';

export type ResourcePermitReviewVerdict = 'Approved' | 'Denied';

export interface ResourcePermitApprovalInput {
  duration: string;
  startTime: string;
}

function objectData(item: any) {
  return item?.jsonData || item || {};
}

export function hasResourcePermitReviewSnapshot(item: any): boolean {
  return resourcePermitStatusRequest(item) !== undefined;
}

export interface ResourcePermitReviewRequest {
  body: {
    status: {
      request?: {
        duration: string;
        startTime: string;
      };
      phase: ResourcePermitReviewVerdict;
      review?: {
        message?: string;
      };
    };
  };
  name: string;
  namespace: string;
  url: string;
  verdict: ResourcePermitReviewVerdict;
}

/** Formats an API timestamp for a browser-local datetime input without changing the instant. */
export function resourcePermitReviewDateTimeInput(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19);
}

/** Converts the browser-local review input back to the RFC3339 timestamp expected by Kubernetes. */
export function normalizeResourcePermitReviewStartTime(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Builds the status-subresource transition accepted by the ResourcePermit admission webhooks. */
export function buildResourcePermitReviewRequest(
  item: any,
  verdict: ResourcePermitReviewVerdict,
  comment: string,
  approval?: ResourcePermitApprovalInput
): ResourcePermitReviewRequest | null {
  const data = objectData(item);
  const kind = data.kind || item?.kind || item?.constructor?.kind;
  const name = data.metadata?.name || item?.getName?.();
  const namespace = data.metadata?.namespace || item?.getNamespace?.();
  const message = comment.trim();
  const startTime = approval
    ? normalizeResourcePermitReviewStartTime(approval.startTime)
    : undefined;

  if (
    (kind && kind !== 'ResourcePermit') ||
    !name ||
    !namespace ||
    (verdict === 'Denied' && !message) ||
    !resourcePermitIsReviewable(item) ||
    (verdict === 'Approved' && !hasResourcePermitReviewSnapshot(item)) ||
    (verdict === 'Approved' && approval !== undefined && !startTime)
  ) {
    return null;
  }

  const requestOverrides =
    verdict === 'Approved' && approval && startTime
      ? {
          // A concrete zero duration prevents template defaults from replacing an intentional
          // unlimited approval when the reviewer clears this field.
          duration: approval.duration.trim() || '0s',
          startTime,
        }
      : undefined;

  return {
    body: {
      status: {
        ...(requestOverrides ? { request: requestOverrides } : {}),
        phase: verdict,
        ...(message ? { review: { message } } : {}),
      },
    },
    name,
    namespace,
    url: `/apis/addons.projectcapsule.dev/v1beta2/namespaces/${encodeURIComponent(
      namespace
    )}/resourcepermits/${encodeURIComponent(name)}/status`,
    verdict,
  };
}
