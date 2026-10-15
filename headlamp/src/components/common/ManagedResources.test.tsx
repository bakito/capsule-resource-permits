// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFetchedResources } from './ManagedResources';

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock('../../resources/tenantResources', async () =>
  vi.importActual('../../resources/tenantResources.helpers')
);
vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  ApiProxy: {},
  K8s: { ResourceClasses: { RoleBinding: { apiGet: mocks.apiGet } } },
}));
vi.mock('@kinvolk/headlamp-plugin/lib/CommonComponents', () => ({
  Link: () => null,
  ResourceListView: () => null,
}));
vi.mock('@kinvolk/headlamp-plugin/lib/components/common', () => ({
  DateLabel: () => null,
  SimpleTable: () => null,
}));
vi.mock('@kinvolk/headlamp-plugin/lib/lib/k8s/crd', () => ({ makeCustomResourceClass: vi.fn() }));
vi.mock('./AnchoredSectionBox', () => ({ AnchoredSectionBox: () => null }));
vi.mock('./SectionAnchor', () => ({
  anchoredResourceListHeaderProps: vi.fn(),
  AnchoredSubheading: () => null,
}));

describe('managed inventory live reads', () => {
  it('shows reported rows before GET, replaces live updates, and closes the watch on unmount', async () => {
    let receive: (data: any) => void = () => {};
    const cancel = vi.fn();
    mocks.apiGet.mockImplementation((onGet: any) => {
      receive = onGet;
      return () => Promise.resolve(cancel);
    });
    const applied = [
      {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        name: 'permit-access',
        namespace: 'solar-test',
      },
    ];
    const { result, unmount } = renderHook(() => useFetchedResources(applied, 'main'));
    expect(result.current[0].metadata).toMatchObject({
      name: 'permit-access',
      namespace: 'solar-test',
    });
    expect(mocks.apiGet.mock.calls[0][4]).toEqual({ cluster: 'main' });
    const live = {
      ...applied[0],
      metadata: { name: 'permit-access', namespace: 'solar-test', resourceVersion: '1' },
    };
    await act(async () => receive(live));
    expect(result.current[0]).toBe(live);
    const updated = { ...live, metadata: { ...live.metadata, resourceVersion: '2' } };
    await act(async () => receive(updated));
    expect(result.current[0]).toBe(updated);
    unmount();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
