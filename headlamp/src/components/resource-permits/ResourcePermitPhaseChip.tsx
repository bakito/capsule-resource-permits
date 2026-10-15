import { Icon } from '@iconify/react';
import { Chip } from '@mui/material';
import { resourcePermitPhase, resourcePermitPhasePresentation } from './resourcePermitHelpers';

export function ResourcePermitPhaseChip({ item }: { item: any }) {
  const phase = resourcePermitPhase(item);
  const presentation = resourcePermitPhasePresentation(phase);
  return (
    <Chip
      icon={<Icon icon={presentation.icon} />}
      label={phase}
      size="small"
      sx={{
        bgcolor: presentation.color,
        color: presentation.textColor || 'common.white',
        fontWeight: 700,
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  );
}

export default ResourcePermitPhaseChip;
