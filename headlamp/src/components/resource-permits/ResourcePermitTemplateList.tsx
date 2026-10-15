import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Chip, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CAPSULE_CRDS } from '../../resources/capsuleCustomResources';
import {
  GlobalResourcePermitTemplate,
  ResourcePermitTemplate,
} from '../../resources/resourcePermits';
import { AnchoredSectionBox as SectionBox } from '../common/AnchoredSectionBox';
import { CapsuleResourceLink } from '../common/CapsuleResourceLink';
import { anchoredResourceListHeaderProps } from '../common/SectionAnchor';
import { StatCard } from '../common/StatCard';
import { SummaryCardGrid } from '../common/SummaryCardGrid';
import {
  combineResourcePermitTemplates,
  resourcePermitNamespacesFromSearch,
  resourcePermitTemplateDescription,
  templateApprovalMode,
  templateNamespaces,
  templateTargetCount,
} from './resourcePermitHelpers';
import { ResourcePermitTemplateIcon } from './ResourcePermitTemplatePresentation';

export function ResourcePermitTemplatesList() {
  const location = useLocation();
  const namespaceScope = useMemo(
    () => resourcePermitNamespacesFromSearch(location.search),
    [location.search]
  );
  const [namespacedItems, namespacedError] = ResourcePermitTemplate.useList({
    namespace: namespaceScope.length ? namespaceScope : undefined,
  });
  const [globalItems, globalError] = GlobalResourcePermitTemplate.useList();
  const items = useMemo(() => {
    if (!namespacedItems && !globalItems && !namespacedError && !globalError) return null;
    return combineResourcePermitTemplates(namespacedItems, globalItems);
  }, [globalError, globalItems, namespacedError, namespacedItems]);
  const summary = useMemo(() => {
    let automatic = 0;
    let manual = 0;
    let targets = 0;
    const namespaces = new Set<string>();
    let unrestricted = false;

    for (const item of items || []) {
      if (templateApprovalMode(item) === 'Automatic') automatic += 1;
      else manual += 1;
      targets += templateTargetCount(item);
      if (item.getNamespace()) {
        namespaces.add(item.getNamespace()!);
      } else {
        for (const namespace of templateNamespaces(item)) {
          if (namespace === '*') unrestricted = true;
          else namespaces.add(namespace);
        }
      }
    }

    return {
      automatic,
      manual,
      namespaces: namespaces.size,
      targets,
      total: items?.length || 0,
      unrestricted,
    };
  }, [items]);

  if (namespacedError && globalError) {
    return (
      <SectionBox title="Templates">
        <Alert severity="error">
          ResourcePermitTemplates and GlobalResourcePermitTemplates are unavailable. Grant this
          account list access to at least one template API.
        </Alert>
      </SectionBox>
    );
  }

  return (
    <>
      {(namespacedError || globalError) && (
        <Box sx={{ px: { xs: 0, sm: 2 }, pt: 3 }}>
          <Alert severity="info">
            {namespacedError
              ? 'Namespaced ResourcePermitTemplates could not be listed. Global templates returned by the readable API remain visible.'
              : 'GlobalResourcePermitTemplates could not be listed. Namespaced templates returned by the readable API remain visible.'}
          </Alert>
        </Box>
      )}
      <SummaryCardGrid columns={3} marginBottom={2} inset>
        <StatCard
          label="TEMPLATES"
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
        />
        <StatCard
          label="NAMESPACES"
          total={summary.namespaces}
          segments={[{ name: 'Namespaces', value: summary.namespaces, color: '#7b1fa2' }]}
          chips={[
            {
              label: summary.unrestricted ? 'All Namespaces' : `${summary.namespaces} Visible`,
              color: 'info',
            },
          ]}
        />
      </SummaryCardGrid>

      <ResourceListView
        id="permits-resource-permit-templates"
        title="Templates"
        data={items}
        headerProps={anchoredResourceListHeaderProps('Templates', {
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
              <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                <ResourcePermitTemplateIcon template={item} size={22} />
                <CapsuleResourceLink
                  crd={
                    item.getNamespace()
                      ? CAPSULE_CRDS.ResourcePermitTemplate
                      : CAPSULE_CRDS.GlobalResourcePermitTemplate
                  }
                  name={item.getName()}
                  namespace={item.getNamespace()}
                >
                  {item.getName()}
                </CapsuleResourceLink>
              </Box>
            ),
          },
          {
            id: 'scope',
            label: 'Scope',
            getValue: item => (item.getNamespace() ? 'Namespaced' : 'Global'),
            render: item => (
              <Chip
                color={item.getNamespace() ? 'secondary' : 'info'}
                label={item.getNamespace() ? 'Namespaced' : 'Global'}
                size="small"
                variant="outlined"
              />
            ),
            filterVariant: 'select',
          },
          {
            id: 'availability',
            label: 'Namespace Availability',
            getValue: item => {
              const namespaces = item.getNamespace()
                ? [item.getNamespace()!]
                : templateNamespaces(item);
              return namespaces.includes('*') ? 'All Namespaces' : namespaces.join(' ');
            },
            render: item => {
              if (item.getNamespace()) return item.getNamespace();
              const namespaces = templateNamespaces(item);
              if (namespaces.includes('*')) return 'All Namespaces';
              return namespaces.length ? `${namespaces.length} Namespaces` : 'Not reported';
            },
          },
          {
            id: 'description',
            label: 'Description',
            getValue: item => resourcePermitTemplateDescription(item) || '',
            render: item => (
              <Typography
                color={resourcePermitTemplateDescription(item) ? 'text.primary' : 'text.secondary'}
                variant="body2"
                sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}
                noWrap
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
          'age',
        ]}
      />
    </>
  );
}

export default ResourcePermitTemplatesList;
