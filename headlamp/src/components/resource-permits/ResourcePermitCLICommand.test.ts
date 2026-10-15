import { describe, expect, it } from 'vitest';
import { buildResourcePermitCLICommand } from './ResourcePermitCLICommand';

describe('ResourcePermit CLI commands', () => {
  it('builds the interactive review command', () => {
    expect(buildResourcePermitCLICommand('review', 'customquotas-editor-alice', 'solar-test')).toBe(
      'kubectl resource-permits review customquotas-editor-alice -n solar-test'
    );
  });

  it('builds the expire command', () => {
    expect(buildResourcePermitCLICommand('expire', 'temporary-admin', 'solar-prod')).toBe(
      'kubectl resource-permits expire temporary-admin -n solar-prod'
    );
  });

  it('builds the retry command', () => {
    expect(buildResourcePermitCLICommand('retry', 'incident-access', 'solar-test')).toBe(
      'kubectl resource-permits retry incident-access -n solar-test'
    );
  });
});
