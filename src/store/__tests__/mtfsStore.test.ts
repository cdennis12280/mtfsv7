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
