import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { RiskBadge } from '../ui/Badge';
import { AlertTriangle, Shield, Activity } from 'lucide-react';
import { computeSensitivity, computeMonteCarlo } from '../../engine/calculations';
import { DEFAULT_BASELINE } from '../../engine/calculations';

function fmtK(v: number) {
  const sign = v > 0 ? '+' : '';
  const abs = Math.abs(v);
  return `${sign}${v < 0 ? '-' : ''}£${abs >= 1000 ? `${(abs / 1000).toFixed(1)}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#ef4444',
};

export function RiskAssessment() {
  const { result, assumptions, baseline, savingsProposals, peerBenchmark, setPeerBenchmark, authorityConfig } = useMTFSStore();
  const { riskFactors, overallRiskScore, years } = result;

  const radarData = riskFactors.map((f) => ({
    subject: f.name.split(' ')[0],
    score: f.score,
  }));

  const sensitivityData = computeSensitivity(assumptions, baseline || DEFAULT_BASELINE);
  const monteCarlo = React.useMemo(
    () => computeMonteCarlo(assumptions, baseline || DEFAULT_BASELINE, savingsProposals, 1500),
    [assumptions, baseline, savingsProposals]
  );

  const overallLevel = overallRiskScore >= 65 ? 'critical' : overallRiskScore >= 45 ? 'high' : overallRiskScore >= 25 ? 'medium' : 'low';
  const overallColor = RISK_COLORS[overallLevel];
  const population = Math.max(1, authorityConfig.population || 1);
  const year5 = years[4] ?? years[years.length - 1];
  const currentNetExpPerCapita = year5 ? (year5.totalExpenditure * 1000) / population : 0;
  const currentSavingsDeliveryRate = Math.max(0, Math.min(100, assumptions.expenditure.savingsDeliveryRisk));
  const debtToRevenuePct = baseline?.treasuryIndicators.enabled
    ? ((baseline.treasuryIndicators.netFinancingNeed / Math.max(1, year5?.totalFunding ?? 1)) * 100)
    : 0;
  const debtBurdenLevel = debtToRevenuePct > 170 ? 'critical' : debtToRevenuePct > 140 ? 'warning' : 'good';
  const liquidityHeadroomPct = baseline?.treasuryIndicators.enabled
    ? (((baseline.treasuryIndicators.operationalBoundary - baseline.treasuryIndicators.netFinancingNeed) / Math.max(1, baseline.treasuryIndicators.operationalBoundary)) * 100)
    : 0;
  const liquidityLevel = liquidityHeadroomPct < 0 ? 'critical' : liquidityHeadroomPct < 8 ? 'warning' : 'good';

  const sustainabilityChecks = [
    {
      label: 'Structural Deficit Test',
      pass: !years.some((y) => y.structuralDeficit),
      detail: years.some((y) => y.structuralDeficit)
        ? 'Structural deficit identified in one or more years'
        : 'No structural deficit detected',
    },
    {
      label: 'Reserves Adequacy Test',
      pass: !years.some((y) => y.reservesBelowThreshold),
      detail: years.some((y) => y.reservesBelowThreshold)
        ? 'Reserves fall below minimum threshold in one or more years'
        : 'Reserves maintained above minimum threshold',
    },
    {
      label: 'Savings Realism Test',
      pass: !years.some((y) => y.unrealisticSavings),
      detail: years.some((y) => y.unrealisticSavings)
        ? 'Savings target exceeds 8% of expenditure — delivery risk is high'
        : 'Savings target is within realistic delivery range',
    },
    {
      label: 'Over-Reliance on Reserves',
      pass: !years.some((y) => y.overReliantOnReserves),
      detail: years.some((y) => y.overReliantOnReserves)
        ? 'Reserves usage exceeds 5% of net budget — unsustainable pattern'
        : 'Reserves usage is within acceptable limits',
    },
    {
      label: 'Funding Stability',
      pass: assumptions.funding.grantVariation > -3,
      detail: assumptions.funding.grantVariation <= -3
        ? `Grant reduction of ${assumptions.funding.grantVariation}% creates material funding risk`
        : 'Funding assumptions appear stable',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Overall Risk Banner */}
      <div
        className="rounded-xl p-4 border"
        style={{
          background: `${overallColor}10`,
          borderColor: `${overallColor}30`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={20} style={{ color: overallColor }} />
            <div>
              <p className="text-xs text-[#8ca0c0] uppercase tracking-widest font-semibold">Overall Financial Risk</p>
              <p className="text-2xl font-bold" style={{ color: overallColor }}>
                {overallLevel.toUpperCase()} — {overallRiskScore.toFixed(0)}/100
              </p>
            </div>
          </div>
          <div className="w-32 h-2 bg-[rgba(99,179,237,0.08)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${overallRiskScore}%`,
                background: `linear-gradient(90deg, #10b981, ${overallColor})`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Risk Factor Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Factor Analysis</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {riskFactors.map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#8ca0c0]">{f.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="mono text-[11px] font-semibold" style={{ color: RISK_COLORS[f.level] }}>
                      {f.score}
                    </span>
                    <RiskBadge level={f.level} />
                  </div>
                </div>
                <div className="h-1.5 bg-[rgba(99,179,237,0.08)] rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${f.score}%`,
                      background: RISK_COLORS[f.level],
                      opacity: 0.85,
                    }}
                  />
                </div>
                <p className="text-[10px] text-[#4a6080]">{f.description}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Profile Radar</CardTitle>
          </CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(99,179,237,0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#8ca0c0', fontSize: 10 }}
                />
                <Radar
                  name="Risk Score"
                  dataKey="score"
                  stroke={overallColor}
                  fill={overallColor}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: overallColor }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Sustainability Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Statutory Sustainability Tests</CardTitle>
          <span className="text-[10px] text-[#4a6080]">CIPFA-aligned framework</span>
        </CardHeader>
        <div className="space-y-2">
          {sustainabilityChecks.map((check, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{
                background: check.pass ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                border: `1px solid ${check.pass ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
              }}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  check.pass ? 'bg-[rgba(16,185,129,0.2)]' : 'bg-[rgba(239,68,68,0.2)]'
                }`}
              >
                {check.pass
                  ? <Shield size={10} className="text-[#10b981]" />
                  : <AlertTriangle size={10} className="text-[#ef4444]" />
                }
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#f0f4ff]">{check.label}</p>
                <p className="text-[10px] text-[#8ca0c0] mt-0.5">{check.detail}</p>
              </div>
              <span
                className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded ${
                  check.pass
                    ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                    : 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                }`}
              >
                {check.pass ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Sensitivity Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Analysis</CardTitle>
          <span className="text-[10px] text-[#4a6080]">Impact on budget gap (£000s)</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full premium-table text-[11px]">
            <thead>
              <tr className="border-b border-[rgba(99,179,237,0.08)]">
                <th className="text-left py-2 text-[#4a6080] font-semibold pr-4">Driver</th>
                <th className="text-center py-2 text-[#4a6080] font-semibold px-2">Change</th>
                <th className="text-right py-2 text-[#4a6080] font-semibold px-2">Year 1</th>
                <th className="text-right py-2 text-[#4a6080] font-semibold px-2">Year 3</th>
                <th className="text-right py-2 text-[#4a6080] font-semibold">Year 5</th>
              </tr>
            </thead>
            <tbody>
              {sensitivityData.map((row, i) => {
                const y5Color = row.year5Impact > 0
                  ? (row.direction === 'negative' ? '#ef4444' : '#10b981')
                  : (row.direction === 'negative' ? '#10b981' : '#ef4444');
                return (
                  <tr key={i} className="border-b border-[rgba(99,179,237,0.04)] hover:bg-[rgba(99,179,237,0.02)]">
                    <td className="py-2 text-[#f0f4ff] font-medium pr-4">{row.driver}</td>
                    <td className="py-2 text-center mono text-[#8b5cf6] px-2">{row.change}</td>
                    <td className="py-2 text-right mono text-[#8ca0c0] px-2">
                      {row.year1Impact !== 0 ? fmtK(row.year1Impact) : '—'}
                    </td>
                    <td className="py-2 text-right mono text-[#8ca0c0] px-2">
                      {row.year3Impact !== 0 ? fmtK(row.year3Impact) : '—'}
                    </td>
                    <td className="py-2 text-right mono font-semibold" style={{ color: y5Color }}>
                      {row.year5Impact !== 0 ? fmtK(row.year5Impact) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-[#4a6080] mt-3 leading-relaxed">
          Each row shows the change in budget gap when a single driver is perturbed, holding all other assumptions constant.
          Positive values indicate a worsening (larger) gap; negative values indicate improvement.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Monte Carlo Simulation</CardTitle>
            <span className="text-[10px] text-[#4a6080]">{monteCarlo.iterations} runs</span>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Deficit Probability', `${monteCarlo.deficitProbability.toFixed(1)}%`, '#ef4444'],
              ['Reserves Breach Probability', `${monteCarlo.reservesBreachProbability.toFixed(1)}%`, '#f59e0b'],
              ['s114 Trigger Probability', `${monteCarlo.s114Probability.toFixed(1)}%`, '#ef4444'],
              ['Median 5yr Gap (P50)', fmtK(monteCarlo.gapP50), '#3b82f6'],
              ['P10 Gap', fmtK(monteCarlo.gapP10), '#10b981'],
              ['P90 Gap', fmtK(monteCarlo.gapP90), '#ef4444'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="rounded-lg border border-[rgba(99,179,237,0.1)] bg-[#080c14] p-2.5">
                <p className="text-[9px] text-[#4a6080] uppercase tracking-widest">{label}</p>
                <p className="mono text-[13px] font-bold mt-1" style={{ color: color as string }}>{value as string}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-[#4a6080] mt-2">
            Stochastic perturbation of key funding and demand assumptions to estimate probability distribution of outcomes.
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peer Benchmark Overlay</CardTitle>
            <span className="text-[10px] text-[#4a6080]">CIPFA/peer inputs</span>
          </CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]">
              <input type="checkbox" checked={peerBenchmark.enabled} onChange={(e) => setPeerBenchmark({ enabled: e.target.checked })} />
              Enable peer overlays
            </label>
              <input
                className="input"
                value={peerBenchmark.sourceLabel}
                onChange={(e) => setPeerBenchmark({ sourceLabel: e.target.value })}
                placeholder="Benchmark source label"
              />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-[#4a6080] mb-1">Peer Median Reserves %</p>
                <input className="input" type="number" value={peerBenchmark.peerMedianReservesToBudget} onChange={(e) => setPeerBenchmark({ peerMedianReservesToBudget: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <p className="text-[10px] text-[#4a6080] mb-1">Peer Gap % of Funding</p>
                <input className="input" type="number" value={peerBenchmark.peerMedianGapPct} onChange={(e) => setPeerBenchmark({ peerMedianGapPct: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <p className="text-[10px] text-[#4a6080] mb-1">Peer Risk Upper Band</p>
                <input className="input" type="number" value={peerBenchmark.peerUpperRiskScore} onChange={(e) => setPeerBenchmark({ peerUpperRiskScore: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-[#4a6080] mb-1">Peer Net Exp £/Cap</p>
                <input className="input" type="number" value={peerBenchmark.peerNetExpenditurePerCapita} onChange={(e) => setPeerBenchmark({ peerNetExpenditurePerCapita: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <p className="text-[10px] text-[#4a6080] mb-1">Peer Savings Delivery %</p>
                <input className="input" type="number" value={peerBenchmark.peerSavingsDeliveryRate} onChange={(e) => setPeerBenchmark({ peerSavingsDeliveryRate: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <p className="text-[10px] text-[#4a6080] mb-1">Peer Debt/Revenue %</p>
                <input className="input" type="number" value={peerBenchmark.peerDebtToNetRevenue} onChange={(e) => setPeerBenchmark({ peerDebtToNetRevenue: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="rounded-lg bg-[#080c14] border border-[rgba(99,179,237,0.1)] p-2.5">
              <p className="text-[10px] text-[#8ca0c0]">{peerBenchmark.sourceLabel || 'Benchmark source'}</p>
              <p className="text-[10px] text-[#4a6080] mt-1">
                Current reserves ratio {result.reservesToNetBudget.toFixed(1)}% vs peer median {peerBenchmark.peerMedianReservesToBudget.toFixed(1)}%
              </p>
              <p className="text-[10px] text-[#4a6080]">
                Current risk {overallRiskScore.toFixed(0)} vs peer upper band {peerBenchmark.peerUpperRiskScore.toFixed(0)}
              </p>
              <p className="text-[10px] text-[#4a6080]">
                Net expenditure per capita £{currentNetExpPerCapita.toFixed(0)} vs peer £{peerBenchmark.peerNetExpenditurePerCapita.toFixed(0)}
              </p>
              <p className="text-[10px] text-[#4a6080]">
                Savings delivery {currentSavingsDeliveryRate.toFixed(0)}% vs peer {peerBenchmark.peerSavingsDeliveryRate.toFixed(0)}%
              </p>
              <p className="text-[10px] text-[#4a6080]">
                Debt burden {debtToRevenuePct.toFixed(1)}% vs peer {peerBenchmark.peerDebtToNetRevenue.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Early Warning Indicators</CardTitle>
          <span className="text-[10px] text-[#4a6080]">Liquidity and debt resilience</span>
        </CardHeader>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[#080c14] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Reserve Depletion</p>
            <p className={`mono text-[13px] font-bold mt-1 ${result.yearReservesExhausted ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {result.yearReservesExhausted ?? 'No exhaustion in horizon'}
            </p>
          </div>
          <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[#080c14] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Liquidity Headroom</p>
            <p className={`mono text-[13px] font-bold mt-1 ${liquidityLevel === 'critical' ? 'text-[#ef4444]' : liquidityLevel === 'warning' ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
              {baseline?.treasuryIndicators.enabled ? `${liquidityHeadroomPct.toFixed(1)}%` : 'Not enabled'}
            </p>
          </div>
          <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[#080c14] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Debt Burden</p>
            <p className={`mono text-[13px] font-bold mt-1 ${debtBurdenLevel === 'critical' ? 'text-[#ef4444]' : debtBurdenLevel === 'warning' ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
              {baseline?.treasuryIndicators.enabled ? `${debtToRevenuePct.toFixed(1)}%` : 'Not enabled'}
            </p>
          </div>
          <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[#080c14] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">s114 Indicator</p>
            <p className={`mono text-[13px] font-bold mt-1 ${result.s114Triggered ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {result.s114Triggered ? 'At risk' : 'No immediate trigger'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
