import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { capsuleSubjectHref, openCapsuleSubjectActivity } from './CapsuleSubjectLink';
import { CapsuleSubjectSummary } from './CapsuleSubjectSummary';

const mocks = vi.hoisted(() => ({ launch: vi.fn() }));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  Activity: { launch: mocks.launch },
  Router: {
    createRouteURL: (name: string) => {
      expect(name).toBe('permits-subject');
      return '/permits/subjects/User/alice';
    },
  },
}));
vi.mock('./CapsuleSubjectSummary', () => ({
  CapsuleSubjectSummary: () => null,
}));

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { pathname: '/c/main/capsule/subjects/User/alice', search: '' },
    },
  });
});

describe('Capsule subject activity', () => {
  it('keeps subject links in the addon route with their namespace scope', () => {
    expect(
      capsuleSubjectHref({ kind: 'User', name: 'alice' }, ['tenant-a'], '?resource=cpu')
    ).toEqual({
      href: '/permits/subjects/User/alice?resource=cpu&namespace=tenant-a',
      namespaces: ['tenant-a'],
    });
  });
  it('opens a temporary subject summary tab on the right', () => {
    openCapsuleSubjectActivity({ kind: 'User', name: 'alice' }, ['solar-prod', 'solar-test']);

    expect(mocks.launch).toHaveBeenCalledOnce();
    const activity = mocks.launch.mock.calls[0][0];
    expect(activity).toMatchObject({
      id: expect.stringContaining('permits-subject User alice'),
      cluster: 'main',
      location: 'split-right',
      temporary: true,
      title: 'Subject User/alice',
    });
    const content = activity.content as ReactElement<any>;
    expect(content.type).toBe(CapsuleSubjectSummary);
    expect(content.props).toMatchObject({
      kind: 'User',
      name: 'alice',
      namespaces: ['solar-prod', 'solar-test'],
    });
  });
});
