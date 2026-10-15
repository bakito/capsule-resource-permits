import { Icon } from '@iconify/react';
import { Activity, ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { type MouseEvent, useEffect, useMemo, useState } from 'react';
import { CAPSULE_CRDS } from '../../resources/capsuleCustomResources';
import { ResourcePermit } from '../../resources/resourcePermits';
import { AnchoredSectionBox as SectionBox } from '../common/AnchoredSectionBox';
import { CapsuleResourceLink } from '../common/CapsuleResourceLink';
import { CapsuleSubjectLink } from '../subjects/CapsuleSubjectLink';
import { capsuleSubjectFromAccessEntity } from '../subjects/subjectReferences';
import { ResourcePermitCLICommand } from './ResourcePermitCLICommand';
import {
  flattenRenderedResourcePermitTargets,
  formatAccessEntity,
  resourcePermitIsReviewable,
  resourcePermitPhase,
  resourcePermitServiceAccountEntity,
  resourcePermitStatusRequest,
  resourcePermitTemplateReference,
} from './resourcePermitHelpers';
import { ResourcePermitResultingChanges } from './ResourcePermitResultingChanges';
import { ResourcePermitRetention } from './ResourcePermitRetention';
import {
  buildResourcePermitReviewRequest,
  hasResourcePermitReviewSnapshot,
  normalizeResourcePermitReviewStartTime,
  resourcePermitReviewDateTimeInput,
  type ResourcePermitReviewVerdict,
} from './resourcePermitReview';

export interface ResourcePermitReviewProps {
  cluster?: string;
  name: string;
  namespace: string;
}

function currentCluster(item?: any): string | undefined {
  if (item?.cluster) return item.cluster;
  if (typeof window === 'undefined') return undefined;
  return window.location.pathname.match(/^\/c\/([^/]+)/)?.[1];
}

export function openResourcePermitReviewActivity(item: any) {
  const name = item?.getName?.() || item?.metadata?.name || item?.jsonData?.metadata?.name;
  const namespace =
    item?.getNamespace?.() || item?.metadata?.namespace || item?.jsonData?.metadata?.namespace;
  if (!name || !namespace) return;

  const cluster = currentCluster(item);
  Activity.launch({
    id: `permits-resource-permit-review ${namespace} ${name} ${cluster || ''}`,
    title: `Review ResourcePermit ${namespace}/${name}`,
    hideTitleInHeader: true,
    location: 'split-right',
    temporary: true,
    cluster,
    content: <ResourcePermitReview cluster={cluster} name={name} namespace={namespace} />,
    icon: <Icon icon="mdi:clipboard-check-outline" width="100%" height="100%" />,
  });
}

export function ResourcePermitReviewButton({ item }: { item: any }) {
  if (!resourcePermitIsReviewable(item)) return null;

  const openReview = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openResourcePermitReviewActivity(item);
  };

  return (
    <Button
      onClick={openReview}
      size="small"
      startIcon={<Icon icon="mdi:clipboard-check-outline" />}
      variant="outlined"
    >
      Review
    </Button>
  );
}

export function ResourcePermitReview({ cluster, name, namespace }: ResourcePermitReviewProps) {
  const [liveRequest, error] = ResourcePermit.useGet(name, namespace, { cluster });
  const [refreshedRequest, setRefreshedRequest] = useState<ResourcePermit | null>(null);
  const [verdict, setVerdict] = useState<ResourcePermitReviewVerdict | ''>('');
  const [comment, setComment] = useState('');
  const [duration, setDuration] = useState('');
  const [startTime, setStartTime] = useState('');
  const [lifecycleInitialized, setLifecycleInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const request = refreshedRequest || liveRequest;
  const statusRequest = resourcePermitStatusRequest(request);
  const templateReference = resourcePermitTemplateReference(request);
  const targets = useMemo(() => flattenRenderedResourcePermitTargets(request), [request]);
  const reviewable = resourcePermitIsReviewable(request);
  const hasSnapshot = hasResourcePermitReviewSnapshot(request);
  const requestor = capsuleSubjectFromAccessEntity(request?.spec?.requestor);
  const executionEntity = resourcePermitServiceAccountEntity(request);
  const executionSubject = capsuleSubjectFromAccessEntity(executionEntity);
  const normalizedStartTime = normalizeResourcePermitReviewStartTime(startTime);
  const startTimeError = verdict === 'Approved' && !normalizedStartTime;
  const submitRequest = verdict
    ? buildResourcePermitReviewRequest(
        request,
        verdict,
        comment,
        verdict === 'Approved' ? { duration, startTime } : undefined
      )
    : null;

  useEffect(() => {
    if (!request || lifecycleInitialized) return;
    setDuration(statusRequest?.duration || '');
    setStartTime(
      resourcePermitReviewDateTimeInput(statusRequest?.startTime || new Date().toISOString())
    );
    setLifecycleInitialized(true);
  }, [lifecycleInitialized, request, statusRequest?.duration, statusRequest?.startTime]);

  const submit = async () => {
    if (!submitRequest || submitting) return;
    setSubmitting(true);
    try {
      await ApiProxy.patch(submitRequest.url, submitRequest.body, undefined, { cluster });
      try {
        const refreshed = await ApiProxy.request(submitRequest.url.replace(/\/status$/, ''), {
          cluster,
        });
        setRefreshedRequest(new ResourcePermit(refreshed, cluster));
      } catch {
        // The active watch will still update this panel after the accepted status transition.
      }
      enqueueSnackbar(
        `${
          submitRequest.verdict === 'Approved' ? 'Approved' : 'Declined'
        } ResourcePermit ${namespace}/${name}`,
        { variant: 'success' }
      );
    } catch (submitError: any) {
      enqueueSnackbar(
        `Failed to submit ResourcePermit review: ${submitError?.message || String(submitError)}`,
        { variant: 'error' }
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <SectionBox title={`Review: ${namespace}/${name}`}>
        <Alert severity="error">
          This ResourcePermit cannot be loaded directly or this account does not have get access.
        </Alert>
      </SectionBox>
    );
  }

  if (!request) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, p: 2 }}>
        <CircularProgress size={20} />
        <Typography>Loading ResourcePermit…</Typography>
      </Box>
    );
  }

  return (
    <>
      <SectionBox title={`Review: ${namespace}/${name}`}>
        <Stack gap={1.5}>
          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <Chip label={resourcePermitPhase(request)} color={reviewable ? 'warning' : 'default'} />
            {templateReference?.name && (
              <CapsuleResourceLink
                crd={
                  templateReference.kind === 'ResourcePermitTemplate'
                    ? CAPSULE_CRDS.ResourcePermitTemplate
                    : CAPSULE_CRDS.GlobalResourcePermitTemplate
                }
                name={templateReference.name}
                namespace={
                  templateReference.kind === 'ResourcePermitTemplate' ? namespace : undefined
                }
              >
                Template: {templateReference.name}
              </CapsuleResourceLink>
            )}
          </Stack>
          <Typography>
            <strong>Requestor:</strong>{' '}
            {requestor ? (
              <CapsuleSubjectLink subject={requestor} namespaces={[namespace]} />
            ) : (
              formatAccessEntity(request.spec?.requestor)
            )}
          </Typography>
          <Typography>
            <strong>Reason:</strong> {request.spec?.reason || '—'}
          </Typography>
          {executionEntity && (
            <Typography>
              <strong>Execution ServiceAccount:</strong>{' '}
              {executionSubject ? (
                <CapsuleSubjectLink
                  subject={executionSubject}
                  namespaces={
                    [
                      ...new Set([namespace, executionSubject.namespace].filter(Boolean)),
                    ] as string[]
                  }
                />
              ) : (
                formatAccessEntity(executionEntity)
              )}
            </Typography>
          )}
          <Typography>
            <strong>Effective duration:</strong> {statusRequest?.duration || 'Unlimited'}
          </Typography>
          <ResourcePermitCLICommand action="review" name={name} namespace={namespace} />
          <ResourcePermitRetention request={request} />
        </Stack>
      </SectionBox>

      <SectionBox title="Resulting Changes">
        {hasSnapshot ? (
          <ResourcePermitResultingChanges cluster={cluster} targets={targets} />
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            The controller has not published <code>status.request</code>. Approval is disabled
            because the review must not infer or recreate the rendered resources. You can still
            decline this request.
          </Alert>
        )}
      </SectionBox>

      <SectionBox title="Verdict">
        {!reviewable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This request is in phase {resourcePermitPhase(request)} and is no longer awaiting a
            review.
          </Alert>
        )}
        <Stack gap={2}>
          <FormControl disabled={!reviewable || submitting}>
            <FormLabel id={`resource-permit-verdict-${namespace}-${name}`}>Verdict</FormLabel>
            <RadioGroup
              aria-labelledby={`resource-permit-verdict-${namespace}-${name}`}
              onChange={event => setVerdict(event.target.value as ResourcePermitReviewVerdict)}
              value={verdict}
            >
              <FormControlLabel
                control={<Radio />}
                disabled={!hasSnapshot}
                label="Approve"
                value="Approved"
              />
              <FormControlLabel control={<Radio />} label="Decline" value="Denied" />
            </RadioGroup>
          </FormControl>
          <Paper
            variant="outlined"
            sx={{
              bgcolor: 'action.hover',
              borderColor: 'divider',
              p: 2,
            }}
          >
            <Stack gap={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Approval timing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reviewers may adjust the effective access window before approving. These values
                  are ignored when declining.
                </Typography>
              </Box>
              <TextField
                disabled={!reviewable || submitting || verdict === 'Denied'}
                fullWidth
                helperText="Change the effective duration if needed. Leave blank for unlimited access."
                label="Duration"
                onChange={event => setDuration(event.target.value)}
                placeholder="For example: 1h"
                value={duration}
              />
              <TextField
                disabled={!reviewable || submitting || verdict === 'Denied'}
                error={startTimeError}
                fullWidth
                helperText={
                  startTimeError
                    ? 'Choose the effective start time before approving.'
                    : 'Change when access begins, or keep the prefilled effective value.'
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 1 }}
                label="Start time"
                onChange={event => setStartTime(event.target.value)}
                required={verdict === 'Approved'}
                type="datetime-local"
                value={startTime}
              />
            </Stack>
          </Paper>
          <TextField
            disabled={!reviewable || submitting}
            error={verdict === 'Denied' && comment.length > 0 && !comment.trim()}
            fullWidth
            helperText="Optional for approvals; required when declining."
            label="Review comment"
            minRows={4}
            multiline
            onChange={event => setComment(event.target.value)}
            required={verdict === 'Denied'}
            value={comment}
          />
          <Button
            color={verdict === 'Denied' ? 'error' : 'primary'}
            disabled={!submitRequest || submitting}
            onClick={submit}
            startIcon={
              submitting ? (
                <CircularProgress color="inherit" size={18} />
              ) : (
                <Icon icon={verdict === 'Denied' ? 'mdi:close-circle-outline' : 'mdi:check'} />
              )
            }
            variant="contained"
          >
            {verdict === 'Denied'
              ? 'Decline request'
              : verdict === 'Approved'
              ? 'Submit approval'
              : 'Select a verdict'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            The browser requests only the lifecycle phase, optional timing overrides, and comment.
            The addon records the authenticated actor, reviewer, verdict, and audit transition.
          </Typography>
        </Stack>
      </SectionBox>
    </>
  );
}

export default ResourcePermitReview;
