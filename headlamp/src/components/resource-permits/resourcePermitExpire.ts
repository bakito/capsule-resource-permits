import { isPermitRequest } from '../../resources/permitApi';
import { resourcePermitPhase } from './resourcePermitHelpers';

function objectData(item: any) {
  return item?.jsonData || item || {};
}

export function canExpireResourcePermit(item: any): boolean {
  const phase = resourcePermitPhase(item);
  return isPermitRequest(item) && phase !== 'Unknown' && phase !== 'Expired';
}

export interface ResourcePermitExpireRequest {
  body: {
    status: {
      phase: 'Expired';
    };
  };
  name: string;
  namespace: string;
  resourceUrl: string;
  url: string;
}

/** Requests the terminal lifecycle transition without reconstructing controller-owned status. */
export function buildResourcePermitExpireRequest(item: any): ResourcePermitExpireRequest | null {
  const data = objectData(item);
  const kind = data.kind || item?.kind || item?.constructor?.kind;
  const name = data.metadata?.name || item?.getName?.();
  const namespace = data.metadata?.namespace || item?.getNamespace?.();
  if (
    (kind && kind !== 'ResourcePermit') ||
    !name ||
    !namespace ||
    !canExpireResourcePermit(item)
  ) {
    return null;
  }

  const resourceUrl = `/apis/addons.projectcapsule.dev/v1beta2/namespaces/${encodeURIComponent(
    namespace
  )}/resourcepermits/${encodeURIComponent(name)}`;
  return {
    body: { status: { phase: 'Expired' } },
    name,
    namespace,
    resourceUrl,
    url: `${resourceUrl}/status`,
  };
}

export function replaceResourcePermitData(item: any, response: any) {
  if (!item) return;
  const refreshed = response?.jsonData || response;
  if (!refreshed) return;
  if (item.jsonData) item.jsonData = refreshed;
  else Object.assign(item, refreshed);
}
