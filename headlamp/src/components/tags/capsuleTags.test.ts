import { describe, expect, it } from 'vitest';
import {
  CAPSULE_TAGS_ANNOTATION,
  capsuleResourceHasTag,
  capsuleResourceTags,
  capsuleTagNamespacesFromSearch,
  isCapsuleResource,
} from './capsuleTags';

describe('Capsule resource tags', () => {
  const resource = {
    apiVersion: 'addons.projectcapsule.dev/v1beta2',
    kind: 'ResourcePermit',
    metadata: {
      annotations: {
        [CAPSULE_TAGS_ANNOTATION]: ' production, security,production, , customer-facing ',
      },
    },
  };

  it('parses, trims, removes empty values, and deduplicates tags', () => {
    expect(capsuleResourceTags(resource)).toEqual(['production', 'security', 'customer-facing']);
    expect(capsuleResourceTags({ jsonData: resource })).toEqual([
      'production',
      'security',
      'customer-facing',
    ]);
  });

  it('matches exact tags and recognizes only the permit addon resources', () => {
    expect(capsuleResourceHasTag(resource, ' security ')).toBe(true);
    expect(capsuleResourceHasTag(resource, 'prod')).toBe(false);
    expect(isCapsuleResource(resource)).toBe(true);
    expect(isCapsuleResource({ apiVersion: 'v1', kind: 'Namespace' })).toBe(false);
    expect(isCapsuleResource({ ...resource, apiVersion: 'capsule.clastix.io/v1beta2' })).toBe(
      false
    );
    expect(isCapsuleResource({ ...resource, kind: 'OtherAddon' })).toBe(false);
  });

  it('normalizes the selected Namespace query', () => {
    expect(capsuleTagNamespacesFromSearch('?namespace=solar-prod+solar-test+solar-prod+*')).toEqual(
      ['solar-prod', 'solar-test']
    );
  });
});
