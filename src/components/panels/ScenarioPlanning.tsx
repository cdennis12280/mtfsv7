import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Plus, Trash2, Download, TrendingUp, TrendingDown, Target, Upload, Save, FileSpreadsheet } from 'lucide-react';
import { RichTooltip } from '../ui/RichTooltip';
import { exportDecisionPackPdf } from '../../utils/decisionPackPdf';
import { downloadSnapshotTemplatePack } from '../../utils/snapshotTemplatePack';
import { DEFAULT_ASSUMPTIONS, runCalculations } from '../../engine/calculations';
import type { Assumptions, Scenario, YearProfile5 } from '../../types/financial';
import { TechnicalDetail } from './TechnicalDetail';
import { addToProfile, coerceYearProfile, y1 } from '../../utils/yearProfile';
import {
  exportScenarioAuditCsv as buildScenarioAuditCsv,
  rankScenarios,
  scenarioConfidence,
  scenarioNarrative,
  SCENARIO_LABELS,
  type ScenarioGoal,
} from '../../utils/scenarioUtils';

function fmtK(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${sign}£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

const typeIcons = {
  base: <Target size={11} />,
  optimistic: <TrendingUp size={11} />,
  pessimistic: <TrendingDown size={11} />,
  custom: <Plus size={11} />,
};

const typeBadge: Record<string, 'blue' | 'green' | 'red' | 'purple'> = {
  base: 'blue',
  optimistic: 'green',
  pessimistic: 'red',
  custom: 'purple',
};

function normalizeAssumptions(input: Partial<Assumptions> | Assumptions): Assumptions {
  const source = (input ?? {}) as Partial<Assumptions>;
  const expenditure = (source.expenditure ?? {}) as Partial<Assumptions['expenditure']>;
  const funding = (source.funding ?? {}) as Partial<Assumptions['funding']>;
  const policy = (source.policy ?? {}) as Partial<Assumptions['policy']>;
  const profile = (value: unknown, fallback: YearProfile5 | number): YearProfile5 => coerceYearProfile(value, fallback);
  return {
    ...DEFAULT_ASSUMPTIONS,
    ...source,
    funding: {
      ...DEFAULT_ASSUMPTIONS.funding,
      ...funding,
      councilTaxIncrease: profile(funding.councilTaxIncrease, DEFAULT_ASSUMPTIONS.funding.councilTaxIncrease),
      businessRatesGrowth: profile(funding.businessRatesGrowth, DEFAULT_ASSUMPTIONS.funding.businessRatesGrowth),
      grantVariation: profile(funding.grantVariation, DEFAULT_ASSUMPTIONS.funding.grantVariation),
      feesChargesElasticity: profile(funding.feesChargesElasticity, DEFAULT_ASSUMPTIONS.funding.feesChargesElasticity),
    },
    expenditure: {
      ...DEFAULT_ASSUMPTIONS.expenditure,
      ...expenditure,
      payAward: profile(expenditure.payAward, DEFAULT_ASSUMPTIONS.expenditure.payAward),
      nonPayInflation: profile(expenditure.nonPayInflation, DEFAULT_ASSUMPTIONS.expenditure.nonPayInflation),
      ascDemandGrowth: profile(expenditure.ascDemandGrowth, DEFAULT_ASSUMPTIONS.expenditure.ascDemandGrowth),
      cscDemandGrowth: profile(expenditure.cscDemandGrowth, DEFAULT_ASSUMPTIONS.expenditure.cscDemandGrowth),
      savingsDeliveryRisk: profile(expenditure.savingsDeliveryRisk, DEFAULT_ASSUMPTIONS.expenditure.savingsDeliveryRisk),
      payAwardByFundingSource: {
        ...DEFAULT_ASSUMPTIONS.expenditure.payAwardByFundingSource,
        ...(expenditure.payAwardByFundingSource ?? {}),
      },
      payGroupSensitivity: {
        ...DEFAULT_ASSUMPTIONS.expenditure.payGroupSensitivity,
        ...(expenditure.payGroupSensitivity ?? {}),
      },
    },
    policy: {
      ...DEFAULT_ASSUMPTIONS.policy,
      ...policy,
      annualSavingsTarget: profile(policy.annualSavingsTarget, DEFAULT_ASSUMPTIONS.policy.annualSavingsTarget),
      reservesUsage: profile(policy.reservesUsage, DEFAULT_ASSUMPTIONS.policy.reservesUsage),
    },
    advanced: { ...DEFAULT_ASSUMPTIONS.advanced, ...(source.advanced ?? {}) },
  };
}

function resolveScenarioType(type: unknown): Scenario['type'] {
  return type === 'base' || type === 'optimistic' || type === 'pessimistic' || type === 'custom'
    ? type
    : 'custom';
}

type DecisionSourceType = 'current' | 'scenario' | 'snapshot';

interface DecisionSourceOption {
  key: string;
  sourceType: DecisionSourceType;
  sourceId?: string;
  name: string;
  description?: string;
  type: 'base' | 'optimistic' | 'pessimistic' | 'custom' | 'current';
  assumptions: Assumptions;
  result: ReturnType<typeof runCalculations>;
}

export function ScenarioPlanning() {
  const {
    scenarios,
    result,
    assumptions,
    baseline,
    savingsProposals,
    saveScenario,
    deleteScenario,
    loadScenario,
    snapshots,
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
    exportSnapshotAsJson,
    importSnapshotFromJson,
    exportSnapshotAsXlsx,
    importSnapshotFromXlsxFile,
    authorityConfig,
    scenariosFocus,
    setScenariosFocus,
    createDefaultScenarioPack,
    createScenarioFromGoal,
    cloneScenario,
    updateScenario,
    exportScenarioAuditCsv,
    setSelectedDecisionOption,
    setActiveRole,
    setCurrentWorkingSet,
    meetingMode,
    setMeetingMode,
  } = useMTFSStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDesc, setScenarioDesc] = useState('');
  const [scenarioType, setScenarioType] = useState<'base' | 'optimistic' | 'pessimistic' | 'custom'>('custom');
  const [compareScenarioId, setCompareScenarioId] = useState<string>('');
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [snapshotMessage, setSnapshotMessage] = useState('');
  const [isSnapshotTemplateLoading, setIsSnapshotTemplateLoading] = useState(false);
  const [decisionA, setDecisionA] = useState('current');
  const [decisionB, setDecisionB] = useState('');
  const [decisionC, setDecisionC] = useState('');
  const [decisionWeights, setDecisionWeights] = useState({
    affordability: 40,
    risk: 30,
    reserves: 20,
    deliverability: 10,
  });
  const [diffModeEnabled, setDiffModeEnabled] = useState(false);
  const [diffTarget, setDiffTarget] = useState<string>('scenario:');
  const [wizardGoal, setWizardGoal] = useState<ScenarioGoal>('balance_gap');
  const [whatIf, setWhatIf] = useState({ pay: 0, grant: 0, savings: 0 });
  const snapshotsSectionRef = React.useRef<HTMLDivElement | null>(null);
  const resolvedScenarios = React.useMemo(() => scenarios.map((s, idx) => {
    const assumptionsNormalized = normalizeAssumptions((s.assumptions ?? {}) as Partial<Assumptions>);
    const safeType = resolveScenarioType(s.type);
    const safeColor = typeof s.color === 'string' && s.color.trim() ? s.color : '#3b82f6';
    const safeName = typeof s.name === 'string' && s.name.trim() ? s.name : `Scenario ${idx + 1}`;
    const safeCreatedAt = typeof s.createdAt === 'string' && s.createdAt.trim() ? s.createdAt : new Date().toISOString();
    return {
      ...s,
      type: safeType,
      color: safeColor,
      name: safeName,
      createdAt: safeCreatedAt,
      assumptions: assumptionsNormalized,
      result: runCalculations(assumptionsNormalized, baseline, savingsProposals),
    };
  }), [baseline, savingsProposals, scenarios]);

  const decisionOptions: DecisionSourceOption[] = React.useMemo(() => [
      {
        key: 'current',
        sourceType: 'current',
        name: 'Current',
        description: 'Current in-session model position.',
        type: 'current' as const,
        assumptions,
        result,
      },
      ...resolvedScenarios.map((s) => ({
        key: `scenario:${s.id}`,
        sourceType: 'scenario' as const,
        sourceId: s.id,
        name: s.name,
        description: s.description,
        type: s.type,
        assumptions: s.assumptions,
        result: s.result,
      })),
      ...snapshots.map((s) => {
        const assumptionsNormalized = normalizeAssumptions((s.assumptions ?? {}) as Partial<Assumptions>);
        return {
          key: `snapshot:${s.id}`,
          sourceType: 'snapshot' as const,
          sourceId: s.id,
          name: s.name,
          description: s.description,
          type: 'custom' as const,
          assumptions: assumptionsNormalized,
          result: runCalculations(assumptionsNormalized, s.baseline, s.savingsProposals),
        };
      }),
    ], [assumptions, resolvedScenarios, result, snapshots]);

  const handleSave = () => {
    if (!scenarioName.trim()) return;
    saveScenario(scenarioName.trim(), scenarioDesc.trim(), scenarioType);
    setScenarioName('');
    setScenarioDesc('');
    setShowSaveDialog(false);
  };

  const handleSaveSnapshot = () => {
    if (!snapshotName.trim()) return;
    saveSnapshot(snapshotName.trim(), snapshotDesc.trim());
    setSnapshotMessage(`Snapshot saved: ${snapshotName.trim()}`);
    setSnapshotName('');
    setSnapshotDesc('');
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSnapshot = (id: string) => {
    const text = exportSnapshotAsJson(id);
    if (!text) return;
    downloadTextFile(text, `mtfs_snapshot_${id}.json`);
  };

  const handleExportSnapshotXlsx = async (id: string) => {
    const blob = await exportSnapshotAsXlsx(id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mtfs_snapshot_${id}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSnapshotFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const imported = ext === 'xlsx' || ext === 'xls'
      ? await importSnapshotFromXlsxFile(file)
      : importSnapshotFromJson(await file.text());
    setSnapshotMessage(imported.message);
    e.target.value = '';
  };

  const handleDownloadSnapshotTemplate = async () => {
    setIsSnapshotTemplateLoading(true);
    try {
      await downloadSnapshotTemplatePack();
      setSnapshotMessage('Template pack downloaded: mtfs_snapshot_template_pack.xlsx');
    } catch {
      setSnapshotMessage('Could not generate snapshot template pack. Please try again.');
    } finally {
      setIsSnapshotTemplateLoading(false);
    }
  };

  // Build comparison chart data
  const allScenariosWithSeries = React.useMemo(() => {
    const allScenarios = [
      { id: 'current', name: 'Current', result, color: '#06b6d4' },
      ...resolvedScenarios.map((s) => ({ id: s.id, name: s.name, result: s.result, color: s.color })),
    ];
    const counts = new Map<string, number>();
    return allScenarios.map((sc) => {
      const normalized = sc.name.trim().toLowerCase();
      const seen = (counts.get(normalized) ?? 0) + 1;
      counts.set(normalized, seen);
      return {
        ...sc,
        seriesKey: seen === 1 ? sc.name : `${sc.name} (${seen})`,
      };
    });
  }, [resolvedScenarios, result]);

  const years = result.years.map((y) => y.label);
  const gapCompareData = years.map((yr, i) => {
    const row: Record<string, number | string> = { year: yr };
    allScenariosWithSeries.forEach((sc) => {
      row[sc.seriesKey] = Math.round(sc.result.years[i]?.rawGap ?? 0);
    });
    return row;
  });

  const reservesCompareData = years.map((yr, i) => {
    const row: Record<string, number | string> = { year: yr };
    allScenariosWithSeries.forEach((sc) => {
      row[sc.seriesKey] = Math.round(sc.result.years[i]?.totalClosingReserves ?? 0);
    });
    return row;
  });

  const compareScenario = resolvedScenarios.find((s) => s.id === compareScenarioId) ?? resolvedScenarios[0];
  const decomposition = compareScenario
    ? [
      {
        title: 'Council Tax Assumption',
        delta: y1(compareScenario.assumptions.funding.councilTaxIncrease) - y1(assumptions.funding.councilTaxIncrease),
        unit: 'pp',
        impactHint: 'Higher values improve funding.',
      },
      {
        title: 'Pay Award Assumption',
        delta: y1(compareScenario.assumptions.expenditure.payAward) - y1(assumptions.expenditure.payAward),
        unit: 'pp',
        impactHint: 'Higher values increase cost pressure.',
      },
      {
        title: 'ASC Demand Growth',
        delta: y1(compareScenario.assumptions.expenditure.ascDemandGrowth) - y1(assumptions.expenditure.ascDemandGrowth),
        unit: 'pp',
        impactHint: 'Higher values worsen demand-led spending.',
      },
      {
        title: 'Savings Delivery',
        delta: y1(compareScenario.assumptions.expenditure.savingsDeliveryRisk) - y1(assumptions.expenditure.savingsDeliveryRisk),
        unit: 'pp',
        impactHint: 'Higher values improve savings delivery.',
      },
      {
        title: '5-Year Gap Outcome',
        delta: compareScenario.result.totalGap - result.totalGap,
        unit: '£k',
        impactHint: 'Positive delta means a worse shortfall than current.',
      },
      {
        title: 'Year 5 Reserves',
        delta: (compareScenario.result.years[4]?.totalClosingReserves ?? 0) - (result.years[4]?.totalClosingReserves ?? 0),
        unit: '£k',
        impactHint: 'Positive delta means stronger end-position buffers.',
      },
    ]
    : [];

  const fundingStreamDeltas = compareScenario
    ? (() => {
      const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
      const current = {
        councilTax: sum(result.years.map((y) => y.councilTax)),
        businessRates: sum(result.years.map((y) => y.businessRates)),
        grants: sum(result.years.map((y) => y.coreGrants)),
        otherFunding: sum(result.years.map((y) => y.feesAndCharges)),
      };
      const target = {
        councilTax: sum(compareScenario.result.years.map((y) => y.councilTax)),
        businessRates: sum(compareScenario.result.years.map((y) => y.businessRates)),
        grants: sum(compareScenario.result.years.map((y) => y.coreGrants)),
        otherFunding: sum(compareScenario.result.years.map((y) => y.feesAndCharges)),
      };
      return [
        { title: 'Council Tax', delta: target.councilTax - current.councilTax },
        { title: 'Business Rates', delta: target.businessRates - current.businessRates },
        { title: 'Grants', delta: target.grants - current.grants },
        { title: 'Other Funding', delta: target.otherFunding - current.otherFunding },
      ];
    })()
    : [];

  const firstNonCurrentKey = decisionOptions.find((o) => o.key !== 'current')?.key ?? 'current';
  const optionKeys = React.useMemo(() => new Set(decisionOptions.map((o) => o.key)), [decisionOptions]);
  const pickDecision = (key: string, fallbackKey: string) =>
    decisionOptions.find((o) => o.key === key)
    ?? decisionOptions.find((o) => o.key === fallbackKey)
    ?? decisionOptions[0];
  const optionA = pickDecision(decisionA, 'current');
  const optionB = pickDecision(decisionB || firstNonCurrentKey, firstNonCurrentKey);
  const optionC = pickDecision(decisionC || firstNonCurrentKey, firstNonCurrentKey);

  React.useEffect(() => {
    if (!optionKeys.has(decisionA)) setDecisionA('current');
    if (!decisionB || !optionKeys.has(decisionB)) setDecisionB(firstNonCurrentKey);
    if (!decisionC || !optionKeys.has(decisionC)) setDecisionC(firstNonCurrentKey);
  }, [decisionA, decisionB, decisionC, optionKeys, firstNonCurrentKey]);

  const decisionRows = [optionA, optionB, optionC].map((o, i) => ({
    label: `Option ${String.fromCharCode(65 + i)}`,
    name: o.name,
    sourceType: o.sourceType,
    totalGap: o.result.totalGap,
    risk: o.result.overallRiskScore,
    reservesY5: o.result.years[4]?.totalClosingReserves ?? 0,
    tradeoff:
      o.result.totalGap <= 0
        ? 'Balanced profile; focus shifts to resilience and delivery confidence.'
        : o.result.overallRiskScore >= 65
          ? 'Higher downside risk; likely needs stronger mitigations before adoption.'
        : 'Partially mitigated position; requires managed delivery and monitoring.',
  }));

  const scenarioBookmarks = [
    {
      label: 'Can we balance without one-offs?',
      answer: result.totalStructuralGap <= 0 ? 'Current option is structurally balanced.' : `Structural gap remains at ${fmtK(result.totalStructuralGap)}.`,
    },
    {
      label: 'What if funding drops?',
      answer: resolvedScenarios.find((s) => s.name.toLowerCase().includes('funding'))?.result.totalGap
        ? `Funding Shock shows ${fmtK(resolvedScenarios.find((s) => s.name.toLowerCase().includes('funding'))?.result.totalGap ?? 0)} five-year gap.`
        : 'Create the default scenario pack to answer this directly.',
    },
    {
      label: 'How exposed are reserves?',
      answer: result.yearReservesExhausted ? `Reserves exhaust in ${result.yearReservesExhausted}.` : `Year 5 reserves are ${fmtK(result.years[4]?.totalClosingReserves ?? 0)}.`,
    },
    {
      label: 'Which option should members see?',
      answer: decisionRows.slice().sort((a, b) => a.risk - b.risk)[0]?.name ?? 'Select options for the decision matrix.',
    },
  ];

  const scenarioRankRows = React.useMemo(
    () => rankScenarios(resolvedScenarios, decisionWeights),
    [decisionWeights, resolvedScenarios]
  );
  const recommendedScenario = scenarioRankRows[0]?.scenario;
  const bestScenario = [...resolvedScenarios].sort((a, b) => a.result.totalGap - b.result.totalGap)[0];
  const worstScenario = [...resolvedScenarios].sort((a, b) => b.result.totalGap - a.result.totalGap)[0];
  const scenarioConfidenceRows = React.useMemo(
    () => new Map(resolvedScenarios.map((scenario) => [scenario.id, scenarioConfidence(scenario, baseline, savingsProposals)])),
    [baseline, resolvedScenarios, savingsProposals]
  );

  const matrixRows = React.useMemo(() => {
    const options = [optionA, optionB, optionC].map((o, i) => ({
      key: `Option ${String.fromCharCode(65 + i)}`,
      name: o.name,
      totalGap: o.result.totalGap,
      risk: o.result.overallRiskScore,
      reservesY5: o.result.years[4]?.totalClosingReserves ?? 0,
      deliverability: Math.max(0, 100 - o.result.savingsAsBudgetPct * 8),
    }));
    const minGap = Math.min(...options.map((o) => o.totalGap));
    const maxGap = Math.max(...options.map((o) => o.totalGap));
    const minRisk = Math.min(...options.map((o) => o.risk));
    const maxRisk = Math.max(...options.map((o) => o.risk));
    const minReserves = Math.min(...options.map((o) => o.reservesY5));
    const maxReserves = Math.max(...options.map((o) => o.reservesY5));
    const minDeliverability = Math.min(...options.map((o) => o.deliverability));
    const maxDeliverability = Math.max(...options.map((o) => o.deliverability));

    const lowBetter = (value: number, min: number, max: number) => (max === min ? 50 : ((max - value) / (max - min)) * 100);
    const highBetter = (value: number, min: number, max: number) => (max === min ? 50 : ((value - min) / (max - min)) * 100);

    const weightSum = decisionWeights.affordability + decisionWeights.risk + decisionWeights.reserves + decisionWeights.deliverability;
    const wa = weightSum > 0 ? decisionWeights.affordability / weightSum : 0;
    const wr = weightSum > 0 ? decisionWeights.risk / weightSum : 0;
    const wv = weightSum > 0 ? decisionWeights.reserves / weightSum : 0;
    const wd = weightSum > 0 ? decisionWeights.deliverability / weightSum : 0;

    const scored = options.map((o) => {
      const affordabilityScore = lowBetter(o.totalGap, minGap, maxGap);
      const riskScore = lowBetter(o.risk, minRisk, maxRisk);
      const reservesScore = highBetter(o.reservesY5, minReserves, maxReserves);
      const deliverabilityScore = highBetter(o.deliverability, minDeliverability, maxDeliverability);
      const weightedScore = (affordabilityScore * wa) + (riskScore * wr) + (reservesScore * wv) + (deliverabilityScore * wd);
      return {
        ...o,
        affordabilityScore,
        riskScore,
        reservesScore,
        deliverabilityScore,
        weightedScore,
      };
    });
    return scored.sort((a, b) => b.weightedScore - a.weightedScore);
  }, [optionA, optionB, optionC, decisionWeights]);

  const exportDecisionPack = () => {
    const selected = [optionA, optionB, optionC].map((o, i) => ({
      label: `Option ${String.fromCharCode(65 + i)}`,
      name: o.name,
      description: `${o.description ?? ''}${o.description ? ' · ' : ''}Source: ${o.sourceType}${o.sourceId ? ` (${o.sourceId})` : ''}`,
      type: o.type,
      assumptions: o.assumptions,
      result: o.result,
    }));
    exportDecisionPackPdf({ authorityConfig, options: selected });
  };

  const downloadScenarioAudit = () => {
    const csv = exportScenarioAuditCsv ? exportScenarioAuditCsv() : buildScenarioAuditCsv(resolvedScenarios, result);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mtfs_scenario_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const whatIfResult = compareScenario
    ? (() => {
      const next = normalizeAssumptions(compareScenario.assumptions);
      next.expenditure.payAward = addToProfile(next.expenditure.payAward, whatIf.pay);
      next.funding.grantVariation = addToProfile(next.funding.grantVariation, whatIf.grant);
      next.expenditure.savingsDeliveryRisk = addToProfile(next.expenditure.savingsDeliveryRisk, whatIf.savings);
      return runCalculations(next, baseline, savingsProposals);
    })()
    : null;

  const switchToMemberViewWithRecommended = () => {
    const top = matrixRows[0];
    if (top) {
      const pickedIdx = [optionA, optionB, optionC].findIndex((_, idx) => `Option ${String.fromCharCode(65 + idx)}` === top.key);
      const picked = pickedIdx >= 0 ? [optionA, optionB, optionC][pickedIdx] : undefined;
      if (picked) {
        setSelectedDecisionOption({
          label: (pickedIdx === 0 ? 'A' : pickedIdx === 1 ? 'B' : 'C'),
          name: picked.name,
          sourceType: picked.sourceType,
          timestamp: new Date().toISOString(),
        });
        if (picked.sourceType !== 'current') {
          setCurrentWorkingSet({ kind: picked.sourceType === 'scenario' ? 'scenario' : 'snapshot', name: picked.name, timestamp: new Date().toISOString() });
        }
      }
    }
    setActiveRole('members');
  };

  const getFlattenedAssumptions = (input: typeof assumptions) => ([
    ['Council Tax Increase (Y1)', y1(input.funding.councilTaxIncrease)],
    ['Business Rates Growth (Y1)', y1(input.funding.businessRatesGrowth)],
    ['Grant Variation (Y1)', y1(input.funding.grantVariation)],
    ['Fees & Charges Elasticity (Y1)', y1(input.funding.feesChargesElasticity)],
    ['Pay Award (Y1)', y1(input.expenditure.payAward)],
    ['Non-Pay Inflation (Y1)', y1(input.expenditure.nonPayInflation)],
    ['ASC Demand Growth (Y1)', y1(input.expenditure.ascDemandGrowth)],
    ['CSC Demand Growth (Y1)', y1(input.expenditure.cscDemandGrowth)],
    ['Savings Delivery Risk (Y1)', y1(input.expenditure.savingsDeliveryRisk)],
    ['Annual Savings Target (Y1)', y1(input.policy.annualSavingsTarget)],
    ['Planned Reserves Use (Y1)', y1(input.policy.reservesUsage)],
    ['Protect Social Care', input.policy.socialCareProtection ? 1 : 0],
    ['Real Terms Mode', input.advanced.realTermsToggle ? 1 : 0],
    ['Deflator Rate', input.advanced.inflationRate],
  ]);

  const diffTargetOptions = [
    ...resolvedScenarios.map((s) => ({ key: `scenario:${s.id}`, label: `Scenario: ${s.name}`, assumptions: s.assumptions, result: s.result })),
    ...snapshots.map((s) => ({
      key: `snapshot:${s.id}`,
      label: `Snapshot: ${s.name}`,
      assumptions: s.assumptions,
      result: runCalculations(s.assumptions, s.baseline, s.savingsProposals),
    })),
  ];

  const selectedDiffTarget = diffTargetOptions.find((x) => x.key === diffTarget) ?? diffTargetOptions[0];
  const diffRows = selectedDiffTarget
    ? getFlattenedAssumptions(assumptions).map(([label, currentValue]) => {
      const targetVal = getFlattenedAssumptions(selectedDiffTarget.assumptions).find(([l]) => l === label)?.[1] ?? currentValue;
      const delta = Number(targetVal) - Number(currentValue);
      return { label, currentValue, targetVal, delta, changed: Math.abs(delta) > 0.0001 };
    }).filter((r) => r.changed)
    : [];

  React.useEffect(() => {
    if (scenariosFocus !== 'snapshots') return;
    snapshotsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const timer = window.setTimeout(() => setScenariosFocus('none'), 600);
    return () => window.clearTimeout(timer);
  }, [scenariosFocus, setScenariosFocus]);

  if (meetingMode) {
    const doNothing = resolvedScenarios.find((s) => s.name.toLowerCase().includes('do nothing'));
    const stress = resolvedScenarios.find((s) => s.name.toLowerCase().includes('shock') || s.name.toLowerCase().includes('stress'));
    const slideOptions = [
      { label: 'Current', name: 'Live model', result },
      { label: 'Do Nothing', name: doNothing?.name ?? worstScenario?.name ?? 'Create template', result: doNothing?.result ?? worstScenario?.result ?? result },
      { label: 'Recommended', name: recommendedScenario?.name ?? 'Run templates', result: recommendedScenario?.result ?? result },
      { label: 'Stress', name: stress?.name ?? 'Funding shock', result: stress?.result ?? result },
    ];
    return (
      <div id="scenario-meeting-mode" className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.72)] p-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Meeting mode</p>
            <h2 className="mt-1 text-[24px] font-bold text-[#f0f4ff]">Scenario decision story</h2>
          </div>
          <button onClick={() => setMeetingMode(false)} className="rounded-lg border border-[rgba(99,179,237,0.22)] px-3 py-2 text-[11px] font-semibold text-[#8ca0c0]">Exit meeting mode</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {slideOptions.map((option) => (
            <div key={option.label} className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(8,12,20,0.82)] p-5">
              <p className="text-[11px] uppercase tracking-widest text-[#60a5fa]">{option.label}</p>
              <h3 className="mt-2 min-h-[56px] text-[20px] font-bold text-[#f0f4ff]">{option.name}</h3>
              <div className="mt-5 space-y-3">
                <p className="mono text-[22px] font-bold text-[#f59e0b]">{fmtK(option.result.totalGap)}</p>
                <p className="text-[12px] text-[#8ca0c0]">Risk {option.result.overallRiskScore.toFixed(0)}/100 · Y5 reserves {fmtK(option.result.years[4]?.totalClosingReserves ?? 0)}</p>
                <p className="text-[12px] leading-relaxed text-[#c8d7ee]">{option.result.totalGap <= 0 ? 'Balanced option; focus on confidence and deliverability.' : 'Requires further mitigation or clear acceptance of risk.'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="scenario-executive-view" className="space-y-4 scroll-mt-32">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-[#f0f4ff]">Scenario Comparison</h3>
            <RichTooltip content="Store and compare alternative assumption sets to support option appraisal and member decisions." />
          </div>
          <p className="text-[11px] text-[#4a6080] mt-0.5">
            Save the current assumption set as a named scenario, then compare side-by-side
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => createDefaultScenarioPack()}
            title="Create/refresh Balanced Plan, Do Nothing, Recommended Plan, Funding Shock, Demand Shock, Savings Slippage and Inflation Shock templates."
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold hover:bg-[rgba(16,185,129,0.22)] transition-colors"
          >
            <Target size={12} />
            Create Scenario Templates
          </button>
          <button
            onClick={() => setShowSaveDialog(!showSaveDialog)}
            title="Capture the current assumptions as a reusable scenario for side-by-side comparison."
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] transition-colors"
          >
            <Plus size={12} />
            Save Current Scenario
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Committee Question Bookmarks</CardTitle>
          <span className="text-[10px] text-[#4a6080]">Fast answers for member and S151 challenge</span>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {scenarioBookmarks.map((bookmark) => (
            <div key={bookmark.label} className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(99,179,237,0.04)] p-3">
              <p className="text-[10px] font-semibold text-[#c8d7ee]">{bookmark.label}</p>
              <p className="text-[11px] text-[#8ca0c0] mt-1">{bookmark.answer}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Save dialog */}
      {showSaveDialog && (
        <Card className="border-[rgba(59,130,246,0.25)] bg-[#111b2e]">
          <CardTitle className="mb-3">Save Scenario</CardTitle>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Scenario name (e.g. 'Low Growth Base')"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              title="Enter a short scenario name for governance reporting and recall."
              className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.15)] rounded-lg px-3 py-2 text-[12px] text-[#f0f4ff] outline-none focus:border-[rgba(59,130,246,0.5)] placeholder:text-[#4a6080]"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={scenarioDesc}
              onChange={(e) => setScenarioDesc(e.target.value)}
              title="Describe the strategic intent or assumptions behind this scenario."
              className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.15)] rounded-lg px-3 py-2 text-[12px] text-[#f0f4ff] outline-none focus:border-[rgba(59,130,246,0.5)] placeholder:text-[#4a6080]"
            />
            <div className="flex gap-2">
              {(['base', 'optimistic', 'pessimistic', 'custom'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setScenarioType(t)}
                  title={`Tag scenario as ${t} to support filtering and interpretation.`}
                  className={`flex-1 py-1.5 text-[10px] font-semibold rounded capitalize transition-colors ${
                    scenarioType === t
                      ? 'bg-[rgba(59,130,246,0.25)] text-[#3b82f6] border border-[rgba(59,130,246,0.4)]'
                      : 'bg-[rgba(99,179,237,0.05)] text-[#4a6080] border border-[rgba(99,179,237,0.1)] hover:text-[#8ca0c0]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!scenarioName.trim()}
                title="Save scenario to this browser session."
                className="flex-1 py-2 bg-[#3b82f6] text-white text-[11px] font-semibold rounded-lg hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save Scenario
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                title="Close dialog without saving."
                className="px-4 py-2 bg-[rgba(99,179,237,0.08)] text-[#8ca0c0] text-[11px] font-medium rounded-lg hover:bg-[rgba(99,179,237,0.12)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      <div ref={snapshotsSectionRef}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>Model Snapshots (A31)</CardTitle>
            <RichTooltip content="Save full model state, export/import JSON or Excel, and reload later to continue editing." />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleDownloadSnapshotTemplate()}
              disabled={isSnapshotTemplateLoading}
              className="px-3 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.35)] text-[#3b82f6] text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download snapshot template pack with template, three dummy examples, and instructions."
            >
              <Download size={11} className="inline mr-1" />
              {isSnapshotTemplateLoading ? 'Preparing Template...' : 'Download Template'}
            </button>
            <label className="px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.35)] text-[#10b981] text-[10px] font-semibold cursor-pointer">
              <Upload size={11} className="inline mr-1" />
              Import JSON/XLSX
              <input type="file" accept=".json,.xlsx,.xls,application/json" className="hidden" onChange={handleImportSnapshotFile} />
            </label>
          </div>
        </CardHeader>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-3">
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Snapshot name"
            className="bg-[#080c14] border border-[rgba(99,179,237,0.15)] rounded-lg px-3 py-2 text-[11px] text-[#f0f4ff]"
          />
          <input
            type="text"
            value={snapshotDesc}
            onChange={(e) => setSnapshotDesc(e.target.value)}
            placeholder="Description (optional)"
            className="bg-[#080c14] border border-[rgba(99,179,237,0.15)] rounded-lg px-3 py-2 text-[11px] text-[#f0f4ff]"
          />
          <button
            onClick={handleSaveSnapshot}
            disabled={!snapshotName.trim()}
            className="px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold disabled:opacity-40"
          >
            <Save size={11} className="inline mr-1" />
            Save Snapshot
          </button>
        </div>
        {snapshotMessage && <p className="text-[10px] text-[#8ca0c0] mb-2">{snapshotMessage}</p>}
        <div className="space-y-2">
          {snapshots.length === 0 && <p className="text-[10px] text-[#4a6080]">No snapshots saved yet.</p>}
          {snapshots.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-[#080c14] border border-[rgba(99,179,237,0.12)] px-3 py-2">
              <div>
                <p className="text-[11px] text-[#f0f4ff] font-semibold">{s.name}</p>
                <p className="text-[9px] text-[#4a6080]">{new Date(s.createdAt).toLocaleString('en-GB')} {s.description ? `· ${s.description}` : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => loadSnapshot(s.id)} className="px-2 py-1 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[10px]">Load</button>
                <button onClick={() => handleExportSnapshot(s.id)} className="px-2 py-1 rounded bg-[rgba(16,185,129,0.12)] text-[#10b981] text-[10px]">Export JSON</button>
                <button onClick={() => void handleExportSnapshotXlsx(s.id)} className="px-2 py-1 rounded bg-[rgba(99,102,241,0.12)] text-[#818cf8] text-[10px]">
                  <FileSpreadsheet size={10} className="inline mr-1" />
                  Export XLSX
                </button>
                <button onClick={() => deleteSnapshot(s.id)} className="px-2 py-1 rounded bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[10px]">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>Scenario Dashboard</CardTitle>
            <RichTooltip content="Leadership view of the current option set: best affordability, worst downside and recommended weighted option." />
          </div>
          <button
            onClick={downloadScenarioAudit}
            className="px-3 py-1.5 rounded-lg bg-[rgba(99,179,237,0.08)] border border-[rgba(99,179,237,0.22)] text-[#8ca0c0] text-[10px] font-semibold"
          >
            Export Scenario Audit CSV
          </button>
        </CardHeader>
        <div className="grid gap-2 md:grid-cols-4">
          {[
            { label: 'Current', name: 'Live model', gap: result.totalGap, risk: result.overallRiskScore, color: '#60a5fa' },
            { label: 'Best gap', name: bestScenario?.name ?? 'Create scenarios', gap: bestScenario?.result.totalGap ?? result.totalGap, risk: bestScenario?.result.overallRiskScore ?? result.overallRiskScore, color: '#10b981' },
            { label: 'Worst downside', name: worstScenario?.name ?? 'Create scenarios', gap: worstScenario?.result.totalGap ?? result.totalGap, risk: worstScenario?.result.overallRiskScore ?? result.overallRiskScore, color: '#ef4444' },
            { label: 'Recommended', name: recommendedScenario?.name ?? 'Run templates', gap: recommendedScenario?.result.totalGap ?? result.totalGap, risk: recommendedScenario?.result.overallRiskScore ?? result.overallRiskScore, color: '#f59e0b' },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border p-3" style={{ borderColor: `${card.color}35`, background: `${card.color}0d` }}>
              <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">{card.label}</p>
              <p className="mt-1 text-[12px] font-semibold text-[#f0f4ff] truncate">{card.name}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="mono text-[13px] font-bold" style={{ color: card.color }}>{fmtK(card.gap)}</span>
                <span className="mono text-[10px] text-[#8ca0c0]">Risk {card.risk.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
        {recommendedScenario && (
          <p className="mt-3 text-[11px] text-[#8ca0c0]">
            Recommended scenario: <span className="text-[#f0f4ff] font-semibold">{recommendedScenario.name}</span>. {scenarioNarrative(recommendedScenario, result)}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>Scenario Wizard</CardTitle>
            <RichTooltip content="Create a governed scenario from a finance leadership goal without manually changing every assumption." />
          </div>
          <button
            onClick={() => createScenarioFromGoal(wizardGoal)}
            className="px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.35)] text-[#10b981] text-[10px] font-semibold"
          >
            Build Scenario
          </button>
        </CardHeader>
        <div className="grid gap-2 md:grid-cols-4">
          {[
            { id: 'balance_gap' as const, label: 'Balance gap', copy: 'Increase recurring savings to close the modelled gap.' },
            { id: 'protect_reserves' as const, label: 'Protect reserves', copy: 'Reduce reserve reliance and strengthen resilience.' },
            { id: 'minimise_savings' as const, label: 'Minimise savings', copy: 'Show counterfactual pressure with limited mitigation.' },
            { id: 'stress_funding' as const, label: 'Stress funding', copy: 'Apply adverse grant and rates assumptions.' },
          ].map((goal) => (
            <button
              key={goal.id}
              onClick={() => setWizardGoal(goal.id)}
              className={`rounded-lg border p-3 text-left ${wizardGoal === goal.id ? 'border-[#3b82f6] bg-[rgba(59,130,246,0.14)]' : 'border-[rgba(99,179,237,0.12)] bg-[rgba(99,179,237,0.04)]'}`}
            >
              <p className="text-[11px] font-semibold text-[#f0f4ff]">{goal.label}</p>
              <p className="mt-1 text-[10px] text-[#8ca0c0]">{goal.copy}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>Decision Pack (3 Options)</CardTitle>
            <RichTooltip content="Compares three options with headline trade-offs for cabinet/full council decision papers." />
          </div>
          <button
            onClick={exportDecisionPack}
            className="px-3 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[10px] font-semibold"
            title="Export a high-fidelity 3-option decision pack as PDF."
          >
            Export Decision Pack PDF
          </button>
        </CardHeader>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'A', value: decisionA, setter: setDecisionA },
            { label: 'B', value: decisionB || firstNonCurrentKey, setter: setDecisionB },
            { label: 'C', value: decisionC || firstNonCurrentKey, setter: setDecisionC },
          ].map(({ label, value, setter }) => (
            <div key={label as string}>
              <p className="text-[10px] text-[#4a6080] mb-1">Option {label}</p>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.2)] rounded-md px-2 py-1.5 text-[10px] text-[#f0f4ff]"
              >
                {decisionOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.sourceType === 'current' ? 'Current' : `${o.sourceType === 'scenario' ? 'Scenario' : 'Snapshot'}: ${o.name}`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#4a6080] mb-3">
          Options can be sourced from Current, Scenarios, or Snapshots.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full premium-table text-[11px]">
            <thead>
              <tr className="border-b border-[rgba(99,179,237,0.08)]">
                <th className="text-left py-2 text-[#4a6080]">Option</th>
                <th className="text-right py-2 text-[#4a6080]">5yr Gap</th>
                <th className="text-right py-2 text-[#4a6080]">Risk</th>
                <th className="text-right py-2 text-[#4a6080]">Y5 Reserves</th>
                <th className="text-left py-2 text-[#4a6080]">Trade-off</th>
              </tr>
            </thead>
            <tbody>
              {decisionRows.map((r) => (
                <tr key={r.label} className="border-b border-[rgba(99,179,237,0.04)]">
                  <td className="py-2 text-[#f0f4ff] font-semibold">
                    {r.label}: {r.name}
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[rgba(99,179,237,0.12)] text-[#8ca0c0] uppercase">
                      {r.sourceType}
                    </span>
                  </td>
                  <td className="py-2 text-right mono">{fmtK(r.totalGap)}</td>
                  <td className="py-2 text-right mono">{r.risk.toFixed(0)}</td>
                  <td className="py-2 text-right mono">{fmtK(r.reservesY5)}</td>
                  <td className="py-2 text-[#8ca0c0]">{r.tradeoff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-[rgba(99,179,237,0.03)] border border-[rgba(99,179,237,0.12)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-[11px] font-semibold text-[#f0f4ff]">Weighted Decision Matrix</p>
            <p className="text-[9px] text-[#4a6080]">0–100 normalized score across options A/B/C</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {[
              { key: 'affordability' as const, label: 'Affordability (Gap)' },
              { key: 'risk' as const, label: 'Risk Profile' },
              { key: 'reserves' as const, label: 'Year-5 Reserves' },
              { key: 'deliverability' as const, label: 'Deliverability' },
            ].map((w) => (
              <div key={w.key}>
                <p className="text-[10px] text-[#4a6080] mb-1">{w.label} Weight</p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={decisionWeights[w.key]}
                    onChange={(e) => setDecisionWeights((prev) => ({ ...prev, [w.key]: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <span className="mono text-[10px] text-[#8ca0c0] w-8 text-right">{decisionWeights[w.key]}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full premium-table text-[10px]">
              <thead>
                <tr className="border-b border-[rgba(99,179,237,0.08)]">
                  <th className="text-left py-2 text-[#4a6080]">Rank</th>
                  <th className="text-left py-2 text-[#4a6080]">Option</th>
                  <th className="text-right py-2 text-[#4a6080]">Affordability</th>
                  <th className="text-right py-2 text-[#4a6080]">Risk</th>
                  <th className="text-right py-2 text-[#4a6080]">Reserves</th>
                  <th className="text-right py-2 text-[#4a6080]">Deliverability</th>
                  <th className="text-right py-2 text-[#4a6080]">Weighted Total</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, idx) => (
                  <tr key={`${row.key}-${row.name}`} className="border-b border-[rgba(99,179,237,0.04)]">
                    <td className="py-2 text-[#f0f4ff] font-semibold">{idx + 1}</td>
                    <td className="py-2 text-[#8ca0c0]">{row.key}: {row.name}</td>
                    <td className="py-2 text-right mono text-[#8ca0c0]">{row.affordabilityScore.toFixed(1)}</td>
                    <td className="py-2 text-right mono text-[#8ca0c0]">{row.riskScore.toFixed(1)}</td>
                    <td className="py-2 text-right mono text-[#8ca0c0]">{row.reservesScore.toFixed(1)}</td>
                    <td className="py-2 text-right mono text-[#8ca0c0]">{row.deliverabilityScore.toFixed(1)}</td>
                    <td className="py-2 text-right mono font-bold text-[#10b981]">{row.weightedScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[#8ca0c0] mt-2">
            Recommended option with current weighting: <span className="text-[#f0f4ff] font-semibold">{matrixRows[0]?.key}: {matrixRows[0]?.name}</span>
          </p>
          {matrixRows[0] && (
            <div className="mt-2 text-[10px] text-[#8ca0c0]">
              <p>
                Recommendation reason: {matrixRows[0].key} ranks highest because it balances lower affordability pressure ({matrixRows[0].affordabilityScore.toFixed(1)}),
                lower risk ({matrixRows[0].riskScore.toFixed(1)}), stronger reserves ({matrixRows[0].reservesScore.toFixed(1)}), and deliverability ({matrixRows[0].deliverabilityScore.toFixed(1)}).
              </p>
              <button
                onClick={switchToMemberViewWithRecommended}
                className="mt-2 px-2 py-1 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] border border-[rgba(59,130,246,0.3)]"
              >
                Switch to Member View with selected option
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>What Changed Diff Mode</CardTitle>
            <RichTooltip content="Visual diff of current assumptions versus a selected scenario or snapshot, including outcome deltas." />
          </div>
          <label className="flex items-center gap-2 text-[10px] text-[#8ca0c0]">
            <input type="checkbox" checked={diffModeEnabled} onChange={(e) => setDiffModeEnabled(e.target.checked)} />
            Enable diff mode
          </label>
        </CardHeader>
        {diffModeEnabled ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[#4a6080]">Compare current to</span>
              <select
                value={selectedDiffTarget?.key ?? ''}
                onChange={(e) => setDiffTarget(e.target.value)}
                className="bg-[#080c14] border border-[rgba(99,179,237,0.2)] rounded-md px-2 py-1.5 text-[10px] text-[#f0f4ff]"
              >
                {diffTargetOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </div>
            {selectedDiffTarget ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg bg-[#080c14] border border-[rgba(99,179,237,0.12)] p-2">
                    <p className="text-[9px] text-[#4a6080] uppercase tracking-widest">Δ 5yr Gap</p>
                    <p className="mono text-[12px] font-bold text-[#f0f4ff]">
                      {fmtK(selectedDiffTarget.result.totalGap - result.totalGap)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#080c14] border border-[rgba(99,179,237,0.12)] p-2">
                    <p className="text-[9px] text-[#4a6080] uppercase tracking-widest">Δ Risk</p>
                    <p className="mono text-[12px] font-bold text-[#f0f4ff]">
                      {(selectedDiffTarget.result.overallRiskScore - result.overallRiskScore).toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#080c14] border border-[rgba(99,179,237,0.12)] p-2">
                    <p className="text-[9px] text-[#4a6080] uppercase tracking-widest">Δ Y5 Reserves</p>
                    <p className="mono text-[12px] font-bold text-[#f0f4ff]">
                      {fmtK((selectedDiffTarget.result.years[4]?.totalClosingReserves ?? 0) - (result.years[4]?.totalClosingReserves ?? 0))}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full premium-table sticky-first resizable text-[10px]">
                    <thead>
                      <tr className="border-b border-[rgba(99,179,237,0.08)]">
                        <th className="text-left py-2 text-[#4a6080]">Assumption</th>
                        <th className="text-right py-2 text-[#4a6080]">Current</th>
                        <th className="text-right py-2 text-[#4a6080]">Selected</th>
                        <th className="text-right py-2 text-[#4a6080]">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.map((row) => (
                        <tr key={row.label} className="border-b border-[rgba(99,179,237,0.04)]">
                          <td className="py-2 text-[#8ca0c0]">{row.label}</td>
                          <td className="py-2 text-right mono text-[#8ca0c0]">{Number(row.currentValue).toLocaleString('en-GB', { maximumFractionDigits: 2 })}</td>
                          <td className="py-2 text-right mono text-[#8ca0c0]">{Number(row.targetVal).toLocaleString('en-GB', { maximumFractionDigits: 2 })}</td>
                          <td className={`py-2 text-right mono font-semibold ${row.delta >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                            {row.delta >= 0 ? '+' : ''}{row.delta.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-[10px] text-[#4a6080]">No scenario/snapshot available for comparison.</p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-[#4a6080]">Enable diff mode to highlight assumption and outcome differences visually.</p>
        )}
      </Card>

      {resolvedScenarios.length === 0 && (
        <div className="rounded-xl border border-dashed border-[rgba(99,179,237,0.15)] p-8 text-center">
          <Target size={24} className="text-[#4a6080] mx-auto mb-2" />
          <p className="text-[12px] text-[#4a6080]">No saved scenarios yet</p>
          <p className="text-[10px] text-[#4a6080] mt-1">
            Adjust assumptions and save scenarios to compare different financial strategies
          </p>
        </div>
      )}

      {resolvedScenarios.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <CardTitle>Why Different? Side-by-Side Explainer</CardTitle>
                <RichTooltip content="Breaks down key assumption deltas and outcome differences versus current settings." />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#4a6080]">Compare Current with</span>
                <select
                  value={compareScenario?.id ?? ''}
                  onChange={(e) => setCompareScenarioId(e.target.value)}
                  title="Select a saved scenario to compare against the current assumptions."
                  className="bg-[#080c14] border border-[rgba(99,179,237,0.2)] rounded-md px-2 py-1 text-[10px] text-[#f0f4ff]"
                >
                  {resolvedScenarios.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            {compareScenario && (
              <div className="grid grid-cols-3 gap-2">
                {decomposition.map((item) => {
                  const positive = item.delta > 0;
                  const color = item.title === 'Year 5 Reserves'
                    ? (positive ? '#10b981' : '#ef4444')
                    : (positive ? '#ef4444' : '#10b981');
                  const value = item.unit === '£k'
                    ? fmtK(item.delta)
                    : `${positive ? '+' : ''}${item.delta.toFixed(2)}${item.unit}`;
                  return (
                    <div key={item.title} className="rounded-lg bg-[#080c14] border border-[rgba(99,179,237,0.12)] p-2.5">
                      <p className="text-[10px] text-[#8ca0c0]">{item.title}</p>
                      <p className="mono text-[13px] font-bold mt-1" style={{ color }}>
                        {value}
                      </p>
                      <p className="text-[9px] text-[#4a6080] mt-1">{item.impactHint}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {compareScenario && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-1.5">
                  <CardTitle>Funding Stream Delta (5-Year Total)</CardTitle>
                  <RichTooltip content="Difference by funding stream between current assumptions and selected scenario." />
                </div>
              </CardHeader>
              <div className="grid grid-cols-4 gap-2">
                {fundingStreamDeltas.map((item) => (
                  <div key={item.title} className="rounded-lg bg-[#080c14] border border-[rgba(99,179,237,0.12)] p-2.5">
                    <p className="text-[10px] text-[#8ca0c0]">{item.title}</p>
                    <p className="mono text-[13px] font-bold mt-1" style={{ color: item.delta >= 0 ? '#10b981' : '#ef4444' }}>
                      {fmtK(item.delta)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {compareScenario && whatIfResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-1.5">
                  <CardTitle>Quick What-If Sensitivity</CardTitle>
                  <RichTooltip content="Temporarily stress the selected scenario without saving it." />
                </div>
                <span className="text-[10px] text-[#4a6080]">Selected: {compareScenario.name}</span>
              </CardHeader>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { key: 'pay' as const, label: 'Pay award shock', min: -2, max: 3, suffix: 'pp' },
                  { key: 'grant' as const, label: 'Grant variation shock', min: -5, max: 3, suffix: 'pp' },
                  { key: 'savings' as const, label: 'Savings delivery shock', min: -30, max: 15, suffix: 'pp' },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-[#8ca0c0]">{item.label}</p>
                      <span className="mono text-[10px] text-[#f0f4ff]">{whatIf[item.key]}{item.suffix}</span>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={0.5}
                      value={whatIf[item.key]}
                      onChange={(e) => setWhatIf((prev) => ({ ...prev, [item.key]: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                {[
                  ['What-if gap', fmtK(whatIfResult.totalGap)],
                  ['Delta vs scenario', fmtK(whatIfResult.totalGap - compareScenario.result.totalGap)],
                  ['Y5 reserves', fmtK(whatIfResult.years[4]?.totalClosingReserves ?? 0)],
                  ['Risk score', `${whatIfResult.overallRiskScore.toFixed(0)}/100`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[#080c14] p-2">
                    <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">{label}</p>
                    <p className="mono mt-1 text-[12px] font-bold text-[#f0f4ff]">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Scenario Cards */}
          <div className="grid grid-cols-2 gap-3">
            {resolvedScenarios.map((sc) => (
              <Card
                key={sc.id}
                className="hover:border-[rgba(99,179,237,0.2)] transition-colors"
                style={{ borderLeft: `3px solid ${sc.color}` } as React.CSSProperties}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: sc.color }}>{typeIcons[sc.type]}</span>
                      <span className="text-[12px] font-semibold text-[#f0f4ff]">{sc.name}</span>
                      <Badge variant={typeBadge[sc.type]}>{sc.type}</Badge>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(99,179,237,0.1)] text-[#8ca0c0]">{sc.label ?? 'Draft'}</span>
                    </div>
                    {sc.description && (
                      <p className="text-[10px] text-[#4a6080]">{sc.description}</p>
                    )}
                    <p className="text-[9px] text-[#4a6080] mt-1">
                      Owner {sc.owner || 'Unassigned'} · Review {sc.reviewDate || 'Not set'} · Confidence {scenarioConfidenceRows.get(sc.id)?.score ?? 0}/100
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => cloneScenario(sc.id)}
                      className="p-1.5 rounded-lg bg-[rgba(99,179,237,0.1)] text-[#8ca0c0] hover:bg-[rgba(99,179,237,0.2)] transition-colors"
                      title="Clone this scenario"
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      onClick={() => loadScenario(sc.id)}
                      className="p-1.5 rounded-lg bg-[rgba(59,130,246,0.1)] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.2)] transition-colors"
                      title="Load this scenario"
                    >
                      <Download size={11} />
                    </button>
                    <button
                      onClick={() => deleteScenario(sc.id)}
                      className="p-1.5 rounded-lg bg-[rgba(239,68,68,0.1)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
                      title="Delete scenario"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={sc.label ?? 'Draft'}
                    onChange={(e) => updateScenario(sc.id, { label: e.target.value as Scenario['label'] }, 'Scenario label updated')}
                    className="bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
                  >
                    {SCENARIO_LABELS.map((label) => <option key={label} value={label}>{label}</option>)}
                  </select>
                  <input
                    value={sc.owner ?? ''}
                    onChange={(e) => updateScenario(sc.id, { owner: e.target.value }, 'Scenario owner updated')}
                    placeholder="Owner"
                    className="bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
                  />
                  <input
                    type="date"
                    value={sc.reviewDate ?? ''}
                    onChange={(e) => updateScenario(sc.id, { reviewDate: e.target.value }, 'Scenario review date updated')}
                    className="bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
                  />
                </div>
                <details className="mb-2 rounded-lg border border-[rgba(99,179,237,0.1)] bg-[#080c14] p-2">
                  <summary className="cursor-pointer text-[10px] font-semibold text-[#8ca0c0]">Scenario notes, quality checks and version history</summary>
                  <div className="pt-2 grid gap-2">
                    {[
                      ['rationale', 'Rationale'],
                      ['assumptions', 'Assumptions'],
                      ['tradeOffs', 'Trade-offs'],
                      ['risks', 'Risks'],
                      ['decisionRequired', 'Decision required'],
                    ].map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="text-[9px] uppercase tracking-widest text-[#4a6080]">{label}</span>
                        <textarea
                          value={String(sc.notes?.[key as keyof NonNullable<Scenario['notes']>] ?? '')}
                          onChange={(e) => updateScenario(sc.id, { notes: { ...(sc.notes ?? { rationale: '', assumptions: '', tradeOffs: '', risks: '', decisionRequired: '' }), [key]: e.target.value } }, `Scenario ${label.toLowerCase()} note updated`)}
                          className="mt-1 w-full min-h-10 bg-[rgba(99,179,237,0.04)] border border-[rgba(99,179,237,0.12)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
                        />
                      </label>
                    ))}
                    <div className="rounded border border-[rgba(99,179,237,0.1)] p-2">
                      <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Quality checks</p>
                      <p className="text-[10px] text-[#8ca0c0] mt-1">
                        {(scenarioConfidenceRows.get(sc.id)?.blockers.length ?? 0) === 0 ? 'No blockers' : scenarioConfidenceRows.get(sc.id)?.blockers.join(' ')}
                        {' '}· {(scenarioConfidenceRows.get(sc.id)?.warnings.length ?? 0)} warning(s)
                      </p>
                    </div>
                    <div className="rounded border border-[rgba(99,179,237,0.1)] p-2">
                      <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Version history</p>
                      <p className="text-[10px] text-[#8ca0c0] mt-1">
                        {(sc.versionHistory ?? []).slice(-3).map((entry) => `${new Date(entry.timestamp).toLocaleString('en-GB')}: ${entry.description}`).join(' | ') || 'No version entries yet'}
                      </p>
                    </div>
                  </div>
                </details>

                {/* Mini KPIs */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    {
                      label: '5yr Gap',
                      value: sc.result.totalGap <= 0 ? 'Balanced' : fmtK(sc.result.totalGap),
                      color: sc.result.totalGap <= 0 ? '#10b981' : '#ef4444',
                    },
                    {
                      label: 'Risk Score',
                      value: `${sc.result.overallRiskScore.toFixed(0)}`,
                      color: sc.result.overallRiskScore >= 65 ? '#ef4444' : sc.result.overallRiskScore >= 45 ? '#f59e0b' : '#10b981',
                    },
                    {
                      label: 'Y5 Reserves',
                      value: fmtK(sc.result.years[4]?.totalClosingReserves ?? 0),
                      color: sc.result.yearReservesExhausted ? '#ef4444' : '#3b82f6',
                    },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-[#080c14] rounded-lg p-2">
                      <p className="text-[9px] text-[#4a6080] uppercase tracking-widest">{kpi.label}</p>
                      <p className="mono text-[11px] font-bold mt-0.5" style={{ color: kpi.color }}>
                        {kpi.value}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-[9px] text-[#4a6080] mt-2">
                  Saved {new Date(sc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </Card>
            ))}
          </div>

          {/* Gap Comparison Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <CardTitle>Budget Gap Comparison</CardTitle>
                <RichTooltip content="Compares annual deficit/surplus trajectories across all saved scenarios." />
              </div>
              <span className="text-[10px] text-[#4a6080]">£000s — all scenarios</span>
            </CardHeader>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gapCompareData} margin={{ top: 5, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" />
                  <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a2540',
                      border: '1px solid rgba(99,179,237,0.2)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: '#8ca0c0', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: '#f0f4ff' }}
                    formatter={(value: unknown) => [fmtK(value as number), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8ca0c0' }} />
                  {allScenariosWithSeries.map((sc) => (
                    <Line
                      key={sc.id}
                      type="monotone"
                      dataKey={sc.seriesKey}
                      name={sc.seriesKey}
                      stroke={sc.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: sc.color }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Reserves Comparison */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <CardTitle>Reserves Position Comparison</CardTitle>
                <RichTooltip content="Compares available reserves paths under each scenario over the five-year horizon." />
              </div>
              <span className="text-[10px] text-[#4a6080]">£000s — all scenarios</span>
            </CardHeader>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reservesCompareData} margin={{ top: 5, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" />
                  <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `£${(v / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a2540',
                      border: '1px solid rgba(99,179,237,0.2)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: '#8ca0c0', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: '#f0f4ff' }}
                    formatter={(value: unknown) => [fmtK(value as number), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8ca0c0' }} />
                  {allScenariosWithSeries.map((sc) => (
                    <Line
                      key={sc.id}
                      type="monotone"
                      dataKey={sc.seriesKey}
                      name={sc.seriesKey}
                      stroke={sc.color}
                      strokeWidth={2}
                      strokeDasharray={sc.id === 'current' ? undefined : '6 3'}
                      dot={{ r: 3, fill: sc.color }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Delta table vs current */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <CardTitle>Delta vs Current — Year 5</CardTitle>
                <RichTooltip content="Shows Year 5 outcome deltas against current assumptions for quick decision support." />
              </div>
              <span className="text-[10px] text-[#4a6080]">Difference from current assumptions</span>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full premium-table text-[11px]">
                <thead>
                  <tr className="border-b border-[rgba(99,179,237,0.08)]">
                    <th className="text-left py-2 text-[#4a6080] font-semibold pr-4">Scenario</th>
                    <th className="text-right py-2 text-[#4a6080] font-semibold px-3">5yr Gap</th>
                    <th className="text-right py-2 text-[#4a6080] font-semibold px-3">Δ Gap</th>
                    <th className="text-right py-2 text-[#4a6080] font-semibold px-3">Y5 Reserves</th>
                    <th className="text-right py-2 text-[#4a6080] font-semibold">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[rgba(99,179,237,0.04)] bg-[rgba(6,182,212,0.04)]">
                    <td className="py-2 font-semibold text-[#06b6d4] pr-4">Current</td>
                    <td className="py-2 text-right mono text-[#f0f4ff] px-3">{fmtK(result.totalGap)}</td>
                    <td className="py-2 text-right mono text-[#4a6080] px-3">—</td>
                    <td className="py-2 text-right mono text-[#f0f4ff] px-3">
                      {fmtK(result.years[4]?.totalClosingReserves ?? 0)}
                    </td>
                    <td className="py-2 text-right mono">{result.overallRiskScore.toFixed(0)}</td>
                  </tr>
                  {resolvedScenarios.map((sc) => {
                    const deltaGap = sc.result.totalGap - result.totalGap;
                    const deltaColor = deltaGap > 0 ? '#ef4444' : '#10b981';
                    return (
                      <tr key={sc.id} className="border-b border-[rgba(99,179,237,0.04)] hover:bg-[rgba(99,179,237,0.02)]">
                        <td className="py-2 font-medium pr-4" style={{ color: sc.color }}>{sc.name}</td>
                        <td className="py-2 text-right mono text-[#8ca0c0] px-3">{fmtK(sc.result.totalGap)}</td>
                        <td className="py-2 text-right mono font-semibold px-3" style={{ color: deltaColor }}>
                          {deltaGap > 0 ? '+' : ''}{fmtK(deltaGap)}
                        </td>
                        <td className="py-2 text-right mono text-[#8ca0c0] px-3">
                          {fmtK(sc.result.years[4]?.totalClosingReserves ?? 0)}
                        </td>
                        <td className="py-2 text-right mono text-[#8ca0c0]">
                          {sc.result.overallRiskScore.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      <details className="rounded-xl border border-[rgba(99,179,237,0.12)] bg-[rgba(10,17,32,0.55)] p-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-[#8ca0c0]">Technical Drill-Down</summary>
        <div className="pt-3">
          <TechnicalDetail />
        </div>
      </details>
    </div>
  );
}
