import { describe, expect, it, vi } from 'vitest';
import { CapsuleTagChips } from './CapsuleTagChips';
import { addCapsuleTagsTableColumn } from './CapsuleTagsTable';

vi.mock('./CapsuleTagChips', () => ({
  CapsuleTagChips: () => null,
}));

describe('Capsule tags table processor', () => {
  const columns = [{ id: 'name', label: 'Name' }, 'age'];

  it('adds the shared Tags column before Age on Capsule inventories', () => {
    const result = addCapsuleTagsTableColumn({ id: 'permits-resource-permits', columns });

    expect(result.map(column => (typeof column === 'string' ? column : column.id))).toEqual([
      'name',
      'permits-tags',
      'age',
    ]);
    const tagColumn = result[1] as any;
    const resource = {
      metadata: { annotations: { 'info.projectcapsule.dev/tags': 'production, security' } },
    };
    expect(tagColumn.getValue(resource)).toBe('production, security');
    expect(tagColumn.render(resource).type).toBe(CapsuleTagChips);
  });

  it('covers ResourcePoolClaims but ignores non-resource and already processed tables', () => {
    expect(
      addCapsuleTagsTableColumn({ id: 'permits-resource-permit-templates', columns })
    ).toHaveLength(3);
    expect(addCapsuleTagsTableColumn({ id: 'capsule-overview-events', columns })).toBe(columns);

    const processed = addCapsuleTagsTableColumn({ id: 'permits-resource-permits', columns });
    expect(addCapsuleTagsTableColumn({ id: 'permits-resource-permits', columns: processed })).toBe(
      processed
    );
  });
});
