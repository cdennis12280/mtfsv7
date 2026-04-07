import React from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, History, FileClock, Scale } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { RichTooltip } from '../ui/RichTooltip';
import type { GrantScheduleEntry, GrantCertainty } from '../../types/financial';

function fmtK(v: number) {
  return `£${Math.round(v).toLocaleString('en-GB')}k`;
}

export function HighValuePanel() {
  const {
    baseline,
    result,
    updateCouncilTaxBaseConfig,
    addGrantScheduleEntry,
    updateGrantScheduleEntry,
    removeGrantScheduleEntry,
    updateAscCohortModel,
    updateCapitalFinancing,
    updateRiskBasedReserves,
    updateReservesRecoveryPlan,
    assumptionHistory,
    auditTrail,
  } = useMTFSStore();

  const {
    councilTaxBaseConfig,
    grantSchedule,
    ascCohortModel,
    capitalFinancing,
    riskBasedReserves,
    reservesRecoveryPlan,
  } = baseline;

  const addGrant = () => {
    const entry: GrantScheduleEntry = {
      id: `grant-${Date.now()}`,
      name: '',
      value: 500,
      certainty: 'indicative',
      endYear: 3,
    };
    addGrantScheduleEntry(entry);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>Council Tax Base Configurator</CardTitle>
            <RichTooltip content="Builds council tax yield from tax base inputs and precept assumptions." />
          </div>
        </CardHeader>
        <div className="grid grid-cols-3 gap-3 text-[11px]">
          <label className="flex items-center gap-2 text-[#8ca0c0]">
            <input type="checkbox" checked={councilTaxBaseConfig.enabled} onChange={(e) => updateCouncilTaxBaseConfig({ enabled: e.target.checked })} title="Enable tax-base-driven council tax calculations." />
            Enable Band D model
          </label>
          <div>
            <p className="text-[#4a6080] mb-1">Band D Dwellings</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.bandDEquivalentDwellings} onChange={(e) => updateCouncilTaxBaseConfig({ bandDEquivalentDwellings: Number(e.target.value) || 0 })} title="Band D equivalent tax base." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">Band D Charge (£)</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.bandDCharge} onChange={(e) => updateCouncilTaxBaseConfig({ bandDCharge: Number(e.target.value) || 0 })} title="Band D annual charge in pounds." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">Collection Rate %</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.collectionRate} onChange={(e) => updateCouncilTaxBaseConfig({ collectionRate: Number(e.target.value) || 0 })} title="Expected collection performance percentage." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">Core Precept %</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.corePreceptPct} onChange={(e) => updateCouncilTaxBaseConfig({ corePreceptPct: Number(e.target.value) || 0 })} title="Core council tax increase percentage." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">ASC Precept %</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.ascPreceptPct} onChange={(e) => updateCouncilTaxBaseConfig({ ascPreceptPct: Number(e.target.value) || 0 })} title="Adult social care precept percentage." />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>Grant Schedule Builder</CardTitle>
            <RichTooltip content="Models grant certainty and expiry over the MTFS horizon." />
          </div>
          <button onClick={addGrant} className="text-[11px] text-[#3b82f6] flex items-center gap-1" title="Add a new grant line."><Plus size={12} />Add Grant</button>
        </CardHeader>
        <div className="space-y-2">
          {grantSchedule.length === 0 && <p className="text-[11px] text-[#4a6080]">No grants configured.</p>}
          {grantSchedule.map((g) => (
            <div key={g.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
              <input className="input" placeholder="Grant name" value={g.name} onChange={(e) => updateGrantScheduleEntry(g.id, { name: e.target.value })} title="Grant label used in reports." />
              <input type="number" className="input" value={g.value} onChange={(e) => updateGrantScheduleEntry(g.id, { value: Number(e.target.value) || 0 })} title="Annual grant value in £000s." />
              <select className="input" value={g.certainty} onChange={(e) => updateGrantScheduleEntry(g.id, { certainty: e.target.value as GrantCertainty })} title="Confidence level used in weighted funding calculations.">
                <option value="confirmed">Confirmed</option>
                <option value="indicative">Indicative</option>
                <option value="assumed">Assumed</option>
              </select>
              <select className="input" value={g.endYear} onChange={(e) => updateGrantScheduleEntry(g.id, { endYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })} title="Final MTFS year this grant is assumed to continue.">
                {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Ends Y{y}</option>)}
              </select>
              <button onClick={() => removeGrantScheduleEntry(g.id)} className="text-[#ef4444]" title="Remove this grant line."><Trash2 size={12} /></button>
            </div>
          ))}
          {result.grantsExpiringInYears.length > 0 && (
            <p className="text-[10px] text-[#f59e0b]">Expiring during MTFS: {result.grantsExpiringInYears.join(', ')}</p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>ASC Demand by Cohort</CardTitle><RichTooltip content="Separates demand assumptions for working-age and older adult cohorts." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={ascCohortModel.enabled} onChange={(e) => updateAscCohortModel({ enabled: e.target.checked })} />Enable cohort model</label>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="number" value={ascCohortModel.population18to64} onChange={(e) => updateAscCohortModel({ population18to64: Number(e.target.value) || 0 })} placeholder="18-64 pop" />
              <input className="input" type="number" value={ascCohortModel.population65plus} onChange={(e) => updateAscCohortModel({ population65plus: Number(e.target.value) || 0 })} placeholder="65+ pop" />
              <input className="input" type="number" value={ascCohortModel.prevalence18to64} onChange={(e) => updateAscCohortModel({ prevalence18to64: Number(e.target.value) || 0 })} placeholder="Prev 18-64 %" />
              <input className="input" type="number" value={ascCohortModel.prevalence65plus} onChange={(e) => updateAscCohortModel({ prevalence65plus: Number(e.target.value) || 0 })} placeholder="Prev 65+ %" />
              <input className="input" type="number" value={ascCohortModel.unitCost18to64} onChange={(e) => updateAscCohortModel({ unitCost18to64: Number(e.target.value) || 0 })} placeholder="Unit cost 18-64" />
              <input className="input" type="number" value={ascCohortModel.unitCost65plus} onChange={(e) => updateAscCohortModel({ unitCost65plus: Number(e.target.value) || 0 })} placeholder="Unit cost 65+" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Capital Financing Costs</CardTitle><RichTooltip content="Adds borrowing, interest and MRP effects into the revenue forecast." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={capitalFinancing.enabled} onChange={(e) => updateCapitalFinancing({ enabled: e.target.checked })} />Enable capital financing</label>
            <div className="grid grid-cols-5 gap-1">
              {capitalFinancing.borrowingByYear.map((v, i) => (
                <input
                  key={i}
                  className="input"
                  type="number"
                  value={v}
                  onChange={(e) => {
                    const arr = [...capitalFinancing.borrowingByYear] as [number, number, number, number, number];
                    arr[i] = Number(e.target.value) || 0;
                    updateCapitalFinancing({ borrowingByYear: arr });
                  }}
                  placeholder={`Y${i + 1}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="number" value={capitalFinancing.interestRate} onChange={(e) => updateCapitalFinancing({ interestRate: Number(e.target.value) || 0 })} placeholder="Interest %" />
              <input className="input" type="number" value={capitalFinancing.mrpRate} onChange={(e) => updateCapitalFinancing({ mrpRate: Number(e.target.value) || 0 })} placeholder="MRP %" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Risk-Based Reserves Calculator</CardTitle><RichTooltip content="Builds recommended reserves from explicit quantified risk pots." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={riskBasedReserves.enabled} onChange={(e) => updateRiskBasedReserves({ enabled: e.target.checked })} />Enable risk pot calculation</label>
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={riskBasedReserves.adoptAsMinimumThreshold} onChange={(e) => updateRiskBasedReserves({ adoptAsMinimumThreshold: e.target.checked })} />Adopt as minimum threshold</label>
            {(['demandVolatility', 'savingsNonDelivery', 'fundingUncertainty', 'litigationRisk'] as const).map((k) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-[#4a6080]">{k}</span>
                <input className="input w-28" type="number" value={riskBasedReserves[k]} onChange={(e) => updateRiskBasedReserves({ [k]: Number(e.target.value) || 0 })} />
              </div>
            ))}
            <p className="text-[10px] text-[#8ca0c0]">Recommended minimum: <span className="mono text-[#f0f4ff]">{fmtK(result.recommendedMinimumReserves)}</span></p>
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Reserves Rebuilding Plan</CardTitle><RichTooltip content="Models contributions needed to restore reserves by target year." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={reservesRecoveryPlan.enabled} onChange={(e) => updateReservesRecoveryPlan({ enabled: e.target.checked })} />Enable rebuild plan</label>
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={reservesRecoveryPlan.autoCalculate} onChange={(e) => updateReservesRecoveryPlan({ autoCalculate: e.target.checked })} />Auto-calculate annual contribution</label>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={reservesRecoveryPlan.targetYear} onChange={(e) => updateReservesRecoveryPlan({ targetYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
                {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Target by Y{y}</option>)}
              </select>
              <input className="input" type="number" value={reservesRecoveryPlan.targetLevel} onChange={(e) => updateReservesRecoveryPlan({ targetLevel: Number(e.target.value) || 0 })} placeholder="Target level £000s" />
              <input className="input col-span-2" type="number" value={reservesRecoveryPlan.annualContribution} onChange={(e) => updateReservesRecoveryPlan({ annualContribution: Number(e.target.value) || 0 })} placeholder="Manual annual contribution £000s" />
            </div>
            <p className="text-[10px] text-[#8ca0c0]">Effective threshold used in engine: <span className="mono text-[#f0f4ff]">{fmtK(result.effectiveMinimumReservesThreshold)}</span></p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5"><CardTitle>Draft s.114 Trigger Assessment</CardTitle><RichTooltip content="Flags statutory warning indicators based on modeled sustainability risks." /></div>
          {result.s114Triggered ? <AlertTriangle size={14} className="text-[#ef4444]" /> : <CheckCircle2 size={14} className="text-[#10b981]" />}
        </CardHeader>
        <div className="text-[11px] text-[#8ca0c0]">
          <p className={result.s114Triggered ? 'text-[#ef4444] font-semibold' : 'text-[#10b981] font-semibold'}>
            {result.s114Triggered ? 'AT RISK: s.114 consideration likely required' : 'No immediate s.114 trigger under current tests'}
          </p>
          {result.s114Reasons.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.s114Reasons.map((reason) => (
                <li key={reason} className="flex items-center gap-2"><Scale size={10} className="text-[#f59e0b]" />{reason}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Assumptions Version History</CardTitle><RichTooltip content="Chronological record of assumptions snapshots for due-diligence evidence." /></div><History size={14} className="text-[#4a6080]" /></CardHeader>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {[...assumptionHistory].reverse().slice(0, 30).map((h) => (
              <div key={h.id} className="text-[10px] py-1 border-b border-[rgba(99,179,237,0.06)]">
                <p className="text-[#f0f4ff]">{h.description}</p>
                <p className="text-[#4a6080] mono">{new Date(h.timestamp).toLocaleString('en-GB')}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Audit Trail Log</CardTitle><RichTooltip content="Immutable run log of outcomes and timestamps for governance scrutiny." /></div><FileClock size={14} className="text-[#4a6080]" /></CardHeader>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {[...auditTrail].reverse().slice(0, 50).map((a) => (
              <div key={a.id} className="text-[10px] py-1 border-b border-[rgba(99,179,237,0.06)]">
                <p className="text-[#f0f4ff]">{a.description}</p>
                <p className="text-[#8ca0c0] mono">Gap {fmtK(a.totalGap)} · Structural {fmtK(a.totalStructuralGap)} · Risk {a.overallRiskScore.toFixed(0)}</p>
                <p className="text-[#4a6080] mono">{new Date(a.timestamp).toLocaleString('en-GB')}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
