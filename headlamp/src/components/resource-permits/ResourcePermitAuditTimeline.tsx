import { Icon } from '@iconify/react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CapsuleSubjectLink } from '../subjects/CapsuleSubjectLink';
import { capsuleSubjectFromAccessEntity } from '../subjects/subjectReferences';
import {
  type ResourcePermitAuditEntry,
  resourcePermitPhasePresentation,
  type ResourcePermitScheduledLifecycle,
} from './resourcePermitHelpers';

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : 'Time not reported';
}

export function ResourcePermitAuditTimeline({
  entries,
  namespace,
  scheduledLifecycle,
}: {
  entries: ResourcePermitAuditEntry[];
  namespace?: string;
  scheduledLifecycle?: ResourcePermitScheduledLifecycle;
}) {
  if (entries.length === 0 && !scheduledLifecycle) {
    return <Typography color="text.secondary">No audit entries reported.</Typography>;
  }

  const scheduledStage = scheduledLifecycle?.stage;
  const scheduledAt = scheduledLifecycle?.timestamp;
  const scheduledStyle = resourcePermitPhasePresentation(scheduledStage || 'Archiving');
  const scheduledTextColor = scheduledStyle.textColor || 'common.white';
  const scheduledIsFuture = scheduledAt ? Date.parse(scheduledAt) > Date.now() : true;
  const isActivation = scheduledStage === 'Active';

  return (
    <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {entries.map((entry, index) => {
        const style = resourcePermitPhasePresentation(entry.stage);
        const subject = capsuleSubjectFromAccessEntity(entry.actorEntity);
        const subjectNamespaces = [namespace, subject?.namespace].filter(Boolean) as string[];
        const connectsToScheduledLifecycle = Boolean(
          scheduledLifecycle && index === entries.length - 1
        );
        return (
          <Box
            component="li"
            key={`${entry.stage}-${entry.timestamp || index}-${index}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: '42px minmax(0, 1fr)',
              pb: 2,
              position: 'relative',
            }}
          >
            {(index < entries.length - 1 || connectsToScheduledLifecycle) && (
              <Box
                aria-hidden
                sx={{
                  bgcolor: connectsToScheduledLifecycle ? 'transparent' : alpha(style.color, 0.45),
                  borderLeft: connectsToScheduledLifecycle
                    ? `2px dashed ${scheduledStyle.color}`
                    : undefined,
                  bottom: connectsToScheduledLifecycle ? -28 : -8,
                  left: 20,
                  position: 'absolute',
                  top: 38,
                  width: connectsToScheduledLifecycle ? 0 : 2,
                }}
              />
            )}
            <Box
              aria-hidden
              sx={{
                alignItems: 'center',
                bgcolor: style.color,
                border: '3px solid',
                borderColor: 'background.paper',
                borderRadius: '50%',
                boxShadow: 1,
                color: style.textColor || 'common.white',
                display: 'flex',
                height: 34,
                justifyContent: 'center',
                justifySelf: 'center',
                mt: 0.75,
                width: 34,
                zIndex: 1,
              }}
            >
              <Icon icon={style.icon} width={19} height={19} />
            </Box>
            <Paper
              variant="outlined"
              sx={{
                bgcolor: alpha(style.color, 0.09),
                borderColor: alpha(style.color, 0.55),
                borderLeft: `5px solid ${style.color}`,
                minWidth: 0,
                p: 1.75,
              }}
            >
              <Stack gap={1}>
                <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center">
                  <Chip
                    size="small"
                    label={entry.stage}
                    sx={{
                      bgcolor: style.color,
                      color: style.textColor || 'common.white',
                      fontWeight: 700,
                    }}
                  />
                  {entry.verdict && entry.verdict !== 'Pending' && (
                    <Chip
                      color={entry.verdict === 'Approved' ? 'success' : 'error'}
                      icon={
                        <Icon
                          icon={entry.verdict === 'Approved' ? 'mdi:check-bold' : 'mdi:close-thick'}
                        />
                      }
                      label={`Verdict: ${entry.verdict}`}
                      size="small"
                    />
                  )}
                  <Chip
                    icon={<Icon icon="mdi:identifier" />}
                    label={`Reason: ${entry.reason}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Box
                  sx={theme => ({
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    bgcolor: alpha(style.color, 0.12),
                    border: 1,
                    borderColor: alpha(style.color, 0.5),
                    borderRadius: 1,
                    color: theme.palette.text.primary,
                    display: 'flex',
                    gap: 0.75,
                    px: 1.1,
                    py: 0.65,
                  })}
                >
                  <Icon icon="mdi:calendar-clock" width={18} height={18} />
                  <Typography variant="body2" fontWeight={700}>
                    Timestamp: {dateTime(entry.timestamp)}
                  </Typography>
                </Box>
              </Stack>
              <Typography sx={{ mt: 1 }}>{entry.message}</Typography>
              <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Actor:{' '}
                {subject ? (
                  <CapsuleSubjectLink
                    subject={subject}
                    namespaces={
                      subjectNamespaces.length ? [...new Set(subjectNamespaces)] : undefined
                    }
                  />
                ) : (
                  entry.actor
                )}
              </Typography>
              {entry.eventTime && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Kubernetes event recorded: {dateTime(entry.eventTime)}
                </Typography>
              )}
            </Paper>
          </Box>
        );
      })}
      {scheduledLifecycle && scheduledStage && (
        <Box
          aria-label={`Scheduled ${scheduledStage}`}
          component="li"
          sx={{
            display: 'grid',
            gridTemplateColumns: '42px minmax(0, 1fr)',
            mt: 3.5,
            position: 'relative',
            rowGap: 2,
          }}
        >
          <Box
            aria-hidden
            data-testid="scheduled-lifecycle-connector"
            sx={{
              borderLeft: `2px dashed ${scheduledStyle.color}`,
              height: 50,
              left: 20,
              position: 'absolute',
              top: 0,
            }}
          />
          <Box
            alignItems="center"
            data-testid="future-lifecycle-marker"
            sx={{
              display: 'grid',
              gridColumn: '1 / -1',
              gridTemplateColumns: '42px minmax(0, 1fr)',
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: scheduledStyle.color,
                border: '3px solid',
                borderColor: 'background.paper',
                borderRadius: '50%',
                color: scheduledTextColor,
                display: 'flex',
                height: 28,
                justifyContent: 'center',
                justifySelf: 'center',
                width: 28,
                zIndex: 1,
              }}
            >
              <Icon icon="mdi:calendar-arrow-right" width={17} height={17} />
            </Box>
            <Chip
              label={
                scheduledIsFuture
                  ? 'Future lifecycle'
                  : isActivation
                  ? 'Activation time reached'
                  : 'Retention deadline reached'
              }
              size="small"
              sx={{
                alignSelf: 'center',
                bgcolor: scheduledStyle.color,
                borderColor: scheduledStyle.color,
                color: scheduledTextColor,
                fontWeight: 700,
                justifySelf: 'start',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          </Box>
          <Box
            aria-hidden
            sx={{
              alignItems: 'center',
              bgcolor: scheduledStyle.color,
              border: '3px solid',
              borderColor: 'background.paper',
              borderRadius: '50%',
              boxShadow: `0 0 0 2px ${scheduledStyle.color}`,
              color: scheduledTextColor,
              display: 'flex',
              height: 34,
              justifyContent: 'center',
              justifySelf: 'center',
              mt: 0.75,
              width: 34,
            }}
          >
            <Icon icon={scheduledStyle.icon} width={19} height={19} />
          </Box>
          <Paper
            variant="outlined"
            sx={{
              bgcolor: alpha(scheduledStyle.color, 0.045),
              borderColor: alpha(scheduledStyle.color, 0.55),
              borderLeft: `5px dashed ${scheduledStyle.color}`,
              borderStyle: 'dashed',
              minWidth: 0,
              p: 1.75,
            }}
          >
            <Stack gap={1}>
              <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center">
                <Chip
                  label={scheduledStage}
                  size="small"
                  sx={{
                    bgcolor: scheduledStyle.color,
                    color: scheduledTextColor,
                    fontWeight: 700,
                  }}
                />
                <Chip
                  label={
                    isActivation
                      ? 'Scheduled activation'
                      : scheduledAt
                      ? 'Scheduled retention action'
                      : 'Retention policy'
                  }
                  size="small"
                  variant="outlined"
                />
              </Stack>
              <Box
                sx={theme => ({
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  bgcolor: alpha(scheduledStyle.color, 0.1),
                  border: 1,
                  borderColor: alpha(scheduledStyle.color, 0.45),
                  borderRadius: 1,
                  color: theme.palette.text.primary,
                  display: 'flex',
                  gap: 0.75,
                  px: 1.1,
                  py: 0.65,
                })}
              >
                <Icon icon="mdi:calendar-clock" width={18} height={18} />
                <Typography variant="body2" fontWeight={700}>
                  {scheduledAt
                    ? `${isActivation ? 'Activates at' : 'Scheduled for'}: ${dateTime(scheduledAt)}`
                    : 'Archive date not yet reported'}
                </Typography>
              </Box>
            </Stack>
            <Typography sx={{ mt: 1 }}>
              {scheduledLifecycle.description ||
                (isActivation
                  ? 'Capsule will activate this ResourcePermit at the approved future start time.'
                  : 'Capsule will archive and delete this ResourcePermit after its audit-retention window.')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }} variant="caption">
              This is a planned lifecycle marker, not a completed audit transition.
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

export default ResourcePermitAuditTimeline;
