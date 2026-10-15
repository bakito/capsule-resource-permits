export const CAPSULE_TAGS_ANNOTATION = 'info.projectcapsule.dev/tags';

function objectData(resource: any): any {
  return resource?.jsonData || resource || {};
}

export function capsuleResourceMetadata(resource: any): Record<string, any> {
  return objectData(resource).metadata || resource?.metadata || {};
}

/** Parses the comma-separated Capsule tags annotation, preserving its declared order. */
export function capsuleResourceTags(resource: any): string[] {
  const value = capsuleResourceMetadata(resource).annotations?.[CAPSULE_TAGS_ANNOTATION];
  if (typeof value !== 'string') return [];

  return [
    ...new Set(
      value
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
    ),
  ];
}

export function capsuleResourceHasTag(resource: any, tag: string): boolean {
  return capsuleResourceTags(resource).includes(tag.trim());
}

export function isCapsuleResource(resource: any): boolean {
  const data = objectData(resource);
  const apiVersion =
    data.apiVersion || resource?.apiVersion || resource?.constructor?.apiVersion || '';
  const kind = data.kind || resource?.kind || resource?.constructor?.kind;
  return (
    String(apiVersion).split('/')[0] === 'addons.projectcapsule.dev' &&
    ['ResourcePermit', 'ResourcePermitTemplate', 'GlobalResourcePermitTemplate'].includes(kind)
  );
}

export function capsuleTagNamespacesFromSearch(search: string): string[] {
  return [
    ...new Set(
      (new URLSearchParams(search).get('namespace') || '')
        .split(/\s+/)
        .map(namespace => namespace.trim())
        .filter(namespace => namespace && namespace !== '*')
    ),
  ];
}
