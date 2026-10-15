import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Chip, Typography } from '@mui/material';
import { useMemo } from 'react';
import { CAPSULE_CRDS } from '../../resources/capsuleCustomResources';
import { GlobalResourcePermitTemplate } from '../../resources/resourcePermits';
import { AnchoredSectionBox as SectionBox } from '../common/AnchoredSectionBox';
import { CapsuleResourceLink } from '../common/CapsuleResourceLink';
import { anchoredResourceListHeaderProps } from '../common/SectionAnchor';
import { StatCard } from '../common/StatCard';
import { SummaryCardGrid } from '../common/SummaryCardGrid';
import {
  resourcePermitTemplateDescription,
  templateApprovalMode,
  templateNamespaces,
  templateTargetCount,
} from './resourcePermitHelpers';
import { ResourcePermitTemplateIcon } from './ResourcePermitTemplatePresentation';

export function GlobalResourcePermitTemplatesList() {
  const [items, error] = GlobalResourcePermitTemplate.useList();
  const summary = useMemo(() => {
    let automatic = 0;
    let manual = 0;
    let targets = 0;
    const namespaces = new Set<string>();

    for (const item of items || []) {
      if (templateApprovalMode(item) === 'Automatic') automatic += 1;
      else manual += 1;
      targets += templateTargetCount(item);
      templateNamespaces(item).forEach(namespace => namespaces.add(namespace));
    }

    return {
      automatic,
      manual,
      namespaces: namespaces.size,
      targets,
      total: items?.length || 0,
      unrestricted: namespaces.has('*'),
    };
  }, [items]);

  if (error) {
    return (
      <SectionBox title="Global Templates">
        <Alert severity="error">
          GlobalResourcePermitTemplates are unavailable. This page reads the template API directly;
          grant this account access to globalresourcepermittemplates.addons.projectcapsule.dev.
        </Alert>
      </SectionBox>
    );
  }

  return (
    <>
      <SummaryCardGrid columns={3} marginBottom={2} inset>
        <StatCard
          label="GLOBAL TEMPLATES"
          total={summary.total}
          segments={[
            { name: 'Manual approval', value: summary.manual, color: '#ed6c02' },
            { name: 'Automatic approval', value: summary.automatic, color: '#2e7d32' },
          ]}
          chips={[
            { label: `${summary.manual} Manual`, color: 'warning' },
            { label: `${summary.automatic} Automatic`, color: 'success' },
          ]}
        />
        <StatCard
          label="RENDER TARGETS"
          total={summary.targets}
          segments={[{ name: 'Targets', value: summary.targets, color: '#1976d2' }]}
          chips={[{ label: `${summary.targets} Targets`, color: 'primary' }]}
          footer={
            <Typography variant="caption" color="text.secondary">
              Direct target groups and manifest templates
            </Typography>
          }
        />
        <StatCard
          label="NAMESPACES IN SCOPE"
          total={summary.namespaces}
          segments={[{ name: 'Namespaces', value: summary.namespaces, color: '#7b1fa2' }]}
          chips={[
            {
              label: summary.unrestricted ? 'All Namespaces' : `${summary.namespaces} Reported`,
              color: 'info',
            },
          ]}
        />
      </SummaryCardGrid>

      <ResourceListView
        id="permits-global-resource-permit-templates"
        title="Global Templates"
        resourceClass={GlobalResourcePermitTemplate}
        headerProps={anchoredResourceListHeaderProps('Global Templates')}
        defaultSortingColumn={{ id: 'name', desc: false }}
        enableRowActions
        columns={[
          {
            id: 'name',
            label: 'Name',
            getValue: item => item.getName(),
            render: item => (
              <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                <ResourcePermitTemplateIcon template={item} size={22} />
                <CapsuleResourceLink
                  crd={CAPSULE_CRDS.GlobalResourcePermitTemplate}
                  name={item.getName()}
                >
                  {item.getName()}
                </CapsuleResourceLink>
              </Box>
            ),
          },
          {
            id: 'description',
            label: 'Description',
            getValue: item => resourcePermitTemplateDescription(item) || '',
            render: item => (
              <Typography
                color={resourcePermitTemplateDescription(item) ? 'text.primary' : 'text.secondary'}
                variant="body2"
                sx={{
                  maxWidth: 320,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {resourcePermitTemplateDescription(item) || 'No description provided.'}
              </Typography>
            ),
          },
          {
            id: 'approval',
            label: 'Approval',
            getValue: item => templateApprovalMode(item),
            render: item => {
              const mode = templateApprovalMode(item);
              return (
                <Chip
                  size="small"
                  label={mode}
                  color={mode === 'Automatic' ? 'success' : 'warning'}
                />
              );
            },
            filterVariant: 'select',
          },
          {
            id: 'namespaces',
            label: 'Namespaces',
            getValue: item => templateNamespaces(item).join(' '),
            render: item => {
              const namespaces = templateNamespaces(item);
              return namespaces.includes('*') ? 'All Namespaces' : namespaces.length;
            },
          },
          'age',
        ]}
      />
    </>
  );
}

export default GlobalResourcePermitTemplatesList;
