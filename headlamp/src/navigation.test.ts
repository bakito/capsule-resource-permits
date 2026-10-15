import { describe, expect, it } from 'vitest';
import { permitResourcePages, permitRoutes, permitSidebarEntries } from './navigation';

describe('Permits navigation', () => {
  it('exposes one top-level Permits menu with Requests and Templates', () => {
    expect(permitSidebarEntries.filter(entry => !entry.parent)).toEqual([
      expect.objectContaining({ name: 'permits', label: 'Permits' }),
    ]);
    expect(
      permitSidebarEntries.filter(entry => entry.parent === 'permits').map(entry => entry.label)
    ).toEqual(['Requests', 'Templates']);
    expect(
      permitSidebarEntries.every(entry => entry.url.includes('addons.projectcapsule.dev'))
    ).toBe(true);
  });
  it('owns rich canonical list and detail pages for all three addon kinds', () => {
    for (const resource of permitResourcePages) {
      expect(resource.crd).toMatch(/\.addons\.projectcapsule\.dev$/);
      const canonical = permitRoutes.filter(
        route => route.kind === resource.kind && route.path.startsWith('/customresources/')
      );
      expect(canonical).toHaveLength(2);
      expect(canonical.map(route => route.detail)).toEqual([false, true]);
      expect(canonical[1].path).toContain('/:namespace/:crName');
    }
    expect(new Set(permitRoutes.map(route => route.name)).size).toBe(permitRoutes.length);
  });
  it('keeps old bookmarks scoped and excludes unrelated Capsule pages', () => {
    expect(permitRoutes).toContainEqual(
      expect.objectContaining({
        kind: 'ResourcePermit',
        path: '/capsule/resource-permits/:namespace/:name',
        detail: true,
      })
    );
    expect(
      permitRoutes.every(
        route => !route.path.includes('capsule.clastix.io') && !route.path.includes('/tenants')
      )
    ).toBe(true);
  });
});
