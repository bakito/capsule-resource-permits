import { Icon } from '@iconify/react';
import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  isKubernetesNotFound,
  resourcePermitTargetDiff,
  resourcePermitTargetDiscoveryURL,
  resourcePermitTargetURL,
} from './resourcePermitDiff';
import type { RenderedResourcePermitTarget } from './resourcePermitHelpers';

interface TargetChangeState {
  error?: string;
  live?: any;
  loading?: boolean;
  missing?: boolean;
}

export function ResourcePermitResultingChanges({
  cluster,
  targets,
}: {
  cluster?: string;
  targets: RenderedResourcePermitTarget[];
}) {
  const [states, setStates] = useState<Record<string, TargetChangeState>>({});

  useEffect(() => {
    let active = true;
    setStates(Object.fromEntries(targets.map(target => [target.id, { loading: true }])));

    const discoveryRequests = new Map<string, Promise<any>>();
    const discoverResourceName = async (target: RenderedResourcePermitTarget) => {
      const discoveryURL = resourcePermitTargetDiscoveryURL(target);
      if (!discoveryRequests.has(discoveryURL)) {
        discoveryRequests.set(discoveryURL, ApiProxy.request(discoveryURL, { cluster }));
      }

      try {
        const discovery = await discoveryRequests.get(discoveryURL);
        return discovery?.resources?.find(
          (resource: any) =>
            resource.kind === target.kind &&
            !String(resource.name || '').includes('/') &&
            Boolean(resource.namespaced) === Boolean(target.namespace)
        )?.name;
      } catch {
        return undefined;
      }
    };

    for (const target of targets) {
      discoverResourceName(target)
        .then(resourceName =>
          ApiProxy.request(resourcePermitTargetURL(target, resourceName), { cluster })
        )
        .then(live => {
          if (!active) return;
          setStates(previous => ({ ...previous, [target.id]: { live } }));
        })
        .catch(error => {
          if (!active) return;
          setStates(previous => ({
            ...previous,
            [target.id]: isKubernetesNotFound(error)
              ? { missing: true }
              : { error: error?.message || String(error) },
          }));
        });
    }

    return () => {
      active = false;
    };
  }, [cluster, targets]);

  if (targets.length === 0) {
    return <Typography color="text.secondary">No rendered targets to compare.</Typography>;
  }

  return (
    <Stack gap={2}>
      <Alert severity="info">
        The comparison uses only fields present in each rendered manifest, so Kubernetes-generated
        metadata and status are not misrepresented as removals.
      </Alert>
      {targets.map(target => {
        const state = states[target.id] || { loading: true };
        const changes = state.error
          ? []
          : resourcePermitTargetDiff(state.missing ? undefined : state.live, target.manifest);
        const hasChanges = changes.some(change => change.added || change.removed);
        const changeLabel = state.missing ? 'Create' : hasChanges ? 'Change' : 'No change';

        return (
          <Accordion
            key={target.id}
            disableGutters
            variant="outlined"
            sx={{
              borderRadius: 1,
              overflow: 'hidden',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { m: 0 },
            }}
          >
            <AccordionSummary
              aria-controls={`${target.id}-resulting-change`}
              expandIcon={<Icon icon="mdi:chevron-down" />}
              id={`${target.id}-resulting-change-header`}
              sx={{
                bgcolor: 'action.hover',
                px: 1.5,
                '& .MuiAccordionSummary-content': { my: 1.25 },
              }}
            >
              <Stack direction="row" gap={1} alignItems="center" sx={{ width: '100%' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">
                    {target.kind}: {target.namespace ? `${target.namespace}/` : ''}
                    {target.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {target.apiVersion}
                  </Typography>
                </Box>
                {state.loading ? (
                  <CircularProgress aria-label="Loading current object" size={18} />
                ) : (
                  !state.error && (
                    <Chip
                      color={state.missing ? 'success' : hasChanges ? 'warning' : 'default'}
                      label={changeLabel}
                      size="small"
                    />
                  )
                )}
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ borderTop: 1, borderColor: 'divider', p: 0 }}>
              {state.loading ? (
                <Stack direction="row" gap={1} alignItems="center" sx={{ p: 2 }}>
                  <CircularProgress size={18} />
                  <Typography color="text.secondary">Loading current object…</Typography>
                </Stack>
              ) : state.error ? (
                <Alert severity="info" sx={{ m: 2 }}>
                  The live object could not be compared: {state.error}
                </Alert>
              ) : !hasChanges ? (
                <Typography color="text.secondary" sx={{ p: 2 }}>
                  The rendered fields already match the live object.
                </Typography>
              ) : (
                <Box
                  component="pre"
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                    m: 0,
                    maxHeight: 420,
                    overflow: 'auto',
                    py: 1,
                  }}
                >
                  {changes.map((change, index) => (
                    <Box
                      component="span"
                      key={`${target.id}-${index}`}
                      sx={{
                        bgcolor: change.added
                          ? 'rgba(46, 125, 50, 0.16)'
                          : change.removed
                          ? 'rgba(211, 47, 47, 0.16)'
                          : 'transparent',
                        color: change.added
                          ? 'success.main'
                          : change.removed
                          ? 'error.main'
                          : 'text.primary',
                        display: 'block',
                        px: 2,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {change.value
                        .split('\n')
                        .map((line, lineIndex, lines) => {
                          if (lineIndex === lines.length - 1 && line === '') return '';
                          const prefix = change.added ? '+ ' : change.removed ? '- ' : '  ';
                          return `${prefix}${line}${lineIndex < lines.length - 1 ? '\n' : ''}`;
                        })
                        .join('')}
                    </Box>
                  ))}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

export default ResourcePermitResultingChanges;
