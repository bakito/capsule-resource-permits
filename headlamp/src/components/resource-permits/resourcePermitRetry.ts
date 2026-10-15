import { isPermitRequest } from '../../resources/permitApi';
import { resourcePermitPhase } from './resourcePermitHelpers';

function objectData(item: any) {
  return item?.jsonData || item || {};
}

export function canRetryResourcePermit(item: any): boolean {
  const data = objectData(item);
  return (
    isPermitRequest(item) &&
    resourcePermitPhase(data) === 'Failed' &&
    Boolean(data.status?.failure?.retryPhase)
  );
}

export interface ResourcePermitRetryRequest {
  body: {
    status: {
      phase: 'Retrying';
    };
  };
  name: string;
  namespace: string;
  resourceUrl: string;
  url: string;
}

/** Requests one controller-owned retry without reconstructing status.request or failure state. */
export function buildResourcePermitRetryRequest(item: any): ResourcePermitRetryRequest | null {
  const data = objectData(item);
  const kind = data.kind || item?.kind || item?.constructor?.kind;
  const name = data.metadata?.name || item?.getName?.();
  const namespace = data.metadata?.namespace || item?.getNamespace?.();
  if ((kind && kind !== 'ResourcePermit') || !name || !namespace || !canRetryResourcePermit(item)) {
    return null;
  }

  const resourceUrl = `/apis/addons.projectcapsule.dev/v1beta2/namespaces/${encodeURIComponent(
    namespace
  )}/resourcepermits/${encodeURIComponent(name)}`;
  return {
    body: { status: { phase: 'Retrying' } },
    name,
    namespace,
    resourceUrl,
    url: `${resourceUrl}/status`,
  };
}
