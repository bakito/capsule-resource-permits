import { ConfigStore } from '@kinvolk/headlamp-plugin/lib';

export interface CapsulePluginConfig {
  documentationBaseUrl?: string;
  sectionAnchorsEnabled?: boolean;
}

export const capsulePluginConfig = new ConfigStore<CapsulePluginConfig>('resource-permits');
export const useCapsulePluginConfig = capsulePluginConfig.useConfig();

/** Desktop uses the URL hash for routing, so fragment links must default off there. */
export function isHeadlampDesktop(): boolean {
  if (typeof window !== 'undefined' && Boolean((window as any).desktopApi)) return true;
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.includes('Electron')
  );
}

export function sectionAnchorsEnabled(
  config?: CapsulePluginConfig,
  desktop = isHeadlampDesktop()
): boolean {
  return config?.sectionAnchorsEnabled ?? !desktop;
}
