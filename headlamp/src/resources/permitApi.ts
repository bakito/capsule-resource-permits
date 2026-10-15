export const PERMITS_API_VERSION = 'addons.projectcapsule.dev/v1beta2';

/** Global Headlamp actions must never mutate an identically named foreign CR. */
export function isPermitRequest(item: any): boolean {
  const data = item?.jsonData || item || {};
  const kind = data.kind || item?.kind || item?.constructor?.kind;
  const apiVersion = data.apiVersion || item?.apiVersion || item?.constructor?.apiVersion;
  return (
    (!kind || kind === 'ResourcePermit') && (!apiVersion || apiVersion === PERMITS_API_VERSION)
  );
}
