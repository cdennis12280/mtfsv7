import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, LabelList
} from 'recharts';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { InsightsPanel } from './InsightsPanel';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { runCalculations } from '../../engine/calculations';
import { RichTooltip } from '../ui/RichTooltip';
import { makeYearProfile } from '../../utils/yearProfile';

function fmtK(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${sign}£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

interface TooltipPoint {
  color?: string;
  name?: string | number;
  value?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPoint[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[#1a2540] border border-[rgba(99,179,237,0.2)] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-[#8ca0c0] font-semibold mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[#8ca0c0]">{p.name}</span>
          </div>
          <span className="mono font-semibold text-[#f0f4ff]">{fmtK(Number(p.value) || 0)}</span>
        </div>
      ))}
    </div>
  );
};

export function OverviewPanel() {
  const { result, assumptions, baseline, audienceMode, peerBenchmark } = useMTFSStore();
  const { years } = result;
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);

  const areaData = years.map((y) => ({
    year: y.label,
    Funding: Math.round(y.totalFunding),
    Expenditure: Math.round(y.totalExpenditure),
  }));

  const gapData = years.map((y) => ({
    year: y.label,
    gap: Math.round(y.rawGap),
  }));

  const reservesData = years.map((y) => ({
    year: y.label,
    Reserves: Math.round(y.totalClosingReserves),
  }));
  const peerReservesFloor = peerBenchmark.enabled
    ? ((years[4]?.totalFunding ?? 0) * peerBenchmark.peerMedianReservesToBudget) / 100
    : 0;

  const doNothingResult = useMemo(() => {
    const withoutMitigationAssumptions = {
      ...assumptions,
      policy: {
        ...assumptions.policy,
        annualSavingsTarget: makeYearProfile(0),
        reservesUsage: makeYearProfile(0),
      },
      expenditure: {
        ...assumptions.expenditure,
        savingsDeliveryRisk: makeYearProfile(100),
      },
    };
    return runCalculations(withoutMitigationAssumptions, baseline, []);
  }, [assumptions, baseline]);
  const doNothingDelta = doNothingResult.totalGap - result.totalGap;
  const year5Reserves = result.years[4]?.totalClosingReserves ?? 0;
  const riskLabel = result.overallRiskScore >= 75
    ? 'Critical'
    : result.overallRiskScore >= 60
      ? 'High'
      : result.overallRiskScore >= 40
        ? 'Medium'
        : 'Low';

  const yearStory = years.map((y, index) => {
    const safetyPct = y.totalFunding > 0 ? (y.totalClosingReserves / y.totalFunding) * 100 : 0;
    const state = y.rawGap <= 0
      ? 'green'
      : (y.rawGap <= 3000 && safetyPct >= 5 ? 'amber' : 'red');
    const reason = y.rawGap <= 0
      ? 'Funding covers costs in this year.'
      : y.reservesBelowThreshold
        ? 'Shortfall plus low reserves buffer.'
        : y.structuralDeficit
          ? 'Ongoing gap remains after recurring savings.'
          : 'Shortfall is currently manageable with mitigations.';

    const labels = ['Green', 'Amber', 'Red'];
    const colors = ['#10b981', '#f59e0b', '#ef4444'];
    const activeIdx = state === 'green' ? 0 : state === 'amber' ? 1 : 2;

    return {
      key: y.label,
      year: y.label,
      reason,
      activeIdx,
      labels,
      colors,
      value: y.rawGap,
      baselineGap: doNothingResult.years[index]?.rawGap ?? 0,
    };
  });

  const executiveNarrative = useMemo(() => {
    const bullets: string[] = [];
    const gapText = result.totalGap <= 0 ? 'balanced/surplus' : `shortfall of ${fmtK(result.totalGap)}`;
    bullets.push(`5-year position: ${gapText}.`);
    bullets.push(`Mitigations vs do-nothing: ${fmtK(doNothingDelta)} improvement.`);
    bullets.push(`Reserves outlook: ${fmtK(year5Reserves)} closing balance (Year 5).`);
    if (result.overallRiskScore >= 60) {
      bullets.push(`Risk is elevated (${riskLabel}, ${result.overallRiskScore.toFixed(0)}/100); additional mitigation assurance is recommended.`);
    } else if (result.totalGap > 0) {
      bullets.push(`Residual affordability pressure remains; recurring savings of ${fmtK(result.requiredSavingsToBalance)} should be prioritised.`);
    } else {
      bullets.push(`Current plan is broadly on track; focus should shift to delivery control and resilience monitoring.`);
    }
    return bullets;
  }, [result.totalGap, doNothingDelta, year5Reserves, result.overallRiskScore, riskLabel, result.requiredSavingsToBalance]);

  const glossary = [
    {
      term: 'Structural deficit',
      definition: 'An ongoing yearly gap where recurring costs stay above recurring funding.',
    },
    {
      term: 'Reserves buffer',
      definition: 'Available one-off balances held to absorb shocks and timing differences.',
    },
    {
      term: 'Do nothing',
      definition: 'Comparison scenario with no savings programme and no planned reserves use.',
    },
    {
      term: 'Council tax equivalent',
      definition: 'The percentage council tax rise needed to close the Year 1 gap on its own.',
    },
  ];

  const topRisks = useMemo(
    () => [...result.riskFactors].sort((a, b) => b.score - a.score).slice(0, 3),
    [result.riskFactors]
  );

  return (
    <div className="layout-grid-12">
      {/* Left: Charts */}
      <div className="layout-span-8 space-y-4">
        <div className="section-frame">
        <Card className="bg-[rgba(16,185,129,0.06)] border-[rgba(16,185,129,0.22)]">
          <div className="p-3">
            <p className="text-[10px] uppercase tracking-widest text-[#10b981] font-semibold">
              {audienceMode === 'members' ? 'Elected Member Summary' : 'Finance Summary'}
            </p>
            <ul className="mt-2 space-y-1">
              {executiveNarrative.map((line) => (
                <li key={line} className="text-[12px] text-[#f0f4ff] leading-relaxed">• {line}</li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="section-frame-divider" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Card className="bg-[rgba(59,130,246,0.08)]">
            <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">What Changed</p>
            <p className="text-[11px] text-[#8ca0c0] mt-1">
              Gap delta vs do-nothing: <span className="mono text-[#3b82f6] font-semibold">{fmtK(doNothingDelta)}</span>
            </p>
          </Card>
          <Card className="bg-[rgba(245,158,11,0.08)]">
            <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Decision Needed</p>
            <p className="text-[11px] text-[#8ca0c0] mt-1">
              Action requirement: <span className="mono text-[#f59e0b] font-semibold">{fmtK(result.requiredSavingsToBalance)}</span>
            </p>
          </Card>
          <Card className="bg-[rgba(239,68,68,0.08)]">
            <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Risk Focus</p>
            <p className="text-[11px] text-[#8ca0c0] mt-1">
              Current risk score: <span className="mono text-[#ef4444] font-semibold">{result.overallRiskScore.toFixed(0)}/100</span>
            </p>
          </Card>
        </div>

        <div className="section-frame-divider" />

        <Card className="bg-[rgba(59,130,246,0.04)] border-[rgba(59,130,246,0.18)]">
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <CardTitle>Top Risks</CardTitle>
              <RichTooltip content="Highest current risk drivers based on the live risk engine." />
            </div>
          </CardHeader>
          <div className="rounded-lg bg-[#080c14] border border-[rgba(99,179,237,0.12)] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[#4a6080] mb-2">Top 3 Risks</p>
            <ul className="space-y-2">
              {topRisks.map((risk) => (
                <li key={risk.name} className="text-[11px] text-[#8ca0c0]">
                  <span className="text-[#f0f4ff] font-semibold">{risk.name}</span> ({risk.score.toFixed(0)})
                  <span className="block text-[10px] text-[#4a6080] mt-0.5">{risk.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        </div>

        {/* Status strip */}
        <div className="section-frame">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {years.map((y) => {
            const ok = y.rawGap <= 0;
            const color = ok ? '#10b981' : '#ef4444';
            return (
              <div
                key={y.year}
                className="rounded-xl p-3 text-center"
                style={{ background: `${color}08`, border: `1px solid ${color}25` }}
              >
                <p className="text-[9px] text-[#4a6080] mb-1">{y.label}</p>
                <p className="mono text-[12px] font-bold" style={{ color }}>
                  {ok ? fmtK(Math.abs(y.rawGap)) : fmtK(y.rawGap)}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {ok
                    ? <CheckCircle size={9} style={{ color }} />
                    : <AlertTriangle size={9} style={{ color }} />
                  }
                  <span className="text-[8px]" style={{ color }}>{ok ? 'surplus' : 'deficit'}</span>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <div className="section-frame">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <CardTitle>Traffic-Light Storyboard (with reasons)</CardTitle>
              <RichTooltip content="Year-by-year RAG status with plain-English reasoning based on gap and reserves resilience." />
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
            {yearStory.map((row) => (
              <div key={row.key} className="rounded-lg p-2 bg-[#080c14] border border-[rgba(99,179,237,0.12)]">
                <p className="text-[10px] text-[#8ca0c0] mb-2">{row.year}</p>
                <div className="flex gap-1 mb-2">
                  {row.labels.map((label, i) => (
                    <div
                      key={label}
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                      style={{
                        background: i === row.activeIdx ? `${row.colors[i]}22` : 'rgba(99,179,237,0.07)',
                        border: `1px solid ${i === row.activeIdx ? `${row.colors[i]}66` : 'rgba(99,179,237,0.12)'}`,
                        color: i === row.activeIdx ? row.colors[i] : '#4a6080',
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-[#8ca0c0] leading-relaxed">{row.reason}</p>
              </div>
            ))}
          </div>
        </Card>
        </div>

        <div className="section-frame">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <CardTitle>If We Do Nothing</CardTitle>
              <RichTooltip content="Counterfactual view with no savings programme and no planned reserves use." />
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg bg-[#080c14] p-3 border border-[rgba(99,179,237,0.12)]">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Current Plan Gap</p>
              <p className="mono text-[14px] font-bold text-[#f59e0b] mt-1">{fmtK(result.totalGap)}</p>
            </div>
            <div className="rounded-lg bg-[#080c14] p-3 border border-[rgba(99,179,237,0.12)]">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Do-Nothing Gap</p>
              <p className="mono text-[14px] font-bold text-[#ef4444] mt-1">{fmtK(doNothingResult.totalGap)}</p>
            </div>
            <div className="rounded-lg bg-[#080c14] p-3 border border-[rgba(99,179,237,0.12)]">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Mitigation Effect</p>
              <p className="mono text-[14px] font-bold text-[#10b981] mt-1">
                {fmtK(doNothingResult.totalGap - result.totalGap)}
              </p>
            </div>
          </div>
        </Card>
        </div>

        {/* Funding vs Expenditure */}
        <div className="section-frame">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <CardTitle>Funding vs Expenditure</CardTitle>
              <RichTooltip content="Compares income and spend trajectories. Persistent divergence indicates structural pressure." />
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#3b82f6] rounded" />
                <span className="text-[9px] text-[#4a6080]">Funding</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#ef4444] rounded" />
                <span className="text-[9px] text-[#4a6080]">Expenditure</span>
              </div>
            </div>
          </CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovGradF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="ovGradE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" />
                <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `£${(v / 1000).toLocaleString('en-GB', { maximumFractionDigits: 0 })}m`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Funding" stroke="#3b82f6" strokeWidth={2.5}
                  fill="url(#ovGradF)" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Expenditure" stroke="#ef4444" strokeWidth={2.5}
                  fill="url(#ovGradE)" dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Gap bar */}
          <div className="section-frame">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <CardTitle>Annual Budget Gap</CardTitle>
                <RichTooltip content="Positive bars indicate deficits requiring mitigations; negative bars indicate surplus." />
              </div>
            </CardHeader>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`} />
                <Tooltip
                    contentStyle={{ background: '#1a2540', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#8ca0c0' }}
                    formatter={(v: unknown) => [fmtK(v as number), 'Gap']}
                />
                <ReferenceArea
                  y1={Math.min(...gapData.map((d) => d.gap), 0)}
                  y2={0}
                  fill="rgba(16,185,129,0.05)"
                />
                <ReferenceArea
                  y1={0}
                  y2={Math.max(...gapData.map((d) => d.gap), 0)}
                  fill="rgba(239,68,68,0.05)"
                />
                <ReferenceLine y={0} stroke="rgba(99,179,237,0.3)" strokeDasharray="4 4" />
                <Bar dataKey="gap" name="Gap" fill="#ef4444" fillOpacity={0.8} radius={[3, 3, 0, 0]}>
                  {gapData.map((entry, i) => (
                    <rect key={i} fill={entry.gap > 0 ? '#ef4444' : '#10b981'} />
                  ))}
                  <LabelList dataKey="gap" position="top" formatter={(v: unknown) => fmtK(Number(v) || 0)} fill="#8ca0c0" fontSize={9} />
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          </div>

          {/* Reserves area */}
          <div className="section-frame">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <CardTitle>Reserves Depletion</CardTitle>
                <RichTooltip content="Shows closing reserves over time versus expected usage and pressure." />
              </div>
            </CardHeader>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reservesData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ovGradR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" />
                  <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `£${(v / 1000).toLocaleString('en-GB', { maximumFractionDigits: 0 })}m`} />
                  <Tooltip
                    contentStyle={{ background: '#1a2540', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#8ca0c0' }}
                    formatter={(v: unknown) => [fmtK(v as number), 'Reserves']}
                  />
                  {peerBenchmark.enabled && (
                    <ReferenceLine
                      y={peerReservesFloor}
                      stroke="#06b6d4"
                      strokeDasharray="4 4"
                      label={{ value: 'Peer median reserves (Y5 equiv)', fill: '#06b6d4', fontSize: 9, position: 'insideTopRight' }}
                    />
                  )}
                  <Area type="monotone" dataKey="Reserves" stroke="#8b5cf6" strokeWidth={2}
                    fill="url(#ovGradR)" dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }}>
                    <LabelList dataKey="Reserves" position="top" formatter={(v: unknown) => fmtK(Number(v) || 0)} fill="#8ca0c0" fontSize={9} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          </div>
        </div>

        <div className="section-frame">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <CardTitle>Interactive Glossary</CardTitle>
              <RichTooltip content="Hover or focus terms to reveal plain-English financial definitions." />
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {glossary.map((item) => (
              <button
                key={item.term}
                className="text-left rounded-lg px-3 py-2 bg-[#080c14] border border-[rgba(99,179,237,0.12)] hover:border-[rgba(59,130,246,0.3)] transition-colors"
                title={`${item.term}: ${item.definition}`}
                onMouseEnter={() => setActiveGlossaryTerm(item.term)}
                onFocus={() => setActiveGlossaryTerm(item.term)}
                onMouseLeave={() => setActiveGlossaryTerm((t) => (t === item.term ? null : t))}
                onBlur={() => setActiveGlossaryTerm((t) => (t === item.term ? null : t))}
                type="button"
              >
                <p className="text-[11px] text-[#f0f4ff] font-semibold">{item.term}</p>
                <p className="text-[10px] text-[#4a6080] mt-1">
                  {activeGlossaryTerm === item.term ? item.definition : 'Hover to show plain-English definition'}
                </p>
              </button>
            ))}
          </div>
        </Card>
        </div>
      </div>

      {/* Right: Insights */}
      <div className="layout-span-4 section-frame space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#4a6080] px-1">Live Insights</div>
        <InsightsPanel />
      </div>
    </div>
  );
}
