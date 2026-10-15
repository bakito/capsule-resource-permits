import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { capsuleTagHref, openCapsuleTagActivity } from './CapsuleTagChips';
import { CapsuleTagSummary } from './CapsuleTagSummary';

const mocks = vi.hoisted(() => ({ launch: vi.fn() }));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  Activity: { launch: mocks.launch },
  Router: {
    createRouteURL: (name: string, params: any) => {
      expect(name).toBe('permits-tag');
      return `/permits/tags/${params.tag}`;
    },
  },
}));
vi.mock('./CapsuleTagSummary', () => ({
  CapsuleTagSummary: () => null,
}));

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { pathname: '/c/main/customresources/tenants.capsule.clastix.io', search: '' },
    },
  });
});

describe('Capsule tag navigation', () => {
  it('preserves unrelated query state and replaces the Namespace scope', () => {
    expect(
      capsuleTagHref('production', ['solar-test', 'solar-prod', 'solar-test'], '?resource=cpu')
    ).toEqual({
      href: '/permits/tags/production?resource=cpu&namespace=solar-test+solar-prod',
      namespaces: ['solar-test', 'solar-prod'],
    });
  });

  it('opens a temporary tag inventory tab on the right', () => {
    openCapsuleTagActivity('production', ['solar-prod']);

    expect(mocks.launch).toHaveBeenCalledOnce();
    const activity = mocks.launch.mock.calls[0][0];
    expect(activity).toMatchObject({
      cluster: 'main',
      location: 'split-right',
      temporary: true,
      title: 'Tag production',
    });
    const content = activity.content as ReactElement<any>;
    expect(content.type).toBe(CapsuleTagSummary);
    expect(content.props).toEqual({ tag: 'production', namespaces: ['solar-prod'] });
  });
});
