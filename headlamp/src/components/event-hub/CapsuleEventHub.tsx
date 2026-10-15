import { Icon } from '@iconify/react';
import { ApiProxy, K8s } from '@kinvolk/headlamp-plugin/lib';
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { type MouseEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { CAPSULE_CRDS } from '../../resources/capsuleCustomResources';
import { ResourcePermit } from '../../resources/resourcePermits';
import { CapsuleResourceLink } from '../common/CapsuleResourceLink';
import {
  formatAccessEntity,
  resourcePermitIsReviewable,
  resourcePermitNamespacesFromSearch,
  resourcePermitPhasePresentation,
} from '../resource-permits/resourcePermitHelpers';
import { openResourcePermitReviewActivity } from '../resource-permits/ResourcePermitReviewActivity';
import { CapsuleSubjectLink } from '../subjects/CapsuleSubjectLink';
import { capsuleSubjectFromAccessEntity } from '../subjects/subjectReferences';
import {
  type EventHubEventType,
  type EventHubTimeframe,
  eventHubTransitionNotifications,
  type EventHubUserInfo,
  filterEventHubNotificationsByTimeframe,
  filterEventHubNotificationsByType,
  type ResourcePermitTransitionNotification,
} from './eventHubHelpers';

const MAX_VISIBLE_PER_AUDIENCE = 30;
const TIMEFRAME_OPTIONS: Array<{ label: string; value: EventHubTimeframe }> = [
  { label: 'Last hour', value: '1h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'All time', value: 'all' },
];
const EVENT_TYPE_OPTIONS: Array<{ label: string; value: EventHubEventType }> = [
  { label: 'All events', value: 'all' },
  { label: 'Action required', value: 'action-required' },
  { label: 'Informational', value: 'informational' },
];

function displayTimestamp(value: string): string {
  if (!value) return 'Time not reported';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

function FeedSection({
  children,
  count,
  title,
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  if (count === 0) return null;
  return (
    <Box component="section">
      <Stack alignItems="center" direction="row" justifyContent="space-between" px={2} py={1}>
        <Typography color="text.secondary" fontWeight={700} variant="overline">
          {title}
        </Typography>
        <Chip label={count} size="small" />
      </Stack>
      {children}
    </Box>
  );
}

function ResourcePermitLink({
  request,
  onNavigate,
}: {
  request: ResourcePermit;
  onNavigate: () => void;
}) {
  return (
    <Box component="span" onClick={onNavigate}>
      <CapsuleResourceLink
        crd={CAPSULE_CRDS.ResourcePermit}
        name={request.getName()}
        namespace={request.getNamespace()}
      >
        ResourcePermit/{request.getName()}
      </CapsuleResourceLink>
    </Box>
  );
}

function TransitionItem({
  notification,
  onClose,
}: {
  notification: ResourcePermitTransitionNotification;
  onClose: () => void;
}) {
  const { request, transition } = notification;
  const presentation = resourcePermitPhasePresentation(transition.type);
  const timestamp = transition.timestamp || transition.eventTime || '';
  const reviewable = notification.audience === 'reviewer' && resourcePermitIsReviewable(request);
  const actorSubject = capsuleSubjectFromAccessEntity(transition.actor);
  const requestNamespace = request.getNamespace();

  return (
    <Box
      sx={theme => ({
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor:
          notification.audience === 'reviewer'
            ? alpha(theme.palette.warning.main, 0.07)
            : 'transparent',
        px: 2,
        py: 1.5,
      })}
    >
      <Stack alignItems="flex-start" direction="row" gap={1.25}>
        <Box
          sx={theme => ({
            alignItems: 'center',
            bgcolor: presentation.color,
            borderRadius: '50%',
            color: presentation.textColor || theme.palette.getContrastText(presentation.color),
            display: 'flex',
            flex: '0 0 26px',
            height: 26,
            justifyContent: 'center',
            mt: 0.1,
            width: 26,
          })}
        >
          <Icon icon={presentation.icon} height={17} width={17} />
        </Box>
        <Box minWidth={0} flex={1}>
          <Stack alignItems="center" direction="row" flexWrap="wrap" gap={0.75}>
            <Chip
              label={transition.type}
              size="small"
              sx={theme => ({
                bgcolor: presentation.color,
                color: presentation.textColor || theme.palette.getContrastText(presentation.color),
                fontWeight: 700,
              })}
            />
            <Typography color="text.secondary" variant="caption">
              {transition.reason}
            </Typography>
          </Stack>
          <Typography sx={{ mt: 0.65, overflowWrap: 'anywhere' }} variant="body2">
            {transition.message || transition.reason}
          </Typography>
          <Stack alignItems="center" direction="row" flexWrap="wrap" gap={0.75} mt={0.75}>
            <ResourcePermitLink onNavigate={onClose} request={request} />
            {reviewable && (
              <Button
                onClick={() => {
                  onClose();
                  openResourcePermitReviewActivity(request);
                }}
                size="small"
                startIcon={<Icon icon="mdi:clipboard-check-outline" />}
                variant="outlined"
              >
                Review
              </Button>
            )}
            <Typography
              color="text.secondary"
              component="time"
              dateTime={timestamp || undefined}
              variant="caption"
            >
              {displayTimestamp(timestamp)}
            </Typography>
          </Stack>
          <Typography
            color="text.secondary"
            component="div"
            display="block"
            mt={0.4}
            variant="caption"
          >
            Actor:{' '}
            {actorSubject ? (
              <Box component="span" onClick={onClose}>
                <CapsuleSubjectLink
                  subject={actorSubject}
                  namespaces={requestNamespace ? [requestNamespace] : undefined}
                />
              </Box>
            ) : (
              formatAccessEntity(transition.actor)
            )}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export function CapsuleEventHub() {
  const cluster = K8s.useCluster();
  const location = useLocation();
  const selectedNamespaceSet = useSelector((state: any) => state.filter.namespaces) as Set<string>;
  const namespaceKey = [...(selectedNamespaceSet || new Set<string>())].sort().join('\u0000');
  const namespaces = useMemo(() => {
    const selected = namespaceKey ? namespaceKey.split('\u0000') : [];
    return selected.length > 0 ? selected : resourcePermitNamespacesFromSearch(location.search);
  }, [location.search, namespaceKey]);
  const [allNamespaceRequests, allNamespaceRequestError] = ResourcePermit.useList({
    cluster: cluster || undefined,
    limit: 200,
  });
  const [selectedNamespaceRequests, selectedNamespaceRequestError] = ResourcePermit.useList({
    cluster: cluster || undefined,
    namespace: namespaces.length > 0 ? namespaces : undefined,
    limit: 200,
  });
  const [user, setUser] = useState<EventHubUserInfo | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [timeframe, setTimeframe] = useState<EventHubTimeframe>('24h');
  const [eventType, setEventType] = useState<EventHubEventType>('all');
  const [referenceTime, setReferenceTime] = useState(() => Date.now());

  const hasSelectedNamespaceFallback = namespaces.length > 0;
  const allNamespaceRequestSucceeded = allNamespaceRequests !== null && !allNamespaceRequestError;
  const requests = allNamespaceRequestSucceeded
    ? allNamespaceRequests
    : hasSelectedNamespaceFallback
    ? selectedNamespaceRequests
    : allNamespaceRequests;
  const requestError =
    allNamespaceRequestError && (!hasSelectedNamespaceFallback || selectedNamespaceRequestError)
      ? selectedNamespaceRequestError || allNamespaceRequestError
      : null;

  useEffect(() => {
    let active = true;
    setUser(null);
    ApiProxy.getClusterUserInfo(cluster || '')
      .then(info => {
        if (active) setUser(info);
      })
      .catch(() => {
        if (active) setUser({ username: 'unknown' });
      });
    return () => {
      active = false;
    };
  }, [cluster]);

  const notifications = useMemo(() => {
    const timeScopedNotifications = filterEventHubNotificationsByTimeframe(
      eventHubTransitionNotifications(requests, user),
      timeframe,
      referenceTime
    );
    return filterEventHubNotificationsByType(timeScopedNotifications, eventType);
  }, [eventType, referenceTime, requests, timeframe, user]);
  const requestorNotifications = notifications
    .filter(notification => notification.audience === 'requestor')
    .slice(0, MAX_VISIBLE_PER_AUDIENCE);
  const reviewerNotifications = notifications
    .filter(notification => notification.audience === 'reviewer')
    .slice(0, MAX_VISIBLE_PER_AUDIENCE);
  const notificationCount = requestorNotifications.length + reviewerNotifications.length;
  const hasActionableReview = reviewerNotifications.some(notification =>
    resourcePermitIsReviewable(notification.request)
  );
  const loading = !user || (!requestError && requests === null);
  const open = Boolean(anchorEl);
  const close = () => setAnchorEl(null);

  const openHub = (event: MouseEvent<HTMLElement>) => {
    setReferenceTime(Date.now());
    setAnchorEl(event.currentTarget);
  };

  return (
    <>
      <Tooltip title="EventHub">
        <IconButton
          aria-label={`EventHub, ${notificationCount} event${notificationCount === 1 ? '' : 's'}`}
          color="inherit"
          onClick={openHub}
          size="large"
        >
          <Badge
            badgeContent={notificationCount}
            color={hasActionableReview ? 'warning' : 'primary'}
            max={99}
          >
            <Icon icon="mdi:bell-badge-outline" height={24} width={24} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        onClose={close}
        open={open}
        PaperProps={{
          sx: {
            maxHeight: 'min(720px, 82vh)',
            maxWidth: 440,
            width: { xs: 'calc(100vw - 16px)', sm: 440 },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      >
        <Box aria-label="EventHub feed">
          <Box px={2} py={1.5}>
            <Stack alignItems="center" direction="row" gap={1}>
              <Box minWidth={0}>
                <Typography fontWeight={800} variant="h6">
                  EventHub
                </Typography>
                <Typography color="text.secondary" noWrap variant="caption">
                  {user?.username ? `For ${user.username}` : 'Resolving your Kubernetes identity…'}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" gap={1} mt={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel id="eventhub-timeframe-label">Relative timeframe</InputLabel>
                <Select
                  label="Relative timeframe"
                  labelId="eventhub-timeframe-label"
                  onChange={event => {
                    setReferenceTime(Date.now());
                    setTimeframe(event.target.value as EventHubTimeframe);
                  }}
                  value={timeframe}
                >
                  {TIMEFRAME_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="eventhub-type-label">Event type</InputLabel>
                <Select
                  label="Event type"
                  labelId="eventhub-type-label"
                  onChange={event => setEventType(event.target.value as EventHubEventType)}
                  value={eventType}
                >
                  {EVENT_TYPE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ maxHeight: 'calc(min(720px, 82vh) - 145px)', overflowY: 'auto' }}>
            {loading && (
              <Stack alignItems="center" direction="row" gap={1} justifyContent="center" py={3}>
                <CircularProgress size={20} />
                <Typography color="text.secondary" variant="body2">
                  Loading your ResourcePermits…
                </Typography>
              </Stack>
            )}
            {requestError && (
              <Alert severity="warning" sx={{ borderRadius: 0 }}>
                ResourcePermits could not be loaded in this Namespace scope:{' '}
                {requestError.message || String(requestError)}
              </Alert>
            )}
            {!loading && notificationCount === 0 && !requestError && (
              <Stack alignItems="center" gap={1} px={3} py={5} textAlign="center">
                <Icon icon="mdi:bell-check-outline" height={38} width={38} />
                <Typography fontWeight={700}>You’re all caught up</Typography>
                <Typography color="text.secondary" variant="body2">
                  No matching ResourcePermit transitions are visible in this timeframe and scope.
                </Typography>
              </Stack>
            )}
            <FeedSection count={requestorNotifications.length} title="For requestors">
              {requestorNotifications.map(notification => (
                <TransitionItem key={notification.id} notification={notification} onClose={close} />
              ))}
            </FeedSection>
            <FeedSection count={reviewerNotifications.length} title="For reviewers">
              {reviewerNotifications.map(notification => (
                <TransitionItem key={notification.id} notification={notification} onClose={close} />
              ))}
            </FeedSection>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

export default CapsuleEventHub;
