import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { Link, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { CAPSULE_CRDS } from '../../resources/capsuleCustomResources';
import { ResourcePermit } from '../../resources/resourcePermits';
import { AnchoredSectionBox as SectionBox } from '../common/AnchoredSectionBox';
import { CapsuleResourceLink } from '../common/CapsuleResourceLink';
import { StatCard } from '../common/StatCard';
import { SummaryCardGrid } from '../common/SummaryCardGrid';
import { ResourcePermitExpireButton } from '../resource-permits/ResourcePermitExpireAction';
import { resourcePermitNamespacesFromSearch } from '../resource-permits/resourcePermitHelpers';
import { ResourcePermitPhaseChip } from '../resource-permits/ResourcePermitPhaseChip';
import { ResourcePermitRetryButton } from '../resource-permits/ResourcePermitRetryAction';
import { ResourcePermitReviewButton } from '../resource-permits/ResourcePermitReviewActivity';
import {
  bindingMentionsSubject,
  type CapsuleSubject,
  capsuleSubjectLabel,
  normalizeCapsuleSubject,
  resourcePermitSubjectMentions,
} from './subjectReferences';

function decoded(value: string | undefined): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function MentionChips({ mentions }: { mentions: string[] }) {
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {mentions.map(mention => (
        <Chip key={mention} size="small" label={mention} variant="outlined" />
      ))}
    </Stack>
  );
}

export interface CapsuleSubjectSummaryProps {
  kind?: string;
  name?: string;
  namespaces?: string[];
}

export function CapsuleSubjectSummary(props: CapsuleSubjectSummaryProps = {}) {
  const params = useParams<{ kind: string; subject: string }>();
  const location = useLocation();
  const subject: CapsuleSubject = normalizeCapsuleSubject({
    kind: props.kind || decoded(params.kind),
    name: props.name || decoded(params.subject),
  }) || {
    kind: props.kind || decoded(params.kind) || 'Unknown',
    name: props.name || decoded(params.subject) || 'Unknown',
  };
  const namespaces = useMemo(
    () => props.namespaces ?? resourcePermitNamespacesFromSearch(location.search),
    [location.search, props.namespaces]
  );
  const namespaceScope = namespaces.length > 0 ? namespaces : undefined;

  const [roleBindings, roleBindingsError] = K8s.ResourceClasses.RoleBinding.useList({
    namespace: namespaceScope,
  });
  const [clusterRoleBindings, clusterRoleBindingsError] =
    K8s.ResourceClasses.ClusterRoleBinding.useList();
  const [resourcePermits, resourcePermitsError] = ResourcePermit.useList({
    namespace: namespaceScope,
  });

  const bindingRows = useMemo(
    () =>
      [
        ...(roleBindings || [])
          .filter(item => bindingMentionsSubject(item, subject))
          .map(item => ({ item, type: 'RoleBinding' })),
        ...(clusterRoleBindings || [])
          .filter(item => bindingMentionsSubject(item, subject))
          .map(item => ({ item, type: 'ClusterRoleBinding' })),
      ].sort(
        (left, right) =>
          left.type.localeCompare(right.type) ||
          String(left.item.getNamespace() || '').localeCompare(
            String(right.item.getNamespace() || '')
          ) ||
          left.item.getName().localeCompare(right.item.getName())
      ),
    [clusterRoleBindings, roleBindings, subject]
  );
  const requestRows = useMemo(
    () =>
      (resourcePermits || [])
        .map(item => ({ item, mentions: resourcePermitSubjectMentions(item, subject) }))
        .filter(row => row.mentions.length > 0)
        .sort(
          (left, right) =>
            String(left.item.getNamespace() || '').localeCompare(
              String(right.item.getNamespace() || '')
            ) || left.item.getName().localeCompare(right.item.getName())
        ),
    [resourcePermits, subject]
  );

  const namespacedBindingCount = bindingRows.filter(row => row.type === 'RoleBinding').length;
  const clusterBindingCount = bindingRows.length - namespacedBindingCount;
  const subjectLabel = subject ? capsuleSubjectLabel(subject) : 'Unknown subject';
  const scopedDescription = namespaces.length
    ? namespaces.join(', ')
    : 'the account’s permitted all-Namespace scope';
  const inventoriesLoading =
    (!resourcePermits && !resourcePermitsError) ||
    (!roleBindings && !roleBindingsError) ||
    (!clusterRoleBindings && !clusterRoleBindingsError);

  return (
    <>
      <SectionBox title={`Subject: ${subjectLabel}`}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1, alignItems: { sm: 'center' } }}
        >
          <Chip color="primary" label={subject?.kind || 'Unknown'} />
          <Typography>
            References are correlated from visible Permits and RBAC resources. Namespaced searches
            currently cover {scopedDescription}.
          </Typography>
        </Stack>
      </SectionBox>

      <SummaryCardGrid columns={2} marginBottom={2} inset>
        <StatCard
          label="PERMITS"
          total={resourcePermitsError ? 'Unavailable' : requestRows.length}
          segments={[{ name: 'Requests', value: requestRows.length, color: '#ed6c02' }]}
          chips={[{ label: `${requestRows.length} Visible`, color: 'warning' }]}
          footer={
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Requestor, reviewer, access identity, or rendered subject
            </Typography>
          }
        />
        <StatCard
          label="BINDINGS"
          total={roleBindingsError && clusterRoleBindingsError ? 'Unavailable' : bindingRows.length}
          segments={[
            { name: 'RoleBindings', value: namespacedBindingCount, color: '#7b1fa2' },
            { name: 'ClusterRoleBindings', value: clusterBindingCount, color: '#00897b' },
          ]}
          chips={[
            { label: `${namespacedBindingCount} RoleBindings`, color: 'info' },
            { label: `${clusterBindingCount} ClusterRoleBindings`, color: 'success' },
          ]}
        />
      </SummaryCardGrid>

      {inventoriesLoading && (
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, px: 2, py: 1 }}>
          <CircularProgress size={20} />
          <Typography sx={{ color: 'text.secondary' }}>Loading visible references…</Typography>
        </Box>
      )}

      {resourcePermitsError && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          ResourcePermits are unavailable in {scopedDescription}. Kubernetes only returns references
          this signed-in account is allowed to list.
        </Alert>
      )}

      {roleBindingsError && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          RoleBindings are unavailable in {scopedDescription}. Select Namespaces where this account
          has list access to include namespaced bindings.
        </Alert>
      )}
      {clusterRoleBindingsError && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          ClusterRoleBindings are unavailable to this account.
        </Alert>
      )}

      {requestRows.length > 0 && (
        <SectionBox title="Resource Permits">
          <SimpleTable
            columns={[
              {
                label: 'Request',
                getter: (row: (typeof requestRows)[number]) => (
                  <CapsuleResourceLink
                    crd={CAPSULE_CRDS.ResourcePermit}
                    name={row.item.getName()}
                    namespace={row.item.getNamespace()}
                  >
                    {row.item.getName()}
                  </CapsuleResourceLink>
                ),
              },
              {
                label: 'Namespace',
                getter: (row: (typeof requestRows)[number]) => row.item.getNamespace() || '—',
              },
              {
                label: 'Phase',
                getter: (row: (typeof requestRows)[number]) => (
                  <ResourcePermitPhaseChip item={row.item} />
                ),
              },
              {
                label: 'Relationship',
                getter: (row: (typeof requestRows)[number]) => (
                  <MentionChips mentions={row.mentions} />
                ),
              },
              {
                label: 'Reason',
                getter: (row: (typeof requestRows)[number]) => row.item.spec?.reason || '—',
              },
              {
                label: 'Review',
                getter: (row: (typeof requestRows)[number]) => (
                  <ResourcePermitReviewButton item={row.item} />
                ),
              },
              {
                label: 'Retry',
                getter: (row: (typeof requestRows)[number]) => (
                  <ResourcePermitRetryButton item={row.item} />
                ),
              },
              {
                label: 'Expire',
                getter: (row: (typeof requestRows)[number]) => (
                  <ResourcePermitExpireButton item={row.item} />
                ),
              },
            ]}
            data={requestRows}
            emptyMessage="No visible ResourcePermit mentions this subject."
            reflectInURL={false}
          />
        </SectionBox>
      )}

      {bindingRows.length > 0 && (
        <SectionBox title="Bindings">
          <SimpleTable
            columns={[
              {
                label: 'Binding',
                getter: (row: (typeof bindingRows)[number]) => (
                  <Link kubeObject={row.item}>{row.item.getName()}</Link>
                ),
              },
              { label: 'Kind', getter: (row: (typeof bindingRows)[number]) => row.type },
              {
                label: 'Namespace',
                getter: (row: (typeof bindingRows)[number]) => row.item.getNamespace() || 'Cluster',
              },
              {
                label: 'Role',
                getter: (row: (typeof bindingRows)[number]) =>
                  `${row.item.roleRef?.kind || 'Role'}/${row.item.roleRef?.name || 'Unknown'}`,
              },
            ]}
            data={bindingRows}
            emptyMessage="No visible RoleBinding or ClusterRoleBinding mentions this subject."
            reflectInURL={false}
          />
        </SectionBox>
      )}
    </>
  );
}

export default CapsuleSubjectSummary;
