import {
  MetadataDisplay,
  type NameValueTableRow,
} from '@kinvolk/headlamp-plugin/lib/components/common';
import React, { Children, cloneElement, isValidElement } from 'react';
import { CapsuleTagChips } from './CapsuleTagChips';
import { capsuleResourceTags, isCapsuleResource } from './capsuleTags';

function rowsWithTags(
  existing:
    | NameValueTableRow[]
    | ((resource: any) => NameValueTableRow[] | null)
    | null
    | undefined,
  resource: any
): NameValueTableRow[] {
  const rows = typeof existing === 'function' ? existing(resource) || [] : existing || [];
  if (rows.some(row => row.name === 'Tags')) return rows;
  return [...rows, { name: 'Tags', value: <CapsuleTagChips resource={resource} /> }];
}

/** Adds clickable annotation tags to the standard metadata panel of every Capsule resource. */
export function processCapsuleTagDetailsSections(resource: any, sections: any[]) {
  if (!isCapsuleResource(resource) || capsuleResourceTags(resource).length === 0) return sections;

  return sections.map(section => {
    if (section?.id !== 'METADATA' || !isValidElement(section.section)) return section;
    const metadataSection = section.section as React.ReactElement<any>;
    let changed = false;
    const children = Children.map(metadataSection.props.children, child => {
      if (!isValidElement(child)) return child;
      const childElement = child as React.ReactElement<any>;
      const isMetadata =
        childElement.type === MetadataDisplay ||
        (childElement.props.resource === resource && 'extraRows' in childElement.props);
      if (!isMetadata) return child;
      changed = true;
      return cloneElement(childElement, {
        extraRows: (item: any) => rowsWithTags(childElement.props.extraRows, item),
      });
    });
    return changed
      ? { ...section, section: cloneElement(metadataSection, undefined, children) }
      : section;
  });
}
