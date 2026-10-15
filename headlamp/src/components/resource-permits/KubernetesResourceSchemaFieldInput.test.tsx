import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KubernetesResourceSchemaFieldInput } from './KubernetesResourceSchemaFieldInput';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@kinvolk/headlamp-plugin/lib', () => ({
  ApiProxy: { request: mocks.request },
}));

const secretSelector = {
  widget: 'kubernetes-resource',
  source: { apiVersion: 'v1', kind: 'Secret' },
};

describe('Kubernetes resource schema field errors', () => {
  beforeEach(() => mocks.request.mockReset());

  it('shows a Kubernetes 403 response in the form field', async () => {
    mocks.request.mockRejectedValueOnce({
      response: { data: { message: 'secrets is forbidden for User alice' } },
    });

    render(
      <KubernetesResourceSchemaFieldInput
        extension={secretSelector}
        label="Secret"
        onChange={() => undefined}
        requestNamespace="solar-test"
        value=""
      />
    );

    expect(await screen.findByText('secrets is forbidden for User alice')).toBeTruthy();
  });

  it('shows discovery failures instead of an empty-options message', async () => {
    mocks.request.mockResolvedValueOnce({ resources: [] });

    render(
      <KubernetesResourceSchemaFieldInput
        extension={secretSelector}
        label="Secret"
        onChange={() => undefined}
        requestNamespace="solar-test"
        value=""
      />
    );

    expect(
      await screen.findByText('The Kubernetes API does not expose a listable Secret resource.')
    ).toBeTruthy();
  });
});
