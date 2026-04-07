import React from 'react';
import { Plus, Trash2, AlertTriangle, Zap } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { RichTooltip } from '../ui/RichTooltip';
import type {
  ContractIndexationClause,
  MrpPolicy,
  PaySpineRow,
  ContractIndexationEntry,
  InvestToSaveProposal,
  IncomeGenerationLine,
  ReservesAdequacyMethod,
} from '../../types/financial';

function fmtK(v: number) {
  return `£${Math.round(v).toLocaleString('en-GB')}k`;
}

export function EnhancementPanel() {
  const {
    baseline,
    result,
    setPaySpineEnabled,
    addPaySpineRow,
    updatePaySpineRow,
    removePaySpineRow,
    setContractTrackerEnabled,
    addContractEntry,
    updateContractEntry,
    removeContractEntry,
    setInvestToSaveEnabled,
    addInvestToSaveProposal,
    updateInvestToSaveProposal,
    removeInvestToSaveProposal,
    setIncomeWorkbookEnabled,
    addIncomeLine,
    updateIncomeLine,
    removeIncomeLine,
    updateReservesAdequacyMethodology,
    updateTreasuryIndicators,
    updateMrpCalculator,
    applyNamedStressTest,
  } = useMTFSStore();

  const addPayRow = () => {
    const row: PaySpineRow = {
      id: `ps-${Date.now()}`,
      grade: 'NJC SCP',
      fte: 10,
      spinePointCost: 32_000,
    };
    addPaySpineRow(row);
  };

  const addContract = () => {
    const c: ContractIndexationEntry = {
      id: `ct-${Date.now()}`,
      name: 'Major contract',
      value: 1_000,
      clause: 'cpi',
      bespokeRate: 0,
    };
    addContractEntry(c);
  };

  const addI2S = () => {
    const p: InvestToSaveProposal = {
      id: `i2s-${Date.now()}`,
      name: 'Digital automation',
      upfrontCost: 1_000,
      annualSaving: 350,
      paybackYears: 3,
      deliveryYear: 1,
    };
    addInvestToSaveProposal(p);
  };

  const addIncome = () => {
    const line: IncomeGenerationLine = {
      id: `inc-${Date.now()}`,
      name: 'Traded service',
      baseVolume: 2_000,
      basePrice: 120,
      volumeGrowth: 1.5,
      priceGrowth: 2.5,
    };
    addIncomeLine(line);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Pay Spine Configurator</CardTitle><RichTooltip content="Models pay pressures from grade mix and FTE distribution instead of a single uplift." /></div>
            <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addPayRow} title="Add a new pay spine row."><Plus size={12} />Add Row</button>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.paySpineConfig.enabled} onChange={(e) => setPaySpineEnabled(e.target.checked)} />
            Enable pay spine model
          </label>
          <div className="space-y-2">
            {baseline.paySpineConfig.rows.length > 0 && (
              <div className="grid grid-cols-[1fr_90px_130px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Grade</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">FTE</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Cost/FTE (£)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.paySpineConfig.rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_90px_130px_auto] gap-2">
                <input className="input" value={row.grade} onChange={(e) => updatePaySpineRow(row.id, { grade: e.target.value })} />
                <input className="input" type="number" value={row.fte} onChange={(e) => updatePaySpineRow(row.id, { fte: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={row.spinePointCost} onChange={(e) => updatePaySpineRow(row.id, { spinePointCost: Number(e.target.value) || 0 })} />
                <button className="text-[#ef4444]" onClick={() => removePaySpineRow(row.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Contract Indexation Tracker</CardTitle><RichTooltip content="Captures contract-specific inflation clauses and uplift exposure." /></div>
            <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addContract} title="Add a major indexed contract line."><Plus size={12} />Add Contract</button>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.contractIndexationTracker.enabled} onChange={(e) => setContractTrackerEnabled(e.target.checked)} />
            Enable contract tracker
          </label>
          <div className="space-y-2">
            {baseline.contractIndexationTracker.contracts.length > 0 && (
              <div className="grid grid-cols-[1fr_90px_110px_80px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Contract</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Value (£k)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Clause</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Bespoke %</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.contractIndexationTracker.contracts.map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_90px_110px_80px_auto] gap-2">
                <input className="input" value={c.name} onChange={(e) => updateContractEntry(c.id, { name: e.target.value })} />
                <input className="input" type="number" value={c.value} onChange={(e) => updateContractEntry(c.id, { value: Number(e.target.value) || 0 })} />
                <select className="input" value={c.clause} onChange={(e) => updateContractEntry(c.id, { clause: e.target.value as ContractIndexationClause })}>
                  <option value="cpi">CPI</option>
                  <option value="rpi">RPI</option>
                  <option value="nmw">NMW</option>
                  <option value="bespoke">Bespoke</option>
                </select>
                <input className="input" type="number" value={c.bespokeRate} onChange={(e) => updateContractEntry(c.id, { bespokeRate: Number(e.target.value) || 0 })} />
                <button className="text-[#ef4444]" onClick={() => removeContractEntry(c.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Invest-to-Save Modelling</CardTitle><RichTooltip content="Assesses upfront cost, payback and recurring savings trajectory." /></div>
            <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addI2S} title="Add an invest-to-save proposal."><Plus size={12} />Add Proposal</button>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.investToSave.enabled} onChange={(e) => setInvestToSaveEnabled(e.target.checked)} />
            Enable invest-to-save
          </label>
          <div className="space-y-2">
            {baseline.investToSave.proposals.length > 0 && (
              <div className="grid grid-cols-[1fr_90px_90px_70px_70px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Proposal</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Upfront (£k)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Saving (£k)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Payback</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Start Yr</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.investToSave.proposals.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_90px_90px_70px_70px_auto] gap-2">
                <input className="input" value={p.name} onChange={(e) => updateInvestToSaveProposal(p.id, { name: e.target.value })} />
                <input className="input" type="number" value={p.upfrontCost} onChange={(e) => updateInvestToSaveProposal(p.id, { upfrontCost: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={p.annualSaving} onChange={(e) => updateInvestToSaveProposal(p.id, { annualSaving: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={p.paybackYears} onChange={(e) => updateInvestToSaveProposal(p.id, { paybackYears: Number(e.target.value) || 1 })} />
                <select className="input" value={p.deliveryYear} onChange={(e) => updateInvestToSaveProposal(p.id, { deliveryYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
                  {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}
                </select>
                <button className="text-[#ef4444]" onClick={() => removeInvestToSaveProposal(p.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Income Generation Workbook</CardTitle><RichTooltip content="Separates volume and price growth for income streams." /></div>
            <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addIncome} title="Add an income line."><Plus size={12} />Add Line</button>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.incomeGenerationWorkbook.enabled} onChange={(e) => setIncomeWorkbookEnabled(e.target.checked)} />
            Enable income workbook
          </label>
          <div className="space-y-2">
            {baseline.incomeGenerationWorkbook.lines.length > 0 && (
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Line</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Volume</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Price</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Vol %</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Price %</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.incomeGenerationWorkbook.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-[1fr_80px_80px_80px_80px_auto] gap-2">
                <input className="input" value={line.name} onChange={(e) => updateIncomeLine(line.id, { name: e.target.value })} />
                <input className="input" type="number" value={line.baseVolume} onChange={(e) => updateIncomeLine(line.id, { baseVolume: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={line.basePrice} onChange={(e) => updateIncomeLine(line.id, { basePrice: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={line.volumeGrowth} onChange={(e) => updateIncomeLine(line.id, { volumeGrowth: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={line.priceGrowth} onChange={(e) => updateIncomeLine(line.id, { priceGrowth: Number(e.target.value) || 0 })} />
                <button className="text-[#ef4444]" onClick={() => removeIncomeLine(line.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Reserves Methodology</CardTitle><RichTooltip content="Selects how minimum reserves threshold is set for resilience checks." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <select className="input" value={baseline.reservesAdequacyMethodology.method} onChange={(e) => updateReservesAdequacyMethodology({ method: e.target.value as ReservesAdequacyMethod })}>
              <option value="fixed">Fixed minimum (£)</option>
              <option value="pct_of_net_budget">% of net budget</option>
              <option value="risk_based">Risk-based model</option>
            </select>
            <input className="input" type="number" value={baseline.reservesAdequacyMethodology.fixedMinimum} onChange={(e) => updateReservesAdequacyMethodology({ fixedMinimum: Number(e.target.value) || 0 })} />
            <input className="input" type="number" value={baseline.reservesAdequacyMethodology.pctOfNetBudget} onChange={(e) => updateReservesAdequacyMethodology({ pctOfNetBudget: Number(e.target.value) || 0 })} />
            <p className="text-[10px] text-[#8ca0c0]">Effective threshold: <span className="mono text-[#f0f4ff]">{fmtK(result.effectiveMinimumReservesThreshold)}</span></p>
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Treasury Indicators</CardTitle><RichTooltip content="Tracks prudential limits and flags potential treasury breaches." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={baseline.treasuryIndicators.enabled} onChange={(e) => updateTreasuryIndicators({ enabled: e.target.checked })} />Enable indicators</label>
            <input className="input" type="number" value={baseline.treasuryIndicators.authorisedLimit} onChange={(e) => updateTreasuryIndicators({ authorisedLimit: Number(e.target.value) || 0 })} placeholder="Authorised limit" />
            <input className="input" type="number" value={baseline.treasuryIndicators.operationalBoundary} onChange={(e) => updateTreasuryIndicators({ operationalBoundary: Number(e.target.value) || 0 })} placeholder="Operational boundary" />
            <input className="input" type="number" value={baseline.treasuryIndicators.netFinancingNeed} onChange={(e) => updateTreasuryIndicators({ netFinancingNeed: Number(e.target.value) || 0 })} placeholder="Net financing need" />
            {result.treasuryBreaches.length > 0 && (
              <div className="text-[10px] text-[#ef4444] space-y-1">
                {result.treasuryBreaches.map((b) => <p key={b} className="flex items-center gap-1"><AlertTriangle size={10} />{b}</p>)}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>MRP Calculator</CardTitle><RichTooltip content="Applies selected MRP policy to calculate annual revenue charges." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={baseline.mrpCalculator.enabled} onChange={(e) => updateMrpCalculator({ enabled: e.target.checked })} />Enable MRP</label>
            <select className="input" value={baseline.mrpCalculator.policy} onChange={(e) => updateMrpCalculator({ policy: e.target.value as MrpPolicy })}>
              <option value="asset-life">Asset life</option>
              <option value="annuity">Annuity</option>
              <option value="straight-line">Straight-line</option>
            </select>
            <input className="input" type="number" value={baseline.mrpCalculator.baseBorrowing} onChange={(e) => updateMrpCalculator({ baseBorrowing: Number(e.target.value) || 0 })} placeholder="Base borrowing" />
            <input className="input" type="number" value={baseline.mrpCalculator.assetLifeYears} onChange={(e) => updateMrpCalculator({ assetLifeYears: Number(e.target.value) || 1 })} placeholder="Asset life years" />
            <input className="input" type="number" value={baseline.mrpCalculator.annuityRate} onChange={(e) => updateMrpCalculator({ annuityRate: Number(e.target.value) || 0 })} placeholder="Annuity %" />
            <p className="text-[10px] text-[#8ca0c0]">Y1–Y5: {result.mrpCharges.map((v) => fmtK(v)).join(' · ')}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5"><CardTitle>Named Stress Tests</CardTitle><RichTooltip content="Applies adverse shocks quickly to test downside resilience and governance readiness." /></div>
          <Zap size={14} className="text-[#f59e0b]" />
        </CardHeader>
        <div className="grid grid-cols-4 gap-2">
          <button className="px-3 py-2 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[11px] font-semibold" onClick={() => applyNamedStressTest('pay_settlement_plus2')} title="Increase pay award assumption by +2 percentage points.">
            Statutory Pay +2%
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(245,158,11,0.12)] text-[#f59e0b] text-[11px] font-semibold" onClick={() => applyNamedStressTest('asc_demand_shock')} title="Apply a +15% ASC demand shock to stress-test demand exposure.">
            ASC Shock +15%
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[11px] font-semibold" onClick={() => applyNamedStressTest('grant_reduction_year2')} title="Apply grant reduction shock from year 2.">
            Grant Reduction
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(239,68,68,0.2)] text-[#ef4444] text-[11px] font-bold border border-[rgba(239,68,68,0.35)]" onClick={() => applyNamedStressTest('worst_case')} title="Apply combined adverse shocks for maximum credible downside scenario.">
            Combined Worst Case
          </button>
        </div>
      </Card>
    </div>
  );
}
