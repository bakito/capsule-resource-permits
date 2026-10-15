import { Icon } from '@iconify/react';
import { Box, Stack, Typography } from '@mui/material';
import { TenantVisualIcon } from '../common/TenantVisualIcon';
import {
  resourcePermitTemplateDescription,
  resourcePermitTemplateIcon,
} from './resourcePermitHelpers';

export function ResourcePermitTemplateIcon({
  size = 28,
  template,
}: {
  size?: number;
  template: any;
}) {
  const icon = resourcePermitTemplateIcon(template);
  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: 'primary.main',
        borderRadius: 1.5,
        color: 'primary.contrastText',
        display: 'inline-flex',
        flex: '0 0 auto',
        height: size + 14,
        justifyContent: 'center',
        width: size + 14,
      }}
    >
      {icon ? (
        <TenantVisualIcon icon={icon} size={size} />
      ) : (
        <Icon aria-hidden icon="mdi:shield-key-outline" width={size} height={size} />
      )}
    </Box>
  );
}

export function ResourcePermitTemplateIdentity({
  compact = false,
  template,
}: {
  compact?: boolean;
  template: any;
}) {
  const description = resourcePermitTemplateDescription(template);
  return (
    <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center', minWidth: 0 }}>
      <ResourcePermitTemplateIcon template={template} size={compact ? 22 : 30} />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap={compact} sx={{ fontWeight: 700 }}>
          {template?.getName?.() || template?.metadata?.name || template?.jsonData?.metadata?.name}
        </Typography>
        <Typography
          variant="body2"
          sx={[
            {
              color: 'text.secondary',
            },
            compact
              ? {
                  maxWidth: 420,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }
              : false,
          ]}
        >
          {description || 'No description provided.'}
        </Typography>
      </Box>
    </Stack>
  );
}

export default ResourcePermitTemplateIdentity;
