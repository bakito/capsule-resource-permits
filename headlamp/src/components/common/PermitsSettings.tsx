import type { PluginSettingsDetailsProps } from '@kinvolk/headlamp-plugin/lib';
import { Box, FormControlLabel, Switch, Typography } from '@mui/material';
import { type CapsulePluginConfig, sectionAnchorsEnabled } from './capsulePluginConfig';

export function PermitsSettings({ data, onDataChange }: PluginSettingsDetailsProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        label="Shareable section links"
        control={
          <Switch
            checked={sectionAnchorsEnabled(data as CapsulePluginConfig)}
            onChange={event =>
              onDataChange?.({ ...data, sectionAnchorsEnabled: event.target.checked })
            }
          />
        }
      />
      <Typography color="text.secondary" variant="body2">
        Adds links beside section headings. Disabled by default in Headlamp Desktop because Desktop
        uses URL hashes for routing.
      </Typography>
    </Box>
  );
}
