import React, { useState } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronRight, TrendingDown,
  AlertTriangle, Target, RefreshCw
} from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Toggle } from '../ui/SliderControl';
import { RichTooltip } from '../ui/RichTooltip';
import type { SavingsProposal, SavingsCategory, RagStatus } from '../../types/financial';

function fmtK(v: number) {
  const abs = Math.abs(v);
  return `£${abs >= 1000 ? `${(abs / 1000).toFixed(1)}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

const CATEGORY_META: Record<SavingsCategory, { label: string; color: string }> = {
  efficiency: { label: 'Efficiency', color: '#3b82f6' },
  income: { label: 'Income', color: '#10b981' },
  'demand-management': { label: 'Demand Management', color: '#f97316' },
  'service-reduction': { label: 'Service Reduction', color: '#ef4444' },
  transformation: { label: 'Transformation', color: '#8b5cf6' },
  procurement: { label: 'Procurement', color: '#f59e0b' },
};

const RAG_META: Record<RagStatus, { label: string; color: string; bg: string }> = {
  green: { label: 'Green', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  amber: { label: 'Amber', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  red: { label: 'Red', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

// ── Default yearly delivery profile ──────────────────────────────────────────
function defaultYearlyDelivery(deliveryYear: number): [number, number, number, number, number] {
  // Ramp from delivery year: 50% in first year, 100% from year 2 onwards
  const arr: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (let i = deliveryYear - 1; i < 5; i++) {
    arr[i] = i === deliveryYear - 1 ? 50 : 100;
  }
  return arr;
}

// ── Proposal row ───────────────────────────────────────────────────────────────
function ProposalRow({ proposal }: { proposal: SavingsProposal }) {
  const { updateSavingsProposal, removeSavingsProposal, result } = useMTFSStore();
  const [expanded, setExpanded] = useState(false);

  const catMeta = CATEGORY_META[proposal.category];
  const ragMeta = RAG_META[proposal.ragStatus];

  // Find this proposal's year results
  const totalDelivered = result.years.reduce(
    (s, y) => s + (y.savingsProposalResults.find((p) => p.id === proposal.id)?.deliveredValue ?? 0),
    0
  );

  return (
    <div className="border border-[rgba(99,179,237,0.08)] rounded-xl mb-2 overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(99,179,237,0.02)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ragMeta.color }} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#f0f4ff] truncate">
              {proposal.name || 'Unnamed proposal'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: `${catMeta.color}18`, color: catMeta.color }}
              >
                {catMeta.label}
              </span>
              <span className="text-[9px] text-[#4a6080]">
                {proposal.isRecurring ? 'Recurring' : 'One-off'}
              </span>
              {proposal.responsibleOfficer && (
                <span className="text-[9px] text-[#4a6080] truncate">{proposal.responsibleOfficer}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="mono text-[11px] font-bold text-[#f0f4ff]">{fmtK(proposal.grossValue)}</p>
            <p className="text-[9px] text-[#4a6080]">gross / yr</p>
          </div>
          <div className="text-right">
            <p className="mono text-[11px] font-bold text-[#10b981]">{fmtK(totalDelivered)}</p>
            <p className="text-[9px] text-[#4a6080]">5yr delivered</p>
          </div>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded"
            style={{ background: ragMeta.bg, color: ragMeta.color }}
          >
            {ragMeta.label.toUpperCase()}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); removeSavingsProposal(proposal.id); }}
            title="Remove this proposal from the savings programme."
            className="p-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
          >
            <Trash2 size={11} />
          </button>
          {expanded ? <ChevronDown size={13} className="text-[#4a6080]" /> : <ChevronRight size={13} className="text-[#4a6080]" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-[rgba(99,179,237,0.02)] space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Proposal Name</label>
              <input
                type="text"
                value={proposal.name}
                onChange={(e) => updateSavingsProposal(proposal.id, { name: e.target.value })}
                title="Proposal name shown in reporting and governance summaries."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none focus:border-[rgba(59,130,246,0.5)]"
                placeholder="e.g. Management restructure"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Category</label>
              <select
                value={proposal.category}
                onChange={(e) => updateSavingsProposal(proposal.id, { category: e.target.value as SavingsCategory })}
                title="Category helps classify strategy type and communication narrative."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
              >
                {(Object.keys(CATEGORY_META) as SavingsCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">RAG Status</label>
              <select
                value={proposal.ragStatus}
                onChange={(e) => updateSavingsProposal(proposal.id, { ragStatus: e.target.value as RagStatus })}
                title="Delivery confidence status used in risk oversight."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
              >
                <option value="green">Green — on track</option>
                <option value="amber">Amber — at risk</option>
                <option value="red">Red — unlikely to deliver</option>
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Gross Value (£000s/yr)</label>
              <input
                type="number"
                value={proposal.grossValue}
                step={100}
                onChange={(e) => updateSavingsProposal(proposal.id, { grossValue: parseFloat(e.target.value) || 0 })}
                title="Full-year gross savings value in £000s before risk adjustment."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Achievement Rate (%)</label>
              <input
                type="number"
                value={proposal.achievementRate}
                min={0} max={100} step={5}
                onChange={(e) => updateSavingsProposal(proposal.id, { achievementRate: parseFloat(e.target.value) || 0 })}
                title="Expected delivery percentage of gross value."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Responsible Officer</label>
              <input
                type="text"
                value={proposal.responsibleOfficer}
                onChange={(e) => updateSavingsProposal(proposal.id, { responsibleOfficer: e.target.value })}
                title="Named lead accountable for delivery."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
                placeholder="e.g. Director of People"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Delivery Year</label>
              <select
                value={proposal.deliveryYear}
                onChange={(e) => {
                  const deliveryYear = Number(e.target.value) as 1 | 2 | 3 | 4 | 5;
                  updateSavingsProposal(proposal.id, {
                    deliveryYear,
                    yearlyDelivery: defaultYearlyDelivery(deliveryYear),
                  });
                }}
                title="First year this proposal starts contributing savings."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
              >
                {[1, 2, 3, 4, 5].map((year) => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(99,179,237,0.04)] border border-[rgba(99,179,237,0.08)]">
            <div>
              <p className="text-[11px] font-semibold text-[#f0f4ff]">Recurring Saving</p>
              <p className="text-[10px] text-[#4a6080] mt-0.5">
                {proposal.isRecurring
                  ? 'This saving is recurring — it reduces the structural deficit in all years from delivery.'
                  : 'This saving is one-off — it provides temporary gap mitigation but does not close the structural deficit.'
                }
              </p>
            </div>
            <Toggle
              label=""
              value={proposal.isRecurring}
              onChange={(v) => updateSavingsProposal(proposal.id, { isRecurring: v })}
            />
          </div>

          {/* Slippage modelling */}
          <div className="p-3 rounded-lg bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.18)]">
            <p className="text-[11px] font-semibold text-[#f0f4ff] mb-2">Savings Slippage Profile</p>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((i) => (
                <div key={i}>
                  <p className="text-[9px] text-[#4a6080] mb-1">Delivery Y{i + 1} (%)</p>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={proposal.yearlyDelivery[i]}
                    onChange={(e) => {
                      const next = [...proposal.yearlyDelivery] as [number, number, number, number, number];
                      next[i] = parseFloat(e.target.value) || 0;
                      updateSavingsProposal(proposal.id, { yearlyDelivery: next });
                    }}
                    title={`Slippage profile input for delivery year ${i + 1}.`}
                    className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded px-2 py-1 text-[11px] mono text-[#f0f4ff]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Yearly delivery profile */}
          <div>
            <label className="text-[10px] text-[#4a6080] block mb-2">
              Yearly Delivery Profile (% of gross value delivered each year)
              <span className="ml-1 text-[#4a6080]">— individual year percentages</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {([0, 1, 2, 3, 4] as const).map((i) => {
                const currentYear = new Date().getFullYear();
                return (
                  <div key={i}>
                    <p className="text-[9px] text-[#4a6080] text-center mb-1">
                      Yr {i + 1} ({currentYear + i}/{String(currentYear + i + 1).slice(2)})
                    </p>
                    <div className="flex items-center gap-1 bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-2 py-1.5">
                      <input
                        type="number"
                        value={proposal.yearlyDelivery[i]}
                        min={0} max={100} step={5}
                        onChange={(e) => {
                          const newDelivery = [...proposal.yearlyDelivery] as [number, number, number, number, number];
                          newDelivery[i] = parseFloat(e.target.value) || 0;
                          updateSavingsProposal(proposal.id, { yearlyDelivery: newDelivery });
                        }}
                        title={`Year ${i + 1} delivery percentage for this proposal.`}
                        className="w-full bg-transparent mono text-[11px] text-[#f0f4ff] font-semibold outline-none text-center"
                      />
                      <span className="text-[9px] text-[#4a6080]">%</span>
                    </div>
                    {/* mini bar */}
                    <div className="mt-1 h-1 bg-[rgba(99,179,237,0.08)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(proposal.yearlyDelivery[i], 100)}%`,
                          background: proposal.achievementRate >= 80 ? '#10b981' : proposal.achievementRate >= 60 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-[#4a6080] block mb-1">Description / Notes</label>
            <textarea
              value={proposal.description}
              onChange={(e) => updateSavingsProposal(proposal.id, { description: e.target.value })}
              rows={2}
              title="Describe dependencies, assumptions, and key delivery risks."
              className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-2 text-[11px] text-[#f0f4ff] outline-none resize-none placeholder:text-[#4a6080]"
              placeholder="Describe the savings proposal, dependencies, and key risks..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export function SavingsProgramme() {
  const { savingsProposals, addSavingsProposal, clearSavingsProposals, result, assumptions } = useMTFSStore();

  const handleAdd = () => {
    const id = `sp-${Date.now()}`;
    const deliveryYear = 1 as const;
    const newProposal: SavingsProposal = {
      id,
      name: '',
      description: '',
      category: 'efficiency',
      grossValue: 500,
      deliveryYear,
      achievementRate: assumptions.expenditure.savingsDeliveryRisk,
      isRecurring: true,
      ragStatus: 'green',
      responsibleOfficer: '',
      yearlyDelivery: defaultYearlyDelivery(deliveryYear),
    };
    addSavingsProposal(newProposal);
  };

  // Aggregated programme summary
  const totalGross = savingsProposals.reduce((s, p) => s + p.grossValue, 0);
  const totalDelivered5yr = result.years.reduce((s, y) => s + y.deliveredSavings, 0);
  const recurringTotal = result.years.reduce((s, y) => s + y.recurringDeliveredSavings, 0);
  const oneOffTotal = result.years.reduce((s, y) => s + y.oneOffDeliveredSavings, 0);
  const redCount = savingsProposals.filter((p) => p.ragStatus === 'red').length;
  const amberCount = savingsProposals.filter((p) => p.ragStatus === 'amber').length;

  const byCategory = (Object.keys(CATEGORY_META) as SavingsCategory[]).map((cat) => ({
    cat,
    total: savingsProposals.filter((p) => p.category === cat).reduce((s, p) => s + p.grossValue, 0),
    count: savingsProposals.filter((p) => p.category === cat).length,
  })).filter((r) => r.count > 0);

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)]">
        <TrendingDown size={16} className="text-[#3b82f6] mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-[#f0f4ff]">Savings Programme Builder</p>
          <p className="text-[10px] text-[#8ca0c0] mt-1 leading-relaxed">
            Enter individual savings proposals with gross value, category, delivery profile, and achievement risk.
            The <strong>Recurring</strong> toggle distinguishes structural savings from one-off measures.
            When proposals are entered here, they override the policy lever savings target in the sidebar.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleAdd}
            title="Add a new savings proposal with default phasing and risk."
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] transition-colors"
          >
            <Plus size={12} />
            Add Proposal
          </button>
          {savingsProposals.length > 0 && (
            <button
              onClick={clearSavingsProposals}
              title="Remove all proposals from the programme."
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-[11px] font-semibold hover:bg-[rgba(239,68,68,0.15)] transition-colors"
            >
              <RefreshCw size={11} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {savingsProposals.length > 0 && (
        <>
          {/* Programme summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Gross Programme', value: fmtK(totalGross), sub: `${savingsProposals.length} proposals`, color: '#3b82f6' },
              { label: '5-Year Delivered', value: fmtK(totalDelivered5yr), sub: 'after achievement risk', color: '#10b981' },
              { label: 'Recurring Savings', value: fmtK(recurringTotal), sub: 'closes structural deficit', color: '#10b981' },
              { label: 'One-Off Savings', value: fmtK(oneOffTotal), sub: 'temporary gap mitigation', color: '#f59e0b' },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <p className="text-[9px] text-[#4a6080] uppercase tracking-widest font-semibold">{kpi.label}</p>
                <p className="mono text-[15px] font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-[9px] text-[#4a6080] mt-0.5">{kpi.sub}</p>
              </Card>
            ))}
          </div>

          {/* RAG summary */}
          {(redCount > 0 || amberCount > 0) && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)]">
              <AlertTriangle size={14} className="text-[#f59e0b]" />
              <p className="text-[11px] text-[#8ca0c0]">
                <span className="text-[#ef4444] font-semibold">{redCount} Red</span> and{' '}
                <span className="text-[#f59e0b] font-semibold">{amberCount} Amber</span> proposals identified.
                Consider increasing the achievement risk or removing these from the programme before presenting to governance.
              </p>
            </div>
          )}

          {/* Category breakdown */}
          {byCategory.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-1.5">
                  <CardTitle>Programme by Category</CardTitle>
                  <RichTooltip content="Breakdown of gross savings value by intervention type." />
                </div>
                <span className="text-[10px] text-[#4a6080]">Gross annual value</span>
              </CardHeader>
              <div className="space-y-2">
                {byCategory.map(({ cat, total, count }) => {
                  const meta = CATEGORY_META[cat];
                  const pct = totalGross > 0 ? (total / totalGross) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                          <span className="text-[11px] text-[#8ca0c0]">{meta.label}</span>
                          <span className="text-[9px] text-[#4a6080]">({count})</span>
                        </div>
                        <span className="mono text-[11px] font-semibold text-[#f0f4ff]">{fmtK(total)}</span>
                      </div>
                      <div className="h-1.5 bg-[rgba(99,179,237,0.06)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color, opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Year-by-year delivery table */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <CardTitle>Year-by-Year Savings Delivery</CardTitle>
                <RichTooltip content="Delivered values after proposal-level achievement risk and phasing assumptions." />
              </div>
              <span className="text-[10px] text-[#4a6080]">After achievement risk</span>
            </CardHeader>
            <table className="w-full premium-table text-[11px]">
              <thead>
                <tr className="border-b border-[rgba(99,179,237,0.08)]">
                  <th className="text-left py-2 text-[#4a6080] font-semibold pr-3">Proposal</th>
                  {result.years.map((y) => (
                    <th key={y.year} className="text-right py-2 text-[#4a6080] font-semibold px-2">{y.label}</th>
                  ))}
                  <th className="text-right py-2 text-[#4a6080] font-semibold">5yr Total</th>
                </tr>
              </thead>
              <tbody>
                {savingsProposals.map((proposal) => {
                  const yearValues = result.years.map(
                    (y) => y.savingsProposalResults.find((p) => p.id === proposal.id)?.deliveredValue ?? 0
                  );
                  const rowTotal = yearValues.reduce((s, v) => s + v, 0);
                  const ragMeta = RAG_META[proposal.ragStatus];
                  return (
                    <tr key={proposal.id} className="border-b border-[rgba(99,179,237,0.04)] hover:bg-[rgba(99,179,237,0.02)]">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ragMeta.color }} />
                          <span className="text-[#f0f4ff] font-medium truncate max-w-[140px]">
                            {proposal.name || 'Unnamed'}
                          </span>
                          {!proposal.isRecurring && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-[rgba(245,158,11,0.15)] text-[#f59e0b] font-semibold">ONE-OFF</span>
                          )}
                        </div>
                      </td>
                      {yearValues.map((v, i) => (
                        <td key={i} className={`py-2 text-right mono px-2 ${v > 0 ? 'text-[#10b981]' : 'text-[#4a6080]'}`}>
                          {v > 0 ? fmtK(v) : '—'}
                        </td>
                      ))}
                      <td className="py-2 text-right mono font-bold text-[#f0f4ff]">{fmtK(rowTotal)}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-[rgba(99,179,237,0.04)]">
                  <td className="py-2 font-bold text-[#f0f4ff] pr-3">Total Delivered</td>
                  {result.years.map((y) => (
                    <td key={y.year} className="py-2 text-right mono font-bold text-[#10b981] px-2">
                      {fmtK(y.deliveredSavings)}
                    </td>
                  ))}
                  <td className="py-2 text-right mono font-bold text-[#10b981]">{fmtK(totalDelivered5yr)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Proposals list */}
      {savingsProposals.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-[rgba(99,179,237,0.12)]">
          <Target size={28} className="text-[#4a6080] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#f0f4ff]">No savings proposals yet</p>
          <p className="text-[11px] text-[#4a6080] mt-1 mb-4">
            Add individual proposals to build your savings programme
          </p>
          <p className="text-[10px] text-[#4a6080]">
            The model currently uses the policy lever target from the sidebar (£{(assumptions.policy.annualSavingsTarget / 1000).toFixed(1)}m/yr)
          </p>
        </div>
      ) : (
        <div>
          <p className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold mb-3">All Proposals</p>
          {savingsProposals.map((p) => (
            <ProposalRow key={p.id} proposal={p} />
          ))}
        </div>
      )}
    </div>
  );
}
