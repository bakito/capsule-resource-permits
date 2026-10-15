import { MetadataDisplay } from '@kinvolk/headlamp-plugin/lib/components/common';
import React, { Children, isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CapsuleTagChips } from './CapsuleTagChips';
import { processCapsuleTagDetailsSections } from './CapsuleTagsDetailsIntegration';

vi.mock('@kinvolk/headlamp-plugin/lib/components/common', () => ({
  MetadataDisplay: () => null,
}));
vi.mock('./CapsuleTagChips', () => ({
  CapsuleTagChips: () => null,
}));

describe('Capsule tags detail processor', () => {
  it('adds linked tags to the metadata rows of annotated Capsule resources', () => {
    const resource = {
      apiVersion: 'addons.projectcapsule.dev/v1beta2',
      kind: 'ResourcePermit',
      metadata: {
        annotations: { 'info.projectcapsule.dev/tags': 'production, security' },
        name: 'solar',
      },
    };
    const metadata = (
      <div>
        <MetadataDisplay
          resource={resource as any}
          extraRows={() => [{ name: 'Status', value: 'Ready' }]}
        />
      </div>
    );
    const sections = processCapsuleTagDetailsSections(resource, [
      { id: 'METADATA', section: metadata },
      { id: 'EVENTS', section: <div /> },
    ]);
    const metadataSection = sections[0].section as React.ReactElement<any>;
    const metadataDisplay = Children.toArray(metadataSection.props.children).find(
      child => isValidElement(child) && child.type === MetadataDisplay
    ) as React.ReactElement<any>;
    const rows = metadataDisplay.props.extraRows(resource);

    expect(rows.map((row: any) => row.name)).toEqual(['Status', 'Tags']);
    expect(rows[1].value.type).toBe(CapsuleTagChips);
    expect(rows[1].value.props.resource).toBe(resource);
  });

  it('leaves untagged, Capsule core, and other addon details unchanged', () => {
    const sections = [{ id: 'METADATA', section: <div /> }];
    expect(
      processCapsuleTagDetailsSections(
        { apiVersion: 'addons.projectcapsule.dev/v1beta2', metadata: {} },
        sections
      )
    ).toBe(sections);
    for (const resource of [
      { apiVersion: 'capsule.clastix.io/v1beta2', kind: 'ResourcePermit' },
      { apiVersion: 'addons.projectcapsule.dev/v1beta2', kind: 'OtherAddon' },
    ]) {
      expect(
        processCapsuleTagDetailsSections(
          {
            ...resource,
            metadata: { annotations: { 'info.projectcapsule.dev/tags': 'production' } },
          },
          sections
        )
      ).toBe(sections);
    }
    expect(
      processCapsuleTagDetailsSections(
        {
          apiVersion: 'v1',
          metadata: { annotations: { 'info.projectcapsule.dev/tags': 'production' } },
        },
        sections
      )
    ).toBe(sections);
  });
});
