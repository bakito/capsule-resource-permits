import { describe, expect, it } from 'vitest';
import { sectionAnchorsEnabled } from './capsulePluginConfig';

describe('Capsule plugin configuration', () => {
  it('enables section anchors by default in the web app', () => {
    expect(sectionAnchorsEnabled(undefined, false)).toBe(true);
  });

  it('disables section anchors by default in Headlamp Desktop', () => {
    expect(sectionAnchorsEnabled(undefined, true)).toBe(false);
  });

  it('honors an explicit setting in either runtime', () => {
    expect(sectionAnchorsEnabled({ sectionAnchorsEnabled: false }, false)).toBe(false);
    expect(sectionAnchorsEnabled({ sectionAnchorsEnabled: true }, true)).toBe(true);
  });
});
