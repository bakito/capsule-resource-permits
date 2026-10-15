import { Box, Paper, Stack, SvgIcon, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  resourcePermitPhasePresentation,
  resourcePermitRetentionMessage,
  resourcePermitScheduledArchivingAt,
} from './resourcePermitHelpers';

export function ResourcePermitRetention({ request }: { request: any }) {
  const style = resourcePermitPhasePresentation('Archiving');
  const deadline = resourcePermitScheduledArchivingAt(request);
  return (
    <Paper
      aria-label="Archive retention"
      variant="outlined"
      sx={{ bgcolor: alpha(style.color, 0.1), borderColor: style.color, borderRadius: 3, p: 2 }}
    >
      <Stack direction="row" gap={1.5} alignItems="center">
        <Box
          sx={{
            alignItems: 'center',
            bgcolor: style.color,
            borderRadius: '50%',
            color: style.textColor,
            display: 'flex',
            flexShrink: 0,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <SvgIcon sx={{ fontSize: 26 }}>
            <path
              d="M3 3h18v4H3zM5 7v13h7M19 7v4M9 11h6M17 14v3l2 1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="17" cy="17" r="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
          </SvgIcon>
        </Box>
        <Box>
          <Typography variant="subtitle2">Archive retention</Typography>
          <Typography fontWeight={700}>{resourcePermitRetentionMessage(request)}</Typography>
          {deadline && (
            <Typography variant="body2" color="text.secondary">
              Archive date: {new Date(deadline).toLocaleString()}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
