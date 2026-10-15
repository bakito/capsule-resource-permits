import { Link, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Resource from '@kinvolk/headlamp-plugin/lib/components/common';
import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { type ReactNode, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  GlobalResourcePermitTemplate,
  ResourcePermitTemplate,
  type ResourcePermitTemplateResource,
} from '../../resources/resourcePermits';
import { AnchoredSectionBox as SectionBox } from '../common/AnchoredSectionBox';
import { ConditionsAndEvents } from '../common/ConditionsAndEvents';
import { DetailsSectionStack } from '../common/DetailsSectionStack';
import { CapsuleSubjectLink } from '../subjects/CapsuleSubjectLink';
import { ImpersonationSubjectCell } from '../subjects/ImpersonationSubjectCell';
import { manifestSubjects } from '../subjects/subjectReferences';
import {
  templateApprovalMode,
  templateNamespaces,
  templateTargetCount,
} from './resourcePermitHelpers';
import { ResourcePermitTemplateIdentity } from './ResourcePermitTemplatePresentation';

export interface GlobalResourcePermitTemplateDetailProps {
  name?: string;
}

export interface ResourcePermitTemplateDetailProps {
  name?: string;
  namespace?: string;
}

function codeBlock(value: unknown) {
  return (
    <Box
      component="pre"
      sx={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.78rem',
        lineHeight: 1.5,
        m: 0,
        maxHeight: 420,
        overflow: 'auto',
        p: 2,
      }}
    >
      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
    </Box>
  );
}

function ResourcePermitTemplateDetailView({
  namespaced,
  requestedName,
  requestedNamespace,
}: {
  namespaced: boolean;
  requestedName?: string;
  requestedNamespace?: string;
}) {
  const params = useParams<{ crName?: string; name?: string; namespace?: string }>();
  const namespace = requestedNamespace || (params.namespace === '-' ? undefined : params.namespace);
  const resourceType: any = namespaced ? ResourcePermitTemplate : GlobalResourcePermitTemplate;
  const name = requestedName || params.crName || params.name || '';
  const [template, error] = resourceType.useGet(name, namespaced ? namespace : undefined);
  const approvalMode = templateApprovalMode(template);
  const namespaces = namespaced
    ? ([namespace].filter(Boolean) as string[])
    : templateNamespaces(template);
  const resources = template?.spec?.resources || [];
  const schema = template?.spec?.paramSchema || {};
  const required = new Set<string>(Array.isArray(schema.required) ? schema.required : []);
  const parameters = useMemo(
    () =>
      Object.entries((schema.properties as Record<string, any>) || {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([parameterName, definition]) => ({
          description: definition?.description || '',
          name: parameterName,
          required: required.has(parameterName),
          type: definition?.type || 'any',
          validation: {
            enum: definition?.enum,
            format: definition?.format,
            maxLength: definition?.maxLength,
            minLength: definition?.minLength,
            pattern: definition?.pattern,
          },
        })),
    [schema.properties, schema.required]
  );

  if (error) {
    return (
      <SectionBox title={`Template: ${name}`}>
        <Alert severity="error">
          {namespaced ? 'ResourcePermitTemplate' : 'GlobalResourcePermitTemplate'} {name} is
          unavailable or this account cannot read it directly.
        </Alert>
      </SectionBox>
    );
  }

  return (
    <Resource.DetailsGrid
      name={name}
      namespace={namespaced ? namespace : undefined}
      resourceType={resourceType}
      extraInfo={(item: any) => {
        if (!item) return [];
        const mode = templateApprovalMode(item);
        const itemNamespaces = templateNamespaces(item);
        return [
          {
            name: 'Approval',
            value: (
              <Chip
                size="small"
                label={mode}
                color={mode === 'Automatic' ? 'success' : 'warning'}
              />
            ),
          },
          {
            name: 'Targets',
            value: <Chip size="small" label={templateTargetCount(item)} color="primary" />,
          },
          ...(namespaced
            ? [{ name: 'Namespace', value: <Typography>{namespace || '—'}</Typography> }]
            : [
                {
                  name: 'Namespace scope',
                  value: (
                    <Typography>
                      {itemNamespaces.includes('*') ? 'All Namespaces' : itemNamespaces.length}
                    </Typography>
                  ),
                },
                {
                  name: 'Observed generation',
                  value: (
                    <Typography>
                      {item.status?.observedGeneration ?? '—'} / {item.metadata?.generation ?? '—'}
                    </Typography>
                  ),
                },
              ]),
        ];
      }}
    >
      <DetailsSectionStack>
        <ConditionsAndEvents resource={template} />

        <SectionBox title="Template Overview">
          <Paper
            variant="outlined"
            sx={{ bgcolor: 'action.hover', borderColor: 'primary.main', borderWidth: 2, p: 2 }}
          >
            <ResourcePermitTemplateIdentity template={template} />
          </Paper>
        </SectionBox>

        <SectionBox title="Approval Flow">
          <Stack spacing={2}>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Chip
                size="small"
                label={`${approvalMode} approval`}
                color={approvalMode === 'Automatic' ? 'success' : 'warning'}
              />
              {(template?.spec?.approvals?.approvers || []).map(
                (approver: { kind?: string; name?: string }) => (
                  <CapsuleSubjectLink
                    key={`${approver.kind}-${approver.name}`}
                    display="chip"
                    kind={approver.kind || 'User'}
                    name={approver.name}
                    namespaces={namespaces}
                  />
                )
              )}
              {approvalMode === 'Manual' &&
                (template?.spec?.approvals?.approvers || []).length === 0 && (
                  <Chip size="small" label="Any authorized reviewer" variant="outlined" />
                )}
            </Stack>
            {(template?.spec?.approvals?.conditions || []).length > 0 ? (
              <SimpleTable
                columns={[
                  {
                    label: 'CEL approval condition',
                    getter: (row: { condition: string }) => row.condition,
                  },
                ]}
                data={(template?.spec?.approvals?.conditions || []).map((condition: string) => ({
                  condition,
                }))}
                emptyMessage="No approval conditions."
                reflectInURL={false}
              />
            ) : (
              <Typography color="text.secondary">No CEL approval conditions configured.</Typography>
            )}
          </Stack>
        </SectionBox>

        <SectionBox title="Lifecycle">
          <SimpleTable
            columns={[
              {
                label: 'Setting',
                getter: (row: { name: string; value: ReactNode }) => row.name,
              },
              {
                label: 'Value',
                getter: (row: { name: string; value: ReactNode }) => row.value,
              },
            ]}
            data={[
              {
                name: 'Default duration',
                value: template?.spec?.defaultDuration || 'Until deletion',
              },
              { name: 'Maximum duration', value: template?.spec?.maxDuration || 'Not limited' },
              {
                name: 'Keep expired requests for',
                value: template?.spec?.keepFor || 'No retention',
              },
              {
                name: 'Impersonation ServiceAccount',
                value: (
                  <ImpersonationSubjectCell
                    fallbackLabel="Required ServiceAccount is missing"
                    fallbackNamespace={namespaced ? namespace : undefined}
                    namespaces={namespaces}
                    reference={template?.spec?.impersonation}
                  />
                ),
              },
            ]}
            emptyMessage="No lifecycle settings."
            reflectInURL={false}
          />
        </SectionBox>

        {!namespaced && (
          <SectionBox title="Available Namespaces">
            {namespaces.length > 0 ? (
              <SimpleTable
                columns={[
                  {
                    label: 'Namespace',
                    getter: (row: { namespace: string }) =>
                      row.namespace === '*' ? (
                        <Typography>All Namespaces</Typography>
                      ) : (
                        <Link routeName="namespace" params={{ name: row.namespace }}>
                          {row.namespace}
                        </Link>
                      ),
                  },
                  {
                    label: 'Availability',
                    getter: (row: { namespace: string }) => (
                      <Chip
                        size="small"
                        label={row.namespace === '*' ? 'Cluster-wide' : 'Available'}
                        color={row.namespace === '*' ? 'primary' : 'success'}
                        variant={row.namespace === '*' ? 'filled' : 'outlined'}
                      />
                    ),
                  },
                ]}
                data={namespaces.map(namespace => ({ namespace }))}
                emptyMessage=""
                reflectInURL={false}
              />
            ) : (
              <Alert severity="warning">
                The controller has not reported any eligible Namespaces yet.
              </Alert>
            )}
            {(template?.spec?.namespaceSelectors || []).length > 0 && (
              <Paper variant="outlined" sx={{ mt: 2, overflow: 'hidden' }}>
                <Typography variant="subtitle2" sx={{ bgcolor: 'action.hover', p: 1.5 }}>
                  Namespace selectors
                </Typography>
                {codeBlock(template?.spec?.namespaceSelectors)}
              </Paper>
            )}
          </SectionBox>
        )}

        <SectionBox title="Parameters">
          <SimpleTable
            columns={[
              { label: 'Name', getter: (row: (typeof parameters)[number]) => row.name },
              { label: 'Type', getter: (row: (typeof parameters)[number]) => row.type },
              {
                label: 'Required',
                getter: (row: (typeof parameters)[number]) =>
                  row.required ? (
                    <Chip size="small" label="Required" color="warning" />
                  ) : (
                    <Chip size="small" label="Optional" variant="outlined" />
                  ),
              },
              {
                label: 'Validation',
                getter: (row: (typeof parameters)[number]) =>
                  Object.entries(row.validation)
                    .filter(([, value]) => value !== undefined)
                    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                    .join(', ') || '—',
              },
              {
                label: 'Description',
                getter: (row: (typeof parameters)[number]) => row.description || '—',
              },
            ]}
            data={parameters}
            emptyMessage="This template does not declare parameters."
            reflectInURL={false}
          />
        </SectionBox>

        <SectionBox title="Resource Templates">
          {resources.length === 0 ? (
            <Typography color="text.secondary">No resource templates configured.</Typography>
          ) : (
            <Stack spacing={2}>
              {resources.map((resource: ResourcePermitTemplateResource, resourceIndex: number) => (
                <Paper key={resourceIndex} variant="outlined" sx={{ overflow: 'hidden' }}>
                  <Stack
                    direction="row"
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap"
                    sx={{ bgcolor: 'action.hover', p: 1.5 }}
                  >
                    <Typography variant="subtitle2" sx={{ mr: 'auto' }}>
                      Resource group {resourceIndex + 1}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${resource.targets?.length || 0} direct targets`}
                      variant="outlined"
                    />
                    {resource.template && (
                      <Chip size="small" label="Manifest template" color="info" />
                    )}
                    <Chip
                      size="small"
                      label={`Creation: ${resource.policy?.creation || 'Owner'}`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Deletion: ${resource.policy?.deletion || 'Remove'}`}
                      variant="outlined"
                    />
                  </Stack>
                  {(resource.targets || []).map((target: any, targetIndex: number) => {
                    const subjects = manifestSubjects(target);
                    return (
                      <Box
                        key={targetIndex}
                        sx={{ borderTop: targetIndex === 0 ? 0 : 1, borderColor: 'divider' }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ px: 2, pt: 1.5, display: 'block' }}
                        >
                          Direct target {targetIndex + 1}
                        </Typography>
                        {subjects.length > 0 && (
                          <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ px: 2, pt: 1 }}>
                            {subjects.map(subject => (
                              <CapsuleSubjectLink
                                key={`${subject.kind}-${subject.namespace || ''}-${subject.name}`}
                                display="chip"
                                subject={subject}
                                namespaces={namespaces}
                              />
                            ))}
                          </Stack>
                        )}
                        {codeBlock(target)}
                      </Box>
                    );
                  })}
                  {resource.template && (
                    <Box
                      sx={{ borderTop: resource.targets?.length ? 1 : 0, borderColor: 'divider' }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ px: 2, pt: 1.5, display: 'block' }}
                      >
                        Go template
                      </Typography>
                      {codeBlock(resource.template)}
                    </Box>
                  )}
                </Paper>
              ))}
            </Stack>
          )}
        </SectionBox>
      </DetailsSectionStack>
    </Resource.DetailsGrid>
  );
}

export function GlobalResourcePermitTemplateDetail(props: GlobalResourcePermitTemplateDetailProps) {
  return <ResourcePermitTemplateDetailView namespaced={false} requestedName={props.name} />;
}

export function ResourcePermitTemplateDetail(props: ResourcePermitTemplateDetailProps) {
  return (
    <ResourcePermitTemplateDetailView
      namespaced
      requestedName={props.name}
      requestedNamespace={props.namespace}
    />
  );
}

export default GlobalResourcePermitTemplateDetail;
