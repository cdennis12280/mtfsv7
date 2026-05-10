import React from 'react';
import { ArrowLeft, ArrowRight, Download, Play, RotateCcw, ShieldCheck, TimerReset } from 'lucide-react';
import { useMTFSStore } from '../store/mtfsStore';
import { CFO_DEMO_STEP_META, CFO_DEMO_STEPS, type CfoDemoStep } from '../utils/cfoDemo';
import { validateModel } from '../engine/validation';
import { exportCfoDemoBriefPdf } from '../utils/governancePdf';
import { y1 } from '../utils/yearProfile';

function fmtK(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}£${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`;
  return `${sign}£${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`;
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = max > 0 ? Math.max(6, Math.min(100, (Math.abs(value) / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-[#8ca0c0]">{label}</span>
        <span className="mono font-semibold text-[#f0f4ff]">{fmtK(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-[rgba(99,179,237,0.08)]">
        <div className="h-2 rounded-full" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

export function CfoDemoMode() {
  const {
    result,
    assumptions,
    baseline,
    authorityConfig,
    savingsProposals,
    scenarios,
    snapshots,
    auditTrail,
    assumptionHistory,
    workflowState,
    cfoDemo,
    exitCfoDemoMode,
    setCfoDemoStep,
    loadCfoDemoDataset,
    resetCfoDemoState,
    toggleCfoRehearsalItem,
    runEndToEndValidation,
    noteGovernanceExport,
  } = useMTFSStore();
  const [elapsed, setElapsed] = React.useState(0);
  const [calculationOpen, setCalculationOpen] = React.useState('gap');
  const stepIndex = CFO_DEMO_STEPS.indexOf(cfoDemo.step);
  const currentStep = CFO_DEMO_STEP_META[cfoDemo.step];
  const validation = validateModel({ authorityConfig, baseline, assumptions, result, savingsProposals, scenarios, snapshots, workflowState });

  React.useEffect(() => {
    const tick = () => {
      if (!cfoDemo.startedAt) {
        setElapsed(0);
        return;
      }
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(cfoDemo.startedAt).getTime()) / 1000)));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [cfoDemo.startedAt]);

  const elapsedText = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const y5 = result.years[4];
  const maxGap = Math.max(1, ...result.years.map((year) => Math.abs(year.rawGap)), ...result.years.map((year) => Math.abs(year.totalClosingReserves)));
  const driverRows = [
    { label: 'Council tax growth', value: result.years.reduce((sum, year) => sum + year.fundingBridge.deltas.councilTax, 0), color: '#10b981' },
    { label: 'Business rates', value: result.years.reduce((sum, year) => sum + year.fundingBridge.deltas.businessRates, 0), color: '#10b981' },
    { label: 'Grants', value: result.years.reduce((sum, year) => sum + year.fundingBridge.deltas.grants, 0), color: '#f59e0b' },
    { label: 'Fees and charges', value: result.years.reduce((sum, year) => sum + year.fundingBridge.deltas.otherFunding, 0), color: '#10b981' },
    { label: 'Pay pressure', value: result.years.reduce((sum, year) => sum + year.payInflationImpact, 0), color: '#ef4444' },
    { label: 'Non-pay inflation', value: result.years.reduce((sum, year) => sum + year.nonPayInflationImpact, 0), color: '#ef4444' },
    { label: 'ASC demand', value: result.years.reduce((sum, year) => sum + year.ascPressure, 0), color: '#ef4444' },
    { label: 'CSC demand', value: result.years.reduce((sum, year) => sum + year.cscPressure, 0), color: '#ef4444' },
    { label: 'Delivered savings', value: -result.years.reduce((sum, year) => sum + year.deliveredSavings, 0), color: '#3b82f6' },
    { label: 'Reserves drawdown', value: -result.years.reduce((sum, year) => sum + year.reservesDrawdown, 0), color: '#8b5cf6' },
  ];
  const maxDriver = Math.max(...driverRows.map((row) => Math.abs(row.value)), 1);
  const optionRows = [
    { name: 'Current Plan', source: scenarios.find((s) => s.name === 'Current Plan') },
    { name: 'Do Nothing', source: scenarios.find((s) => s.name === 'Do Nothing') },
    { name: 'Recommended Plan', source: scenarios.find((s) => s.name === 'Recommended Plan') },
    { name: 'Funding Shock', source: scenarios.find((s) => s.name === 'Funding Shock') },
  ].filter((row) => row.source);
  const recommended = optionRows.find((row) => row.name === 'Recommended Plan')?.source ?? optionRows[0]?.source;
  const risks = [...result.riskFactors].sort((a, b) => b.score - a.score).slice(0, 3);
  const actionList = [
    'Confirm the recommended scenario as the working MTFS base.',
    'Commission savings delivery assurance for amber proposals.',
    'Retain funding shock contingency and monitor grant settlement risk.',
  ];
  const rehearsalItems = [
    { id: 'dataset', label: 'Demo dataset loaded' },
    { id: 'scenarios', label: 'Four CFO scenarios visible' },
    { id: 'assurance', label: 'Readiness check reviewed' },
    { id: 'export', label: 'CFO brief export tested' },
    { id: 'timing', label: 'Walkthrough rehearsed under 10 minutes' },
  ];

  const exportBrief = () => {
    exportCfoDemoBriefPdf(result, assumptions, baseline, savingsProposals, authorityConfig);
    noteGovernanceExport('s151Pack');
    if (!cfoDemo.rehearsal.export) toggleCfoRehearsalItem('export');
  };

  const goStep = (direction: -1 | 1) => {
    const next = CFO_DEMO_STEPS[Math.max(0, Math.min(CFO_DEMO_STEPS.length - 1, stepIndex + direction))];
    setCfoDemoStep(next);
  };

  const stepBody: Record<CfoDemoStep, React.ReactNode> = {
    position: (
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.78)] p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">CFO landing summary</p>
          <h1 className="mt-2 text-[30px] font-bold text-[#f0f4ff]">The MTFS needs {fmtK(result.requiredSavingsToBalance)} average annual action to restore resilience.</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[#8ca0c0]">
            {authorityConfig.authorityName} is modelled with a five-year gap of {fmtK(result.totalGap)}, a structural gap of {fmtK(result.totalStructuralGap)}, Year 5 reserves of {fmtK(y5?.totalClosingReserves ?? 0)}, and risk score {result.overallRiskScore.toFixed(0)}/100.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {result.years.map((year) => (
              <div key={year.label} className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.5)] p-3">
                <p className="text-[10px] font-semibold text-[#8ca0c0]">{year.label}</p>
                <p className="mono mt-2 text-[15px] font-bold text-[#f0f4ff]">{fmtK(year.rawGap)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[rgba(99,179,237,0.08)]">
                  <div className="h-1.5 rounded-full bg-[#3b82f6]" style={{ width: `${Math.min(100, (Math.abs(year.rawGap) / maxGap) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.07)] p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#f59e0b]">So what?</p>
          <p className="mt-2 text-[18px] font-bold text-[#f0f4ff]">Leadership decision required: choose the working scenario and lock delivery governance.</p>
          <p className="mt-3 text-[12px] leading-relaxed text-[#d6c49c]">The app turns the finance conversation from “what is the gap?” into “which option are we prepared to own, what risks remain, and what evidence supports the pack?”</p>
          <div className="mt-4 rounded-lg border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] p-3">
            <p className="text-[10px] uppercase tracking-widest text-[#10b981]">Model confidence</p>
            <p className="mono mt-1 text-[22px] font-bold text-[#10b981]">{validation.modelConfidenceScore}/100</p>
            <p className="mt-1 text-[11px] text-[#8ca0c0]">{validation.blockers.length} blockers · {validation.warnings.length} warnings · {snapshots.length} snapshot(s)</p>
          </div>
        </section>
      </div>
    ),
    drivers: (
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.78)] p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Gap driver waterfall</p>
          <div className="mt-4 space-y-3">{driverRows.map((row) => <Bar key={row.label} {...row} max={maxDriver} />)}</div>
        </section>
        <section className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.78)] p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Bridge views</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] p-3">
              <p className="text-[12px] font-semibold text-[#f0f4ff]">Funding bridge</p>
              <p className="mt-1 text-[11px] text-[#8ca0c0]">Council tax {fmtK(driverRows[0].value)}, business rates {fmtK(driverRows[1].value)}, grants {fmtK(driverRows[2].value)}, fees {fmtK(driverRows[3].value)}.</p>
            </div>
            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] p-3">
              <p className="text-[12px] font-semibold text-[#f0f4ff]">Expenditure pressure bridge</p>
              <p className="mt-1 text-[11px] text-[#8ca0c0]">Pay {fmtK(driverRows[4].value)}, non-pay {fmtK(driverRows[5].value)}, ASC {fmtK(driverRows[6].value)}, CSC {fmtK(driverRows[7].value)}.</p>
            </div>
            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] p-3">
              <p className="text-[12px] font-semibold text-[#f0f4ff]">Reserves bridge</p>
              <p className="mt-1 text-[11px] text-[#8ca0c0]">Opening reserves {fmtK(result.years[0]?.totalOpeningReserves ?? 0)}, drawdown {fmtK(result.years.reduce((s, y) => s + y.reservesDrawdown, 0))}, Year 5 close {fmtK(y5?.totalClosingReserves ?? 0)}.</p>
            </div>
            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] p-3">
              <p className="text-[12px] font-semibold text-[#f0f4ff]">Savings delivery bridge</p>
              <p className="mt-1 text-[11px] text-[#8ca0c0]">Target Y1 {fmtK(y1(assumptions.policy.annualSavingsTarget))}, risk-adjusted delivery {fmtK(result.years.reduce((s, y) => s + y.deliveredSavings, 0))}, residual gap {fmtK(result.totalGap)}.</p>
            </div>
          </div>
        </section>
      </div>
    ),
    options: (
      <section className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.78)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">CFO scenario comparison</p>
            <h2 className="mt-2 text-[20px] font-bold text-[#f0f4ff]">Recommended Plan gives the cleanest trade-off between affordability, reserves and deliverability.</h2>
          </div>
          <div className="rounded-lg border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] px-3 py-2 text-[11px] text-[#10b981]">
            Recommendation: {recommended?.name ?? 'Load demo dataset'}
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="text-[#8ca0c0]">
              <tr><th className="py-2">Option</th><th>Gap</th><th>Savings needed</th><th>Y5 reserves</th><th>Risk</th><th>Deliverability</th></tr>
            </thead>
            <tbody>
              {optionRows.map(({ name, source }) => source && (
                <tr key={name} className="border-t border-[rgba(99,179,237,0.1)]">
                  <td className="py-3 font-semibold text-[#f0f4ff]">{name}<p className="mt-1 text-[10px] font-normal text-[#8ca0c0]">{source.description}</p></td>
                  <td className="mono text-[#f0f4ff]">{fmtK(source.result.totalGap)}</td>
                  <td className="mono text-[#f0f4ff]">{fmtK(source.result.requiredSavingsToBalance)}</td>
                  <td className="mono text-[#f0f4ff]">{fmtK(source.result.years[4]?.totalClosingReserves ?? 0)}</td>
                  <td className="mono text-[#f0f4ff]">{source.result.overallRiskScore.toFixed(0)}/100</td>
                  <td className="text-[#8ca0c0]">{source.result.savingsAsBudgetPct > 8 ? 'Stretch' : 'Manageable'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    ),
    assurance: (
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.78)] p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Head of Finance risks</p>
          <div className="mt-4 space-y-3">{risks.map((risk, idx) => (
            <div key={risk.name} className="rounded-lg border border-[rgba(99,179,237,0.12)] p-3">
              <p className="text-[12px] font-semibold text-[#f0f4ff]">{idx + 1}. {risk.name}</p>
              <p className="mt-1 text-[11px] text-[#8ca0c0]">{risk.score}/100 · {risk.level.toUpperCase()} · {risk.description}</p>
            </div>
          ))}</div>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-[#8ca0c0]">Top actions before Cabinet</p>
          <ol className="mt-2 space-y-2 text-[12px] text-[#cbd5e1]">{actionList.map((a) => <li key={a}>{a}</li>)}</ol>
        </section>
        <section className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.78)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Assurance drawer</p>
            <button onClick={() => runEndToEndValidation()} className="rounded-lg border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)] px-3 py-1.5 text-[10px] font-semibold text-[#93c5fd]">Run readiness</button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {[
              ['Audit trail', `${auditTrail.length} model run entries`],
              ['Assumption history', `${assumptionHistory.length} saved versions`],
              ['Validation', `${validation.blockers.length} blockers / ${validation.warnings.length} warnings`],
              ['Calculation trace', 'Visible for each headline KPI'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[rgba(99,179,237,0.12)] p-3">
                <p className="text-[10px] uppercase tracking-widest text-[#4a6080]">{label}</p>
                <p className="mt-1 text-[13px] font-semibold text-[#f0f4ff]">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-[rgba(99,179,237,0.12)] p-3">
            <p className="text-[12px] font-semibold text-[#f0f4ff]">Show me the calculation</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ['gap', 'Gap'],
                ['reserves', 'Reserves'],
                ['savings', 'Savings'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setCalculationOpen(id)} className={`rounded px-2 py-1 text-[10px] ${calculationOpen === id ? 'bg-[#3b82f6] text-white' : 'bg-[rgba(99,179,237,0.08)] text-[#8ca0c0]'}`}>{label}</button>
              ))}
            </div>
            <p className="mt-3 mono text-[11px] text-[#cbd5e1]">
              {calculationOpen === 'gap' && `raw gap = total expenditure - total funding; five-year positive gap = ${fmtK(result.totalGap)}.`}
              {calculationOpen === 'reserves' && `drawdown = min(raw gap, planned reserve use); Year 5 closing reserves = ${fmtK(y5?.totalClosingReserves ?? 0)}.`}
              {calculationOpen === 'savings' && `delivered savings = proposal value x phasing x achievement rate; cumulative delivery = ${fmtK(result.years.reduce((s, y) => s + y.deliveredSavings, 0))}.`}
            </p>
          </div>
        </section>
      </div>
    ),
    export: (
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.78)] p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Demo-ready export</p>
          <h2 className="mt-2 text-[22px] font-bold text-[#f0f4ff]">Finish with the CFO brief: one page of position, options, risks and assurance.</h2>
          <button onClick={exportBrief} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] px-4 py-3 text-[12px] font-bold text-[#10b981]">
            <Download size={15} /> Export CFO Brief PDF
          </button>
        </section>
        <section className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.78)] p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Rehearsal checklist</p>
          <div className="mt-4 space-y-2">
            {rehearsalItems.map((item) => (
              <button key={item.id} onClick={() => toggleCfoRehearsalItem(item.id)} className="flex w-full items-center justify-between rounded-lg border border-[rgba(99,179,237,0.12)] px-3 py-2 text-left text-[12px] text-[#cbd5e1]">
                {item.label}
                <span className={cfoDemo.rehearsal[item.id] ? 'text-[#10b981]' : 'text-[#4a6080]'}>{cfoDemo.rehearsal[item.id] ? 'Ready' : 'Check'}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    ),
  };

  return (
    <div className="cfo-demo-shell space-y-4">
      <div className="rounded-xl border border-[rgba(99,179,237,0.18)] bg-[#0a1120] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#60a5fa]">10-minute CFO / Head of Finance walkthrough</p>
            <h2 className="mt-1 text-[20px] font-bold text-[#f0f4ff]">MTFS Financial Resilience Studio</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 mono text-[12px] font-bold ${elapsed > 600 ? 'border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] text-[#ef4444]' : 'border-[rgba(16,185,129,0.28)] bg-[rgba(16,185,129,0.1)] text-[#10b981]'}`}>
              <TimerReset size={13} /> {elapsedText} / 10:00
            </span>
            <button onClick={loadCfoDemoDataset} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(59,130,246,0.32)] bg-[rgba(59,130,246,0.12)] px-3 py-2 text-[11px] font-semibold text-[#93c5fd]"><Play size={13} /> Load CFO Demo Dataset</button>
            <button onClick={resetCfoDemoState} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.1)] px-3 py-2 text-[11px] font-semibold text-[#f59e0b]"><RotateCcw size={13} /> Return to Demo Start</button>
            <button onClick={exitCfoDemoMode} className="rounded-lg border border-[rgba(99,179,237,0.2)] px-3 py-2 text-[11px] font-semibold text-[#8ca0c0]">Exit Demo</button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {CFO_DEMO_STEPS.map((step) => (
            <button key={step} onClick={() => setCfoDemoStep(step)} className={`rounded-lg border px-3 py-2 text-left ${step === cfoDemo.step ? 'border-[#3b82f6] bg-[rgba(59,130,246,0.16)]' : 'border-[rgba(99,179,237,0.12)] bg-[rgba(99,179,237,0.04)]'}`}>
              <span className="block text-[10px] font-bold text-[#f0f4ff]">{CFO_DEMO_STEP_META[step].label}</span>
              <span className="block text-[9px] text-[#8ca0c0]">{CFO_DEMO_STEP_META[step].minutes}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.5)] p-3">
          <p className="text-[10px] uppercase tracking-widest text-[#4a6080]">Speaker note</p>
          <p className="mt-1 text-[12px] text-[#cbd5e1]">{currentStep.note}</p>
        </div>
      </div>
      {stepBody[cfoDemo.step]}
      <div className="flex items-center justify-between">
        <button disabled={stepIndex === 0} onClick={() => goStep(-1)} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(99,179,237,0.18)] px-3 py-2 text-[11px] font-semibold text-[#8ca0c0] disabled:opacity-40"><ArrowLeft size={13} /> Previous</button>
        <div className="flex items-center gap-2 text-[10px] text-[#8ca0c0]"><ShieldCheck size={13} /> Demo mode keeps normal app data model and calculation engine.</div>
        <button disabled={stepIndex === CFO_DEMO_STEPS.length - 1} onClick={() => goStep(1)} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)] px-3 py-2 text-[11px] font-semibold text-[#93c5fd] disabled:opacity-40">Next <ArrowRight size={13} /></button>
      </div>
    </div>
  );
}
