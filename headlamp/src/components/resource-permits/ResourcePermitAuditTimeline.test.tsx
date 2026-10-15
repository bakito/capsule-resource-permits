import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResourcePermitAuditTimeline } from './ResourcePermitAuditTimeline';

vi.mock('../subjects/CapsuleSubjectLink', () => ({ CapsuleSubjectLink: () => null }));
vi.mock('../subjects/subjectReferences', () => ({
  capsuleSubjectFromAccessEntity: () => undefined,
}));

describe('ResourcePermit audit timeline', () => {
  it('shows Archiving for a denied request before the controller reports a date', () => {
    render(
      <ResourcePermitAuditTimeline
        entries={[]}
        scheduledLifecycle={{
          stage: 'Archiving',
          description: 'Kept for 1 week after expiry.',
        }}
      />
    );
    expect(screen.getByText('Archiving')).toBeTruthy();
    expect(screen.getByText('Future lifecycle')).toBeTruthy();
    expect(screen.getByText('Archive date not yet reported')).toBeTruthy();
    expect(screen.getByText('Kept for 1 week after expiry.')).toBeTruthy();
  });
  it('separates a future Archiving schedule from completed audit entries', () => {
    render(
      <ResourcePermitAuditTimeline
        entries={[
          {
            actor: 'System/capsule-controller',
            message: 'Access request expired automatically',
            reason: 'ExpiredBySystem',
            stage: 'Expired',
            timestamp: '2026-09-02T10:00:00Z',
          },
        ]}
        namespace="solar-test"
        scheduledLifecycle={{ stage: 'Archiving', timestamp: '2999-09-03T10:00:00Z' }}
      />
    );

    expect(screen.getByText('Expired')).toBeTruthy();
    expect(screen.getByLabelText('Scheduled Archiving')).toBeTruthy();
    expect(screen.getByText('Future lifecycle')).toBeTruthy();
    expect(screen.getByText('Archiving')).toBeTruthy();
    expect(screen.getByText('Scheduled retention action')).toBeTruthy();
    expect(screen.getByTestId('scheduled-lifecycle-connector')).toBeTruthy();
    expect(screen.getByTestId('future-lifecycle-marker')).toBeTruthy();
    expect(screen.queryByTestId('future-lifecycle-divider')).toBeNull();
    expect(
      screen.getByText('This is a planned lifecycle marker, not a completed audit transition.')
    ).toBeTruthy();
  });

  it('shows a future Active lifecycle with its activation time', () => {
    render(
      <ResourcePermitAuditTimeline
        entries={[]}
        namespace="solar-test"
        scheduledLifecycle={{ stage: 'Active', timestamp: '2999-09-03T10:00:00Z' }}
      />
    );

    expect(screen.getByLabelText('Scheduled Active')).toBeTruthy();
    expect(screen.getByText('Future lifecycle')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Scheduled activation')).toBeTruthy();
    expect(screen.getByText(/Activates at:/)).toBeTruthy();
    expect(
      screen.getByText(
        'Capsule will activate this ResourcePermit at the approved future start time.'
      )
    ).toBeTruthy();
  });
});
