import { Icon } from '@iconify/react';
import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { ActionButton } from '@kinvolk/headlamp-plugin/lib/components/common';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { type MouseEvent, useState } from 'react';
import { ResourcePermitCLICommand } from './ResourcePermitCLICommand';
import { replaceResourcePermitData } from './resourcePermitExpire';
import { resourcePermitPhase } from './resourcePermitHelpers';
import { buildResourcePermitRetryRequest, canRetryResourcePermit } from './resourcePermitRetry';

function actionResource(props: any) {
  let resource = props.item || props.resource;
  if (resource?.item && !resource.jsonData && !resource.kind) resource = resource.item;
  return resource;
}

function resourceCluster(item: any): string | undefined {
  if (item?.cluster) return item.cluster;
  if (typeof window === 'undefined') return undefined;
  return window.location.pathname.match(/^\/c\/([^/]+)/)?.[1];
}

function useRetryResourcePermit(item: any) {
  const [updating, setUpdating] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const retry = async () => {
    const request = buildResourcePermitRetryRequest(item);
    if (!request || updating) return false;

    const cluster = resourceCluster(item);
    setUpdating(true);
    try {
      await ApiProxy.patch(request.url, request.body, undefined, { cluster });
      try {
        const refreshed = await ApiProxy.request(request.resourceUrl, { cluster });
        replaceResourcePermitData(item, refreshed);
      } catch {
        // The resource watch will still reconcile after the accepted transition.
      }
      enqueueSnackbar(`Retrying ResourcePermit ${request.namespace}/${request.name}`, {
        variant: 'success',
      });
      return true;
    } catch (error: any) {
      enqueueSnackbar(`Failed to retry ResourcePermit: ${error?.message || String(error)}`, {
        variant: 'error',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return { retry, updating };
}

function ResourcePermitRetryDialog({
  item,
  onCancel,
  onConfirm,
  open,
  updating,
}: {
  item: any;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  updating: boolean;
}) {
  const request = buildResourcePermitRetryRequest(item);
  const data = item?.jsonData || item || {};
  if (!request) return null;

  return (
    <Dialog
      aria-describedby="resource-permit-retry-description"
      aria-labelledby="resource-permit-retry-title"
      fullWidth
      maxWidth="sm"
      onClose={updating ? undefined : onCancel}
      open={open}
    >
      <DialogTitle id="resource-permit-retry-title">Retry ResourcePermit?</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={600}>
              {request.namespace}/{request.name}
            </Typography>
            <Chip label={resourcePermitPhase(item)} color="error" size="small" />
          </Stack>
          <Alert severity="info">
            Capsule will retry the controller-owned {data.status?.failure?.stage || 'failed'} stage
            and resume from {data.status?.failure?.retryPhase || 'the recorded phase'}.
          </Alert>
          <Typography id="resource-permit-retry-description" color="text.secondary">
            The rendered request snapshot and review remain unchanged. Fix the reported permissions,
            identity, or target problem before retrying.
          </Typography>
          <ResourcePermitCLICommand
            action="retry"
            name={request.name}
            namespace={request.namespace}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={updating} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={updating}
          onClick={onConfirm}
          startIcon={
            updating ? <CircularProgress color="inherit" size={16} /> : <Icon icon="mdi:refresh" />
          }
          variant="contained"
        >
          Retry request
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ResourcePermitRetryButton({ item }: { item: any }) {
  const [confirming, setConfirming] = useState(false);
  const { retry, updating } = useRetryResourcePermit(item);
  if (!canRetryResourcePermit(item)) return null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setConfirming(true);
  };
  const confirm = async () => {
    if (await retry()) setConfirming(false);
  };

  return (
    <>
      <Button
        disabled={updating}
        onClick={handleClick}
        size="small"
        startIcon={<Icon icon="mdi:refresh" />}
        variant="outlined"
      >
        Retry
      </Button>
      <ResourcePermitRetryDialog
        item={item}
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
        open={confirming}
        updating={updating}
      />
    </>
  );
}

export function ResourcePermitRetryAction(props: any) {
  const resource = actionResource(props);
  const [confirming, setConfirming] = useState(false);
  const { retry, updating } = useRetryResourcePermit(resource);
  if (!canRetryResourcePermit(resource)) return null;

  const confirm = async () => {
    if (await retry()) {
      setConfirming(false);
      props.closeMenu?.();
    }
  };

  return (
    <>
      <ActionButton
        buttonStyle={props.buttonStyle}
        color="primary"
        description="Retry ResourcePermit"
        longDescription="Retry the failed controller stage without rebuilding the request snapshot"
        icon="mdi:refresh"
        iconButtonProps={{ disabled: updating, 'aria-busy': updating }}
        onClick={() => setConfirming(true)}
      />
      <ResourcePermitRetryDialog
        item={resource}
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
        open={confirming}
        updating={updating}
      />
    </>
  );
}

export default ResourcePermitRetryAction;
