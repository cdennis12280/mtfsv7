import { DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, runCalculations } from '../../engine/calculations';
import {
  buildScenarioFromGoal,
  buildScenarioTemplates,
  exportScenarioAuditCsv,
  rankScenarios,
  scenarioConfidence,
} from '../scenarioUtils';

describe('scenario utilities', () => {
  it('builds the full finance leadership template set with calculated outputs', () => {
    const result = runCalculations(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []);
    const templates = buildScenarioTemplates(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, [], result);

    expect(templates.map((scenario) => scenario.name)).toEqual([
      'Balanced Plan',
      'Do Nothing',
      'Recommended Plan',
      'Funding Shock',
      'Demand Shock',
      'Savings Slippage',
      'Inflation Shock',
    ]);
    expect(templates.every((scenario) => scenario.result.years.length === 5)).toBe(true);
    expect(templates.every((scenario) => scenario.notes?.decisionRequired)).toBe(true);
  });

  it('ranks scenarios and produces confidence and audit evidence', () => {
    const result = runCalculations(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []);
    const templates = buildScenarioTemplates(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, [], result);
    const ranked = rankScenarios(templates, { affordability: 40, risk: 30, reserves: 20, deliverability: 10 });
    const confidence = scenarioConfidence(templates[0], DEFAULT_BASELINE, []);
    const csv = exportScenarioAuditCsv(templates, result);

    expect(ranked).toHaveLength(7);
    expect(ranked[0].weightedScore).toBeGreaterThanOrEqual(ranked.at(-1)?.weightedScore ?? 0);
    expect(confidence.score).toBeGreaterThan(0);
    expect(csv).toContain('Scenario');
    expect(csv).toContain('Balanced Plan');
  });

  it('creates scenario wizard outputs for each supported goal', () => {
    const result = runCalculations(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []);
    const goals = ['balance_gap', 'protect_reserves', 'minimise_savings', 'stress_funding'] as const;

    for (const goal of goals) {
      const scenario = buildScenarioFromGoal(goal, DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, [], result);
      expect(scenario.name).toContain('(');
      expect(scenario.versionHistory?.[0].description).toContain(goal);
      expect(scenario.result.years).toHaveLength(5);
    }
  });
});
