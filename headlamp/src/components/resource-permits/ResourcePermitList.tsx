import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CAPSULE_CRDS } from '../../resources/capsuleCustomResources';
import { ResourcePermit } from '../../resources/resourcePermits';
import { AnchoredSectionBox as SectionBox } from '../common/AnchoredSectionBox';
import { CapsuleResourceLink } from '../common/CapsuleResourceLink';
import { ConditionStatusChip } from '../common/ConditionStatusChip';
import { anchoredResourceListHeaderProps } from '../common/SectionAnchor';
import { StatCard } from '../common/StatCard';
import { SummaryCardGrid } from '../common/SummaryCardGrid';
import { CapsuleSubjectLink } from '../subjects/CapsuleSubjectLink';
import { capsuleSubjectFromAccessEntity } from '../subjects/subjectReferences';
import { NewResourcePermitButton } from './CreateResourcePermitActivity';
import { canExpireResourcePermit } from './resourcePermitExpire';
import { ResourcePermitExpireButton } from './ResourcePermitExpireAction';
import {
  formatAccessEntity,
  resourcePermitIsReviewable,
  resourcePermitNamespacesFromSearch,
  resourcePermitPhase,
  resourcePermitPhasePresentation,
  resourcePermitStatusRequest,
  resourcePermitTemplateReference,
} from './resourcePermitHelpers';
import { ResourcePermitPhaseChip } from './ResourcePermitPhaseChip';
import { canRetryResourcePermit } from './resourcePermitRetry';
import { ResourcePermitRetryButton } from './ResourcePermitRetryAction';
import { ResourcePermitReviewButton } from './ResourcePermitReviewActivity';

export function ResourcePermitsList() {
  const location = useLocation();
  const namespaces = useMemo(
    () => resourcePermitNamespacesFromSearch(location.search),
    [location.search]
  );
  const [items, error] = ResourcePermit.useList({
    namespace: namespaces.length > 0 ? namespaces : undefined,
  });
  const summary = useMemo(() => {
    const result = {
      active: 0,
      approved: 0,
      created: 0,
      denied: 0,
      expired: 0,
      failed: 0,
      managedItems: 0,
      pending: 0,
      requested: 0,
      retrying: 0,
      reviewable: 0,
      total: items?.length || 0,
    };

    for (const item of items || []) {
      const phase = resourcePermitPhase(item).toLowerCase() as keyof typeof result;
      if (phase in result && typeof result[phase] === 'number') result[phase] += 1;
      if (resourcePermitIsReviewable(item)) result.reviewable += 1;
      result.managedItems += item.status?.size || item.status?.processedItems?.length || 0;
    }

    return result;
  }, [items]);

  if (error) {
    return (
      <SectionBox title="Resource Permits">
        <Alert severity="error">
          ResourcePermits are unavailable. This page reads the ResourcePermit API directly; grant
          this account list access in the selected Namespace scope.
        </Alert>
      </SectionBox>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: { xs: 0, sm: 2 }, pt: 3 }}>
        <NewResourcePermitButton namespaces={namespaces} />
      </Box>
      <SummaryCardGrid columns={3} marginBottom={2} inset>
        <StatCard
          label="REQUEST PHASES"
          total={summary.total}
          segments={[
            {
              name: 'Created',
              value: summary.created,
              color: resourcePermitPhasePresentation('Created').color,
            },
            {
              name: 'Requested',
              value: summary.requested,
              color: resourcePermitPhasePresentation('Requested').color,
            },
            {
              name: 'Pending',
              value: summary.pending,
              color: resourcePermitPhasePresentation('Pending').color,
            },
            {
              name: 'Approved',
              value: summary.approved,
              color: resourcePermitPhasePresentation('Approved').color,
            },
            {
              name: 'Active',
              value: summary.active,
              color: resourcePermitPhasePresentation('Active').color,
            },
            {
              name: 'Failed',
              value: summary.failed,
              color: resourcePermitPhasePresentation('Failed').color,
            },
            {
              name: 'Retrying',
              value: summary.retrying,
              color: resourcePermitPhasePresentation('Retrying').color,
            },
            {
              name: 'Denied',
              value: summary.denied,
              color: resourcePermitPhasePresentation('Denied').color,
            },
            {
              name: 'Expired',
              value: summary.expired,
              color: resourcePermitPhasePresentation('Expired').color,
            },
          ]}
          chips={[
            { label: `${summary.created} Created`, color: 'info' },
            { label: `${summary.requested} Requested`, color: 'info' },
            { label: `${summary.pending} Pending`, color: 'warning' },
            { label: `${summary.approved} Approved`, color: 'success' },
            { label: `${summary.active} Active`, color: 'success' },
            { label: `${summary.failed} Failed`, color: 'error' },
            { label: `${summary.retrying} Retrying`, color: 'warning' },
            { label: `${summary.denied} Denied`, color: 'error' },
            { label: `${summary.expired} Expired`, color: 'warning' },
          ]}
        />
        <StatCard
          label="AWAITING REVIEW"
          total={summary.reviewable}
          segments={[{ name: 'Ready for review', value: summary.reviewable, color: '#ed6c02' }]}
          chips={[{ label: `${summary.reviewable} Ready`, color: 'warning' }]}
          footer={
            <Typography variant="caption" color="text.secondary">
              Requested or pending with the Ready condition reported
            </Typography>
          }
        />
        <StatCard
          label="LIVE MANAGED ITEMS"
          total={summary.managedItems}
          segments={[{ name: 'Managed items', value: summary.managedItems, color: '#1976d2' }]}
          chips={[{ label: `${summary.managedItems} Objects`, color: 'primary' }]}
          footer={
            <Typography variant="caption" color="text.secondary">
              Status-reported resources across visible requests
            </Typography>
          }
        />
      </SummaryCardGrid>

      <ResourceListView
        id="permits-resource-permits"
        title="Resource Permits"
        data={items}
        headerProps={anchoredResourceListHeaderProps('Resource Permits', {
          headerProps: { noNamespaceFilter: true },
        })}
        defaultSortingColumn={{ id: 'name', desc: false }}
        enableRowActions
        columns={[
          {
            id: 'name',
            label: 'Name',
            getValue: item => item.getName(),
            render: item => (
              <CapsuleResourceLink
                crd={CAPSULE_CRDS.ResourcePermit}
                name={item.getName()}
                namespace={item.getNamespace()}
              >
                {item.getName()}
              </CapsuleResourceLink>
            ),
          },
          'namespace',
          {
            id: 'phase',
            label: 'Phase',
            getValue: item => resourcePermitPhase(item),
            render: item => <ResourcePermitPhaseChip item={item} />,
            filterVariant: 'select',
          },
          {
            id: 'requestor',
            label: 'Requestor',
            getValue: item => formatAccessEntity(item.spec?.requestor),
            render: item => {
              const subject = capsuleSubjectFromAccessEntity(item.spec?.requestor);
              return subject ? (
                <CapsuleSubjectLink subject={subject} namespaces={[item.getNamespace() || '']} />
              ) : (
                formatAccessEntity(item.spec?.requestor)
              );
            },
          },
          {
            id: 'template',
            label: 'Template',
            getValue: item => resourcePermitTemplateReference(item)?.name || '',
            render: item => {
              const template = resourcePermitTemplateReference(item);
              return template?.name ? (
                <CapsuleResourceLink
                  crd={
                    template.kind === 'ResourcePermitTemplate'
                      ? CAPSULE_CRDS.ResourcePermitTemplate
                      : CAPSULE_CRDS.GlobalResourcePermitTemplate
                  }
                  name={template.name}
                  namespace={
                    template.kind === 'ResourcePermitTemplate' ? item.getNamespace() : undefined
                  }
                >
                  {template.name}
                </CapsuleResourceLink>
              ) : (
                '—'
              );
            },
          },
          {
            id: 'reason',
            label: 'Reason',
            getValue: item => item.spec?.reason || '',
          },
          {
            id: 'duration',
            label: 'Duration',
            getValue: item => {
              const statusRequest = resourcePermitStatusRequest(item);
              return statusRequest
                ? statusRequest.duration || 'Unlimited'
                : item.spec?.duration || '';
            },
          },
          {
            id: 'ready',
            label: 'Ready',
            getValue: item =>
              String(
                item.status?.conditions?.find(condition => condition.type === 'Ready')?.status
              ),
            render: item => (
              <ConditionStatusChip
                status={
                  item.status?.conditions?.find(condition => condition.type === 'Ready')?.status
                }
                type="Ready"
              />
            ),
          },
          {
            id: 'items',
            label: 'Items',
            getValue: item => item.status?.size || item.status?.processedItems?.length || 0,
          },
          {
            id: 'review',
            label: 'Review',
            getValue: item => (resourcePermitIsReviewable(item) ? 'Ready' : ''),
            render: item => <ResourcePermitReviewButton item={item} />,
          },
          {
            id: 'retry',
            label: 'Retry',
            getValue: item => (canRetryResourcePermit(item) ? 'Available' : ''),
            render: item => <ResourcePermitRetryButton item={item} />,
          },
          {
            id: 'expire',
            label: 'Expire',
            getValue: item => (canExpireResourcePermit(item) ? 'Available' : ''),
            render: item => <ResourcePermitExpireButton item={item} />,
          },
          'age',
        ]}
      />
    </>
  );
}

export default ResourcePermitsList;
