import { Icon } from '@iconify/react';
import { SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Resource from '@kinvolk/headlamp-plugin/lib/components/common';
import { Alert, Button, Chip, Collapse, Stack, Typography } from '@mui/material';
import { type ReactNode, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CAPSULE_CRDS } from '../../resources/capsuleCustomResources';
import { ResourcePermit } from '../../resources/resourcePermits';
import { AnchoredSectionBox as SectionBox } from '../common/AnchoredSectionBox';
import { CapsuleResourceLink } from '../common/CapsuleResourceLink';
import { ConditionsAndEvents } from '../common/ConditionsAndEvents';
import { DetailsSectionStack } from '../common/DetailsSectionStack';
import { ManagedResources } from '../common/ManagedResources';
import { CapsuleSubjectLink } from '../subjects/CapsuleSubjectLink';
import { capsuleSubjectFromAccessEntity } from '../subjects/subjectReferences';
import { ResourcePermitAuditTimeline } from './ResourcePermitAuditTimeline';
import {
  formatAccessEntity,
  resourcePermitAuditTrail,
  resourcePermitPhase,
  resourcePermitReviewEntity,
  resourcePermitReviewMessage,
  resourcePermitReviewRecorded,
  resourcePermitReviewVerdict,
  resourcePermitScheduledLifecycle,
  resourcePermitServiceAccountEntity,
  resourcePermitStatusRequest,
  resourcePermitTemplateReference,
} from './resourcePermitHelpers';
import { ResourcePermitPhaseChip } from './ResourcePermitPhaseChip';

export interface ResourcePermitDetailProps {
  name?: string;
  namespace?: string;
}

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : '—';
}

function subjectNamespaces(requestNamespace: string, subject?: { namespace?: string }) {
  return [...new Set([requestNamespace, subject?.namespace].filter(Boolean))] as string[];
}

function CollapsibleTableSection({
  children,
  count,
  title,
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <SectionBox
      title={title}
      headerProps={{
        titleSideActions: [
          <Button
            aria-expanded={expanded}
            key={`${title}-table-toggle`}
            onClick={() => setExpanded(value => !value)}
            size="small"
            startIcon={<Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} />}
            variant="outlined"
          >
            {expanded ? 'Collapse' : 'Expand'} ({count})
          </Button>,
        ],
      }}
    >
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
      {!expanded && (
        <Typography color="text.secondary" variant="body2">
          {count === 0 ? 'No entries.' : `${count} ${count === 1 ? 'entry' : 'entries'} hidden.`}
        </Typography>
      )}
    </SectionBox>
  );
}

export function ResourcePermitDetail(props: ResourcePermitDetailProps) {
  const params = useParams<{ crName?: string; name?: string; namespace?: string }>();
  const name = props.name || params.crName || params.name || '';
  const namespace = props.namespace || (params.namespace === '-' ? '' : params.namespace) || '';
  const [request, error] = ResourcePermit.useGet(name, namespace);
  const auditTrail = useMemo(() => resourcePermitAuditTrail(request), [request]);
  const scheduledLifecycle = useMemo(() => resourcePermitScheduledLifecycle(request), [request]);
  const requestParams = useMemo(
    () =>
      Object.entries(request?.spec?.params || {}).sort(([left], [right]) =>
        left.localeCompare(right)
      ),
    [request]
  );
  const phase = resourcePermitPhase(request);
  const processedItems = request?.status?.processedItems || [];
  const statusRequest = resourcePermitStatusRequest(request);
  const templateReference = resourcePermitTemplateReference(request);
  const requestorSubject = capsuleSubjectFromAccessEntity(request?.spec?.requestor);
  const serviceAccountEntity = resourcePermitServiceAccountEntity(request);
  const serviceAccountSubject = capsuleSubjectFromAccessEntity(serviceAccountEntity);
  const reviewRecorded = resourcePermitReviewRecorded(request);
  const reviewEntity = resourcePermitReviewEntity(request);
  const reviewVerdict = resourcePermitReviewVerdict(request);
  const reviewMessage = resourcePermitReviewMessage(request);
  const reviewerSubject = capsuleSubjectFromAccessEntity(reviewEntity);
  const approvalPolicy = statusRequest?.approvals;
  const approvers = approvalPolicy?.approvers || [];
  const approvalConditions = approvalPolicy?.conditions || [];
  const requestDetails: Array<{ field: string; value: ReactNode }> = [
    { field: 'Reason', value: request?.spec?.reason || '—' },
    {
      field: 'Requestor',
      value: requestorSubject ? (
        <CapsuleSubjectLink
          subject={requestorSubject}
          namespaces={subjectNamespaces(namespace, requestorSubject)}
        />
      ) : (
        formatAccessEntity(request?.spec?.requestor)
      ),
    },
    ...(serviceAccountEntity
      ? [
          {
            field: 'Execution ServiceAccount',
            value: serviceAccountSubject ? (
              <CapsuleSubjectLink
                subject={serviceAccountSubject}
                namespaces={subjectNamespaces(namespace, serviceAccountSubject)}
              />
            ) : (
              formatAccessEntity(serviceAccountEntity)
            ),
          },
        ]
      : []),
    {
      field: 'Resolved template',
      value: templateReference?.name || '—',
    },
    {
      field: 'Template resource version',
      value: templateReference?.resourceVersion || '—',
    },
    ...(statusRequest
      ? [
          {
            field: 'Approval mode',
            value: approvalPolicy?.auto ? 'Automatic' : 'Manual',
          },
          {
            field: 'Approvers',
            value: approvalPolicy?.auto ? (
              'Ignored for automatic approval'
            ) : approvers.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {approvers.map((approver, index) => (
                  <CapsuleSubjectLink
                    display="chip"
                    key={`${approver.kind || 'User'}-${approver.name || index}`}
                    kind={approver.kind || 'User'}
                    name={approver.name}
                    namespaces={[namespace]}
                  />
                ))}
              </Stack>
            ) : (
              'Any authorized reviewer'
            ),
          },
          {
            field: 'Approval conditions',
            value:
              approvalConditions.length > 0 ? (
                <Stack gap={0.5}>
                  {approvalConditions.map(condition => (
                    <Typography component="code" key={condition} variant="body2">
                      {condition}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                'None'
              ),
          },
        ]
      : []),
    { field: 'Requested duration', value: request?.spec?.duration || 'Template default' },
    { field: 'Requested start', value: dateTime(request?.spec?.startTime) },
    {
      field: 'Effective duration',
      value: statusRequest ? statusRequest.duration || 'Unlimited' : '—',
    },
    { field: 'Effective start', value: dateTime(statusRequest?.startTime) },
    {
      field: 'Retention after expiration',
      value: statusRequest ? statusRequest.keepFor || 'No retention' : '—',
    },
    { field: 'Active from', value: dateTime(request?.status?.active?.from) },
    { field: 'Active until', value: dateTime(request?.status?.active?.until) },
    { field: 'Audit retention until', value: dateTime(request?.status?.keepUntil) },
  ];

  if (error) {
    return (
      <SectionBox title={`Resource Permit: ${name}`}>
        <Alert severity="error">
          ResourcePermit {namespace ? `${namespace}/` : ''}
          {name} is unavailable or this account cannot read it directly.
        </Alert>
      </SectionBox>
    );
  }

  return (
    <Resource.DetailsGrid
      name={name}
      namespace={namespace}
      resourceType={ResourcePermit}
      extraInfo={item => {
        if (!item) return [];
        const itemStatusRequest = resourcePermitStatusRequest(item);
        const itemTemplateReference = resourcePermitTemplateReference(item);
        const templateName = itemTemplateReference?.name;
        const requestor = capsuleSubjectFromAccessEntity(item.spec?.requestor);
        const executionEntity = resourcePermitServiceAccountEntity(item);
        const executionSubject = capsuleSubjectFromAccessEntity(executionEntity);
        return [
          { name: 'Phase', value: <ResourcePermitPhaseChip item={item} /> },
          {
            name: 'Requestor',
            value: requestor ? (
              <CapsuleSubjectLink
                subject={requestor}
                namespaces={subjectNamespaces(namespace, requestor)}
              />
            ) : (
              <Typography>{formatAccessEntity(item.spec?.requestor)}</Typography>
            ),
          },
          {
            name: 'Template',
            value: templateName ? (
              <CapsuleResourceLink
                crd={
                  itemTemplateReference?.kind === 'ResourcePermitTemplate'
                    ? CAPSULE_CRDS.ResourcePermitTemplate
                    : CAPSULE_CRDS.GlobalResourcePermitTemplate
                }
                name={templateName}
                namespace={
                  itemTemplateReference?.kind === 'ResourcePermitTemplate' ? namespace : undefined
                }
              >
                {templateName}
              </CapsuleResourceLink>
            ) : (
              <Typography>—</Typography>
            ),
          },
          {
            name: 'Duration',
            value: (
              <Typography>
                {itemStatusRequest
                  ? itemStatusRequest.duration || 'Unlimited'
                  : item.spec?.duration || '—'}
              </Typography>
            ),
          },
          {
            name: 'Managed items',
            value: <Chip size="small" label={item.status?.size || 0} color="primary" />,
          },
          ...(executionEntity
            ? [
                {
                  name: 'Execution ServiceAccount',
                  value: executionSubject ? (
                    <CapsuleSubjectLink
                      subject={executionSubject}
                      namespaces={subjectNamespaces(namespace, executionSubject)}
                    />
                  ) : (
                    <Typography>{formatAccessEntity(executionEntity)}</Typography>
                  ),
                },
              ]
            : []),
        ];
      }}
    >
      <DetailsSectionStack>
        <ConditionsAndEvents resource={request} />

        {request?.status?.failure && (
          <SectionBox title="Failure">
            <Stack gap={1.5}>
              <Alert severity="error">{request.status.failure.message}</Alert>
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                <Chip
                  color="error"
                  label={`Stage: ${request.status.failure.stage || 'Unknown'}`}
                  size="small"
                />
                <Chip
                  label={`Retry phase: ${request.status.failure.retryPhase || 'Unknown'}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Reason: ${request.status.failure.reason || 'Unknown'}`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </SectionBox>
        )}

        <CollapsibleTableSection
          key={`request-${namespace}-${name}`}
          count={requestDetails.length}
          title="Request"
        >
          <SimpleTable
            columns={[
              {
                label: 'Field',
                getter: (row: { field: string; value: ReactNode }) => row.field,
              },
              {
                label: 'Value',
                getter: (row: { field: string; value: ReactNode }) => row.value,
              },
            ]}
            data={requestDetails}
            emptyMessage="No request data."
            reflectInURL={false}
          />
        </CollapsibleTableSection>

        <CollapsibleTableSection
          key={`parameters-${namespace}-${name}`}
          count={requestParams.length}
          title="Parameters"
        >
          <SimpleTable
            columns={[
              { label: 'Parameter', getter: (entry: [string, unknown]) => entry[0] },
              {
                label: 'Value',
                getter: (entry: [string, unknown]) =>
                  typeof entry[1] === 'string' ? entry[1] : JSON.stringify(entry[1]),
              },
            ]}
            data={requestParams}
            defaultSortingColumn={1}
            emptyMessage="No request parameters."
            reflectInURL={false}
          />
        </CollapsibleTableSection>

        <SectionBox title="Audit Trail">
          <ResourcePermitAuditTimeline
            entries={auditTrail}
            namespace={namespace}
            scheduledLifecycle={scheduledLifecycle}
          />
        </SectionBox>

        {reviewRecorded && (
          <SectionBox title="Review Verdict">
            <Stack gap={2}>
              <Alert
                severity={
                  reviewVerdict === 'Denied'
                    ? 'error'
                    : reviewVerdict === 'Approved'
                    ? 'success'
                    : 'info'
                }
              >
                Review verdict: <strong>{reviewVerdict || 'Recorded'}</strong>
              </Alert>
              <SimpleTable
                columns={[
                  {
                    label: 'Field',
                    getter: (row: { field: string; value: ReactNode }) => row.field,
                  },
                  {
                    label: 'Value',
                    getter: (row: { field: string; value: ReactNode }) => row.value,
                  },
                ]}
                data={[
                  {
                    field: 'Reviewed by',
                    value: reviewerSubject ? (
                      <CapsuleSubjectLink
                        subject={reviewerSubject}
                        namespaces={subjectNamespaces(namespace, reviewerSubject)}
                      />
                    ) : (
                      formatAccessEntity(reviewEntity)
                    ),
                  },
                  {
                    field: 'Comment',
                    value: reviewMessage || 'No comment provided.',
                  },
                ]}
                emptyMessage=""
                reflectInURL={false}
              />
            </Stack>
          </SectionBox>
        )}

        {(phase === 'Active' || processedItems.length > 0) && (
          <ManagedResources inventoryTitle={null} item={request} title="Live Managed Resources" />
        )}
      </DetailsSectionStack>
    </Resource.DetailsGrid>
  );
}

export default ResourcePermitDetail;
