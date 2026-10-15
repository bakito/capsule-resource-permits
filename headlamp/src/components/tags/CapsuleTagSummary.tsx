import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { CAPSULE_CRDS } from '../../resources/capsuleCustomResources';
import {
  GlobalResourcePermitTemplate,
  ResourcePermit,
  ResourcePermitTemplate,
} from '../../resources/resourcePermits';
import { AnchoredSectionBox as SectionBox } from '../common/AnchoredSectionBox';
import { CapsuleResourceLink } from '../common/CapsuleResourceLink';
import { StatCard } from '../common/StatCard';
import { SummaryCardGrid } from '../common/SummaryCardGrid';
import {
  capsuleResourceHasTag,
  capsuleResourceMetadata,
  capsuleResourceTags,
  capsuleTagNamespacesFromSearch,
} from './capsuleTags';

interface ResourceInventory {
  error: any;
  items: any[] | null | undefined;
  kind: string;
}

const CAPSULE_CRD_BY_KIND: Record<string, string> = {
  ResourcePermit: CAPSULE_CRDS.ResourcePermit,
  ResourcePermitTemplate: CAPSULE_CRDS.ResourcePermitTemplate,

  GlobalResourcePermitTemplate: CAPSULE_CRDS.GlobalResourcePermitTemplate,
};

function capsuleResourceKind(resource: any): string {
  return resource?.kind || resource?.jsonData?.kind || resource?.constructor?.kind || 'Unknown';
}

function decoded(value: string | undefined): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function StaticTagChips({ tags }: { tags: string[] }) {
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {tags.map(tag => (
        <Chip key={tag} color="primary" label={tag} size="small" variant="outlined" />
      ))}
    </Stack>
  );
}

export interface CapsuleTagSummaryProps {
  namespaces?: string[];
  tag?: string;
}

export function CapsuleTagSummary(props: CapsuleTagSummaryProps = {}) {
  const params = useParams<{ tag: string }>();
  const location = useLocation();
  const tag = String(props.tag ?? decoded(params.tag)).trim();
  const namespaces = useMemo(
    () => props.namespaces ?? capsuleTagNamespacesFromSearch(location.search),
    [location.search, props.namespaces]
  );
  const namespaceScope = namespaces.length > 0 ? namespaces : undefined;

  const [resourcePermits, resourcePermitsError] = ResourcePermit.useList({
    namespace: namespaceScope,
  });
  const [resourcePermitTemplates, resourcePermitTemplatesError] = ResourcePermitTemplate.useList({
    namespace: namespaceScope,
  });

  const [templates, templatesError] = GlobalResourcePermitTemplate.useList();

  const inventories: ResourceInventory[] = [
    {
      error: resourcePermitsError,
      items: resourcePermits,
      kind: 'ResourcePermit',
    },
    {
      error: resourcePermitTemplatesError,
      items: resourcePermitTemplates,
      kind: 'ResourcePermitTemplate',
    },

    {
      error: templatesError,
      items: templates,
      kind: 'GlobalResourcePermitTemplate',
    },
  ];
  const rows: any[] = inventories
    .flatMap(inventory => inventory.items || [])
    .filter(item => capsuleResourceHasTag(item, tag))
    .sort(
      (left, right) =>
        capsuleResourceKind(left).localeCompare(capsuleResourceKind(right)) ||
        String(capsuleResourceMetadata(left).namespace || '').localeCompare(
          String(capsuleResourceMetadata(right).namespace || '')
        ) ||
        left.getName().localeCompare(right.getName())
    );
  const unavailable = inventories.filter(inventory => !!inventory.error);
  const loading = inventories.some(inventory => !inventory.items && !inventory.error);
  const kinds = new Set(rows.map(row => capsuleResourceKind(row))).size;
  const matchedNamespaces = new Set(
    rows.map(row => capsuleResourceMetadata(row).namespace).filter(Boolean)
  ).size;
  const scopedDescription = namespaces.length
    ? namespaces.join(', ')
    : 'the account’s permitted all-Namespace scope';

  return (
    <>
      <SectionBox title={`Tag: ${tag || 'Unknown'}`}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1, alignItems: { sm: 'center' } }}
        >
          <Chip color="primary" label={tag || 'Unknown'} />
          <Typography>
            Matching visible permit resources are correlated across cluster-scoped APIs and{' '}
            {scopedDescription}.
          </Typography>
        </Stack>
      </SectionBox>

      <SummaryCardGrid columns={3} marginBottom={2} inset>
        <StatCard
          label="MATCHING RESOURCES"
          total={rows.length}
          segments={[{ name: 'Resources', value: rows.length, color: '#1976d2' }]}
          chips={[{ label: `${rows.length} Visible`, color: 'primary' }]}
        />
        <StatCard
          label="RESOURCE TYPES"
          total={kinds}
          segments={[{ name: 'Kinds', value: kinds, color: '#7b1fa2' }]}
          chips={[{ label: `${kinds} Kinds`, color: 'info' }]}
        />
        <StatCard
          label="NAMESPACES"
          total={matchedNamespaces}
          segments={[{ name: 'Namespaces', value: matchedNamespaces, color: '#00897b' }]}
          chips={[{ label: `${matchedNamespaces} Namespaced`, color: 'success' }]}
        />
      </SummaryCardGrid>

      {loading && (
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, px: 2, py: 1 }}>
          <CircularProgress size={20} />
          <Typography sx={{ color: 'text.secondary' }}>
            Loading visible permit resources…
          </Typography>
        </Box>
      )}
      {unavailable.length > 0 && (
        <Alert severity="info" sx={{ mb: 1.5, mx: { xs: 0, sm: 2 } }}>
          {unavailable.length} permit resource {unavailable.length === 1 ? 'API is' : 'APIs are'}
          unavailable to this account or not installed:{' '}
          {unavailable.map(item => item.kind).join(', ')}. Results from readable APIs remain
          visible.
        </Alert>
      )}
      {!loading && rows.length === 0 && (
        <Alert severity="info" sx={{ mb: 1.5, mx: { xs: 0, sm: 2 } }}>
          No visible permit resources use the tag <strong>{tag}</strong>.
        </Alert>
      )}

      {rows.length > 0 && (
        <ResourceListView
          id="permits-tagged-resources"
          title="Matching Resources"
          data={rows}
          defaultSortingColumn={{ id: 'kind', desc: false }}
          enableRowActions={false}
          enableRowSelection={false}
          columns={[
            {
              id: 'name',
              label: 'Name',
              getValue: row => row.getName(),
              render: row => (
                <CapsuleResourceLink
                  crd={CAPSULE_CRD_BY_KIND[capsuleResourceKind(row)]}
                  name={row.getName()}
                  namespace={capsuleResourceMetadata(row).namespace}
                >
                  {row.getName()}
                </CapsuleResourceLink>
              ),
            },
            {
              id: 'kind',
              label: 'Kind',
              getValue: row => capsuleResourceKind(row),
              filterVariant: 'select',
            },
            {
              id: 'namespace',
              label: 'Namespace',
              getValue: row => capsuleResourceMetadata(row).namespace || 'Cluster-scoped',
            },
            {
              id: 'tags',
              label: 'Tags',
              getValue: row => capsuleResourceTags(row).join(', '),
              render: row => <StaticTagChips tags={capsuleResourceTags(row)} />,
            },
          ]}
        />
      )}
    </>
  );
}

export default CapsuleTagSummary;
