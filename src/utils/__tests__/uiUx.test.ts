import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS, DEFAULT_AUTHORITY_CONFIG, DEFAULT_BASELINE, runCalculations } from '../../engine/calculations';
import { validateModel } from '../../engine/validation';
import { buildKpiTraceRows, buildWorkflowSteps, checklistComplete, defaultRehearsalChecklist, ROLE_PRESETS } from '../uiUx';

describe('uiUx helpers', () => {
  it('exposes decision-complete role presets with CFO and S151 combined', () => {
    expect(ROLE_PRESETS.cfo.defaultTab).toBe('summary');
    expect(ROLE_PRESETS.cfo.label).toContain('S151');
    expect(ROLE_PRESETS.head_of_finance.tabs).toContain('baseline');
    expect(ROLE_PRESETS.s151.defaultTab).toBe('governance');
    expect(ROLE_PRESETS.councillor.audience).toBe('members');
  });

  it('derives blocked workflow steps from validation issues', () => {
    const result = runCalculations(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []);
    const validation = validateModel({
      authorityConfig: DEFAULT_AUTHORITY_CONFIG,
      baseline: DEFAULT_BASELINE,
      assumptions: DEFAULT_ASSUMPTIONS,
      result,
      savingsProposals: [],
      scenarios: [],
      snapshots: [],
      workflowState: { baselineLocked: false, assumptionsFrozen: false, governanceExports: { memberBrief: 0, s151Pack: 0, dataCsv: 0 } },
    });
    const steps = buildWorkflowSteps({
      validation,
      authorityName: DEFAULT_AUTHORITY_CONFIG.authorityName,
      baselineLocked: false,
      assumptionsFrozen: false,
      savingsProposals: [],
      scenarios: [],
      snapshots: [],
      result,
      exports: { memberBrief: 0, s151Pack: 0, dataCsv: 0 },
    });
    expect(steps.find((step) => step.id === 'setup')?.status).toBe('blocked');
    expect(steps.find((step) => step.id === 'scenarios')?.status).toBe('blocked');
  });

  it('builds KPI trace rows with source, formula and provenance', () => {
    const result = runCalculations(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []);
    const rows = buildKpiTraceRows(result, 'Manual');
    expect(rows).toHaveLength(4);
    expect(rows[0].formula).toContain('net gap');
    expect(rows.every((row) => row.provenance === 'Manual')).toBe(true);
  });

  it('tracks rehearsal checklist completion', () => {
    const checklist = defaultRehearsalChecklist();
    expect(checklistComplete(checklist)).toBe(false);
    expect(checklistComplete({
      demoDataLoaded: true,
      baselineLocked: true,
      scenariosReady: true,
      validationRun: true,
      packFrozen: true,
      exportTested: true,
      figuresReconciled: true,
    })).toBe(true);
  });
});
