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
import {
  buildResourcePermitExpireRequest,
  canExpireResourcePermit,
  replaceResourcePermitData,
} from './resourcePermitExpire';
import { resourcePermitPhase } from './resourcePermitHelpers';

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

function useExpireResourcePermit(item: any) {
  const [updating, setUpdating] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const expire = async () => {
    const request = buildResourcePermitExpireRequest(item);
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
      enqueueSnackbar(`Expired ResourcePermit ${request.namespace}/${request.name}`, {
        variant: 'success',
      });
      return true;
    } catch (error: any) {
      enqueueSnackbar(`Failed to expire ResourcePermit: ${error?.message || String(error)}`, {
        variant: 'error',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return { expire, updating };
}

function ResourcePermitExpireDialog({
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
  const request = buildResourcePermitExpireRequest(item);
  if (!request) return null;

  return (
    <Dialog
      aria-describedby="resource-permit-expire-description"
      aria-labelledby="resource-permit-expire-title"
      fullWidth
      maxWidth="sm"
      onClose={updating ? undefined : onCancel}
      open={open}
    >
      <DialogTitle id="resource-permit-expire-title">Expire ResourcePermit?</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={600}>
              {request.namespace}/{request.name}
            </Typography>
            <Chip label={resourcePermitPhase(item)} size="small" variant="outlined" />
          </Stack>
          <Alert severity="warning">
            Expiring this request immediately revokes active access and moves it to a terminal
            lifecycle phase. This action cannot be undone.
          </Alert>
          <Typography id="resource-permit-expire-description" color="text.secondary">
            The request may remain visible until its configured audit-retention period ends.
          </Typography>
          <ResourcePermitCLICommand
            action="expire"
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
          color="error"
          disabled={updating}
          onClick={onConfirm}
          startIcon={
            updating ? (
              <CircularProgress color="inherit" size={16} />
            ) : (
              <Icon icon="mdi:timer-remove-outline" />
            )
          }
          variant="contained"
        >
          Expire request
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ResourcePermitExpireButton({ item }: { item: any }) {
  const [confirming, setConfirming] = useState(false);
  const { expire, updating } = useExpireResourcePermit(item);
  if (!canExpireResourcePermit(item)) return null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setConfirming(true);
  };

  const confirm = async () => {
    if (await expire()) setConfirming(false);
  };

  return (
    <>
      <Button
        color="error"
        disabled={updating}
        onClick={handleClick}
        size="small"
        startIcon={<Icon icon="mdi:timer-remove-outline" />}
        variant="outlined"
      >
        Expire
      </Button>
      <ResourcePermitExpireDialog
        item={item}
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
        open={confirming}
        updating={updating}
      />
    </>
  );
}

export function ResourcePermitExpireAction(props: any) {
  const resource = actionResource(props);
  const [confirming, setConfirming] = useState(false);
  const { expire, updating } = useExpireResourcePermit(resource);
  if (!canExpireResourcePermit(resource)) return null;

  const confirm = async () => {
    if (await expire()) {
      setConfirming(false);
      props.closeMenu?.();
    }
  };

  return (
    <>
      <ActionButton
        buttonStyle={props.buttonStyle}
        color="secondary"
        description="Expire ResourcePermit"
        longDescription="Expire this request immediately and revoke any active access"
        icon="mdi:timer-remove-outline"
        iconButtonProps={{ disabled: updating, 'aria-busy': updating }}
        onClick={() => setConfirming(true)}
      />
      <ResourcePermitExpireDialog
        item={resource}
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
        open={confirming}
        updating={updating}
      />
    </>
  );
}

export default ResourcePermitExpireAction;
