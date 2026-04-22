import React from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Database, BookOpen, AlertCircle, Download, FileText } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import {
  exportCommitteeReportPdf,
  exportOnePageMemberBriefPdf,
  exportPremiumBriefPdf,
} from '../../utils/governancePdf';

function fmtK(v: number) {
  const abs = Math.abs(v);
  return `GBP ${abs >= 1000 ? `${(abs / 1000).toFixed(1)}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}


export function GovernancePanel() {
  const { result, assumptions, baseline, savingsProposals, authorityConfig } = useMTFSStore();

  const handleFullExport = () => {
    exportCommitteeReportPdf(result, assumptions, baseline, savingsProposals, authorityConfig);
  };

  const handleCsvExport = () => {
    const headers = ['Year', 'Funding', 'Expenditure', 'RawGap', 'StructuralGap', 'DeliveredSavings', 'TotalClosingReserves', 'StructuralDeficit', 'ReservesBelowThreshold'];
    const rows = result.years.map((y) => [
      y.label,
      y.totalFunding.toFixed(0),
      y.totalExpenditure.toFixed(0),
      y.rawGap.toFixed(0),
      y.structuralGap.toFixed(0),
      y.deliveredSavings.toFixed(0),
      y.totalClosingReserves.toFixed(0),
      y.structuralDeficit ? 'YES' : 'NO',
      y.reservesBelowThreshold ? 'YES' : 'NO',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MTFS_Data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOnePageBriefExport = () => {
    exportOnePageMemberBriefPdf(result, assumptions, baseline, savingsProposals, authorityConfig);
  };

  const handlePremiumMarkdownExport = () => {
    exportPremiumBriefPdf(result, assumptions, baseline, savingsProposals, authorityConfig);
  };

  return (
    <div className="space-y-4">
      {/* Export actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleFullExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] transition-colors"
        >
          <FileText size={13} />
          Export Committee Report PDF
        </button>
        <button
          onClick={handleCsvExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[11px] font-semibold hover:bg-[rgba(16,185,129,0.15)] transition-colors"
        >
          <Download size={13} />
          Export Data CSV
        </button>
        <button
          onClick={handleOnePageBriefExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] text-[#f59e0b] text-[11px] font-semibold hover:bg-[rgba(245,158,11,0.18)] transition-colors"
        >
          <FileText size={13} />
          Export One-Page Member Brief PDF
        </button>
        <button
          onClick={handlePremiumMarkdownExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(139,92,246,0.14)] border border-[rgba(139,92,246,0.36)] text-[#a78bfa] text-[11px] font-semibold hover:bg-[rgba(139,92,246,0.22)] transition-colors"
        >
          <FileText size={13} />
          Export Premium Brief PDF
        </button>
        <span className="text-[10px] text-[#4a6080]">
          Report branded for: <span className="text-[#8ca0c0] font-semibold">{authorityConfig.authorityName}</span>
        </span>
      </div>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <Database size={14} className="text-[#4a6080]" />
        </CardHeader>
        <div className="space-y-2">
          {[
            { source: 'Baseline Data', type: 'User Input', desc: `Core budget figures entered via Baseline Editor. ${baseline.customServiceLines.length} custom service line(s) defined.`, ok: true },
            { source: 'Savings Programme', type: 'User Input', desc: `${savingsProposals.length > 0 ? `${savingsProposals.length} proposals entered in Savings Programme builder` : 'Using policy lever target  -  no individual proposals entered'}.`, ok: savingsProposals.length > 0 },
            { source: 'Named Reserves', type: 'User Input', desc: `${baseline.namedReserves.length > 0 ? `${baseline.namedReserves.length} named reserve(s) defined` : 'Using flat general fund / earmarked split from Baseline Editor'}.`, ok: baseline.namedReserves.length > 0 },
            { source: 'CIPFA Methodology', type: 'Framework', desc: 'Driver-based expenditure modelling. Savings with delivery risk and time-lag ramp. Deterministic logic.', ok: true },
            { source: 'LGA 2003 s.25/26', type: 'Statutory', desc: 'Sustainability tests aligned to budget robustness and reserves adequacy statutory duties.', ok: true },
          ].map((ds, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(99,179,237,0.03)] border border-[rgba(99,179,237,0.08)]">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ds.ok ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold text-[#f0f4ff]">{ds.source}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] font-semibold">{ds.type}</span>
                </div>
                <p className="text-[10px] text-[#4a6080] leading-relaxed">{ds.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Methodology</CardTitle>
          <BookOpen size={14} className="text-[#4a6080]" />
        </CardHeader>
        <div className="space-y-3 text-[11px] text-[#8ca0c0] leading-relaxed">
          {[
            ['Driver-based modelling', 'Expenditure = Base + Pay Inflation + Non-Pay Inflation + ASC Demand + CSC Demand + Custom Lines - Savings'],
            ['Savings delivery', 'Adjusted by per-proposal achievement rate and time-lag ramp (60% Year 1, increasing to 100%). Programme overrides policy lever when proposals exist.'],
            ['Structural gap', 'Calculated by removing one-off savings and non-recurring expenditure lines from the raw gap, isolating the recurring imbalance.'],
            ['Named reserves', 'Each reserve tracked individually with contributions and drawdowns per year. Gap drawdown applied from GF first, then earmarked.'],
            ['Risk scoring', '5 weighted factors (0-100 each): Reserves Adequacy (30%), Gap Exposure (25%), Funding Volatility (20%), Demand Pressure (15%), Savings Risk (10%).'],
            ['Real terms mode', 'Deflates nominal figures using (1 + inflation rate)^-year. Reports remain in nominal terms by default (MTFS convention).'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-1.5 shrink-0" />
              <p><span className="text-[#f0f4ff] font-semibold">{title}: </span>{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>Model Limitations</CardTitle>
          <AlertCircle size={14} className="text-[#f59e0b]" />
        </CardHeader>
        <div className="space-y-1.5">
          {[
            "Baseline figures must be verified against the authority's approved accounts and most recent MTFS before statutory reporting.",
            'Savings interactions and interdependencies between proposals are not modelled  -  complex programmes require manual adjustment.',
            'Demand growth is modelled as a uniform annual rate  -  actual demand may be step-change in nature (e.g. SEND placements, looked-after children).',
            'The model does not account for in-year monitoring variances, supplementary estimates, or virements.',
            'Capital financing, MRP and treasury indicators are modelled, but should be calibrated with authority treasury strategy and prudential indicators.',
            'The Section 151 Officer must exercise professional judgement over all outputs. This tool provides decision support, not decision replacement.',
          ].map((lim, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] text-[#4a6080]">
              <span className="text-[#f59e0b] shrink-0">!</span>
              <p>{lim}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Assumptions log */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assumptions Log</CardTitle>
          <span className="text-[9px] text-[#4a6080]">Generated {new Date().toLocaleString('en-GB')}</span>
        </CardHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px]">
          {[
            ['Council Tax Increase', `${assumptions.funding.councilTaxIncrease.toFixed(2)}% p.a.`],
            ['Business Rates Growth', `${assumptions.funding.businessRatesGrowth.toFixed(1)}% p.a.`],
            ['Grant Variation', `${assumptions.funding.grantVariation > 0 ? '+' : ''}${assumptions.funding.grantVariation.toFixed(1)}% p.a.`],
            ['Fees & Charges Growth', `${assumptions.funding.feesChargesElasticity.toFixed(1)}% p.a.`],
            ['Pay Award', `${assumptions.expenditure.payAward.toFixed(1)}% p.a.`],
            ['Non-Pay Inflation', `${assumptions.expenditure.nonPayInflation.toFixed(1)}% p.a.`],
            ['ASC Demand Growth', `${assumptions.expenditure.ascDemandGrowth.toFixed(1)}% p.a.`],
            ['CSC Demand Growth', `${assumptions.expenditure.cscDemandGrowth.toFixed(1)}% p.a.`],
            ['Savings Delivery Risk', `${assumptions.expenditure.savingsDeliveryRisk.toFixed(0)}% achievement`],
            ['Policy Savings Target', fmtK(assumptions.policy.annualSavingsTarget)],
            ['Savings Proposals', `${savingsProposals.length} entered`],
            ['Named Reserves', `${baseline.namedReserves.length} defined`],
            ['Custom Service Lines', `${baseline.customServiceLines.length} defined`],
            ['Real Terms Mode', assumptions.advanced.realTermsToggle ? `Yes (${assumptions.advanced.inflationRate}%)` : 'No'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-[rgba(99,179,237,0.04)]">
              <span className="text-[#4a6080]">{label}</span>
              <span className="mono font-semibold text-[#8ca0c0]">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
