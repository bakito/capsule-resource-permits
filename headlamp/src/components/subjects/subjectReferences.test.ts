import { describe, expect, it } from 'vitest';
import {
  bindingMentionsSubject,
  capsuleSubjectFromServiceAccountReference,
  capsuleSubjectLabel,
  manifestSubjects,
  normalizeCapsuleSubject,
  resourcePermitSubjectMentions,
} from './subjectReferences';

describe('Capsule subject references', () => {
  it('canonicalizes Kubernetes ServiceAccount identities', () => {
    const canonical = normalizeCapsuleSubject({
      kind: 'User',
      name: 'system:serviceaccount:solar-prod:deployer',
    });

    expect(canonical).toEqual({
      kind: 'ServiceAccount',
      name: 'deployer',
      namespace: 'solar-prod',
    });
    expect(capsuleSubjectLabel(canonical!)).toBe('ServiceAccount/solar-prod/deployer');
    expect(
      normalizeCapsuleSubject({ kind: 'ServiceAccount', name: 'solar-prod/deployer' })
    ).toEqual(canonical);
    expect(capsuleSubjectFromServiceAccountReference({ name: 'deployer' }, 'solar-prod')).toEqual(
      canonical
    );
  });

  it('matches native RBAC subjects without conflating ServiceAccount namespaces', () => {
    const binding = {
      subjects: [{ kind: 'ServiceAccount', namespace: 'solar-prod', name: 'deployer' }],
    };

    expect(
      bindingMentionsSubject(binding, {
        kind: 'ServiceAccount',
        namespace: 'solar-prod',
        name: 'deployer',
      })
    ).toBe(true);
    expect(
      bindingMentionsSubject(binding, {
        kind: 'ServiceAccount',
        namespace: 'solar-test',
        name: 'deployer',
      })
    ).toBe(false);
  });

  it('extracts and deduplicates subjects from rendered manifests', () => {
    expect(
      manifestSubjects({
        kind: 'RoleBinding',
        subjects: [
          { kind: 'User', name: 'alice' },
          { kind: 'User', name: 'alice' },
          { kind: 'ServiceAccount', namespace: 'solar-prod', name: 'deployer' },
        ],
      })
    ).toEqual([
      { kind: 'User', name: 'alice' },
      { kind: 'ServiceAccount', namespace: 'solar-prod', name: 'deployer' },
    ]);
  });

  it('finds requestor, group, reviewer, issued identity, and rendered RBAC mentions', () => {
    const request = {
      spec: { requestor: { groups: ['operators'], name: 'alice', type: 'User' } },
      status: {
        review: { reviewer: { name: 'bob', type: 'User' } },
        request: {
          impersonation: { namespace: 'solar-prod', name: 'temporary-access' },
          resources: [
            {
              targets: [
                {
                  kind: 'RoleBinding',
                  subjects: [{ kind: 'User', name: 'alice' }],
                },
              ],
            },
          ],
        },
        transitions: [
          {
            actor: { name: 'bob', type: 'User' },
            reason: 'ApprovedByUser',
            timestamp: '2026-09-02T08:00:00Z',
            type: 'Approved',
          },
          {
            actor: {
              name: 'system:serviceaccount:capsule-system:capsule-controller',
              type: 'ServiceAccount',
            },
            reason: 'ActivatedBySystem',
            timestamp: '2026-09-02T08:00:01Z',
            type: 'Active',
          },
        ],
      },
    };

    expect(resourcePermitSubjectMentions(request, { kind: 'User', name: 'alice' })).toEqual([
      'Requestor',
      'Rendered RoleBinding subject',
    ]);
    expect(resourcePermitSubjectMentions(request, { kind: 'Group', name: 'operators' })).toEqual([
      'Requestor',
    ]);
    expect(resourcePermitSubjectMentions(request, { kind: 'User', name: 'bob' })).toEqual([
      'Reviewer',
    ]);
    expect(
      resourcePermitSubjectMentions(request, {
        kind: 'ServiceAccount',
        namespace: 'solar-prod',
        name: 'temporary-access',
      })
    ).toEqual(['Execution ServiceAccount']);
    expect(
      resourcePermitSubjectMentions(request, {
        kind: 'ServiceAccount',
        namespace: 'capsule-system',
        name: 'capsule-controller',
      })
    ).toEqual(['Active actor']);
  });
});
