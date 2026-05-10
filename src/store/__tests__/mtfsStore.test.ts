import { describe, it, expect } from 'vitest';
import { useMTFSStore } from '../mtfsStore';

describe('mtfs store manual override audit trail', () => {
  it('writes override reason into audit trail entries', () => {
    const store = useMTFSStore.getState();
    store.resetToDefaults();

    useMTFSStore.getState().addManualAdjustment({
      id: 'adj-test',
      service: 'ASC',
      year: 2,
      amount: 250,
      reason: 'Known contractual timing shift',
    });

    const latest = useMTFSStore.getState().auditTrail.at(-1);
    expect(latest?.description).toContain('Known contractual timing shift');
    expect(latest?.description).toContain('ASC');
    expect(latest?.description).toContain('Y2');
  });
});

describe('mtfs overlay reconciliation', () => {
  it('captures mapped and unmapped overlay fields in reconciliation output', () => {
    const store = useMTFSStore.getState();
    store.resetToDefaults();

    useMTFSStore.getState().applyOverlayImport(
      'Test Overlay',
      { councilTax: 123456, businessRates: 65432 },
      ['unknown_source_column']
    );

    const state = useMTFSStore.getState();
    expect(state.baseline.overlayImports.length).toBeGreaterThan(0);
    expect(state.result.reconciliationRows.some((r) => r.field === 'councilTax')).toBe(true);
    expect(state.result.reconciliationRows.some((r) => r.status === 'unmapped')).toBe(true);
  });
});

describe('mtfs scenario workflow', () => {
  it('creates templates, clones scenarios, updates metadata and exports audit evidence', () => {
    const store = useMTFSStore.getState();
    store.resetToDefaults();

    useMTFSStore.getState().createDefaultScenarioPack();
    expect(useMTFSStore.getState().scenarios.map((scenario) => scenario.name)).toEqual([
      'Balanced Plan',
      'Do Nothing',
      'Recommended Plan',
      'Funding Shock',
      'Demand Shock',
      'Savings Slippage',
      'Inflation Shock',
    ]);

    const firstId = useMTFSStore.getState().scenarios[0].id;
    useMTFSStore.getState().cloneScenario(firstId);
    expect(useMTFSStore.getState().scenarios.some((scenario) => scenario.name.includes('Copy'))).toBe(true);

    useMTFSStore.getState().updateScenario(firstId, { label: 'Recommended', owner: 'CFO' }, 'Marked recommended');
    const updated = useMTFSStore.getState().scenarios.find((scenario) => scenario.id === firstId);
    expect(updated?.label).toBe('Recommended');
    expect(updated?.owner).toBe('CFO');
    expect(updated?.versionHistory?.at(-1)?.description).toBe('Marked recommended');

    const csv = useMTFSStore.getState().exportScenarioAuditCsv();
    expect(csv).toContain('Balanced Plan');
    expect(csv).toContain('Recommended');
  });

  it('creates scenario wizard options from goals', () => {
    useMTFSStore.getState().resetToDefaults();
    useMTFSStore.getState().createScenarioFromGoal('stress_funding');
    const scenario = useMTFSStore.getState().scenarios.at(-1);
    expect(scenario?.name).toContain('Funding Shock');
    expect(scenario?.result.years).toHaveLength(5);
  });
});
