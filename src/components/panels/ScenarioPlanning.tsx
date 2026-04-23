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
import { runCalculations } from '../../engine/calculations';

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
  const resolvedScenarios = scenarios.map((s) => ({
    ...s,
    result: runCalculations(s.assumptions, baseline, savingsProposals),
  }));

  const decisionOptions = [
    {
      id: 'current',
      name: 'Current',
      description: 'Current in-session model position.',
      type: 'current' as const,
      assumptions,
      result,
    },
    ...resolvedScenarios.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.type,
      assumptions: s.assumptions,
      result: s.result,
    })),
  ];

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
  const allScenarios = [
    { id: 'current', name: 'Current', result, color: '#06b6d4' },
    ...resolvedScenarios.map((s) => ({ id: s.id, name: s.name, result: s.result, color: s.color })),
  ];
  const allScenariosWithSeries = React.useMemo(() => {
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
  }, [allScenarios]);

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
        delta: compareScenario.assumptions.funding.councilTaxIncrease - assumptions.funding.councilTaxIncrease,
        unit: 'pp',
        impactHint: 'Higher values improve funding.',
      },
      {
        title: 'Pay Award Assumption',
        delta: compareScenario.assumptions.expenditure.payAward - assumptions.expenditure.payAward,
        unit: 'pp',
        impactHint: 'Higher values increase cost pressure.',
      },
      {
        title: 'ASC Demand Growth',
        delta: compareScenario.assumptions.expenditure.ascDemandGrowth - assumptions.expenditure.ascDemandGrowth,
        unit: 'pp',
        impactHint: 'Higher values worsen demand-led spending.',
      },
      {
        title: 'Savings Delivery',
        delta: compareScenario.assumptions.expenditure.savingsDeliveryRisk - assumptions.expenditure.savingsDeliveryRisk,
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

  const pickDecision = (id: string) => decisionOptions.find((o) => o.id === id) ?? decisionOptions[0];
  const optionA = pickDecision(decisionA);
  const optionB = pickDecision(decisionB || decisionOptions[1]?.id || 'current');
  const optionC = pickDecision(decisionC || decisionOptions[2]?.id || 'current');

  const decisionRows = [optionA, optionB, optionC].map((o, i) => ({
    label: `Option ${String.fromCharCode(65 + i)}`,
    name: o.name,
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

  const exportDecisionPack = () => {
    const selected = [optionA, optionB, optionC].map((o, i) => ({
      label: `Option ${String.fromCharCode(65 + i)}`,
      name: o.name,
      description: o.description ?? '',
      type: o.type,
      assumptions: o.assumptions,
      result: o.result,
    }));
    exportDecisionPackPdf({ authorityConfig, options: selected });
  };

  return (
    <div className="space-y-4">
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
        <button
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          title="Capture the current assumptions as a reusable scenario for side-by-side comparison."
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] transition-colors"
        >
          <Plus size={12} />
          Save Current Scenario
        </button>
      </div>

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
            { label: 'B', value: decisionB || decisionOptions[1]?.id || 'current', setter: setDecisionB },
            { label: 'C', value: decisionC || decisionOptions[2]?.id || 'current', setter: setDecisionC },
          ].map(({ label, value, setter }) => (
            <div key={label as string}>
              <p className="text-[10px] text-[#4a6080] mb-1">Option {label}</p>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.2)] rounded-md px-2 py-1.5 text-[10px] text-[#f0f4ff]"
              >
                {decisionOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          ))}
        </div>
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
                  <td className="py-2 text-[#f0f4ff] font-semibold">{r.label}: {r.name}</td>
                  <td className="py-2 text-right mono">{fmtK(r.totalGap)}</td>
                  <td className="py-2 text-right mono">{r.risk.toFixed(0)}</td>
                  <td className="py-2 text-right mono">{fmtK(r.reservesY5)}</td>
                  <td className="py-2 text-[#8ca0c0]">{r.tradeoff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                    </div>
                    {sc.description && (
                      <p className="text-[10px] text-[#4a6080]">{sc.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
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
    </div>
  );
}
