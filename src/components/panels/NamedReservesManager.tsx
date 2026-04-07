import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, PiggyBank } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/SliderControl';
import type { NamedReserve } from '../../types/financial';

function fmtK(v: number) {
  return `£${Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`;
}

const YEAR_LABELS = ['Yr 1', 'Yr 2', 'Yr 3', 'Yr 4', 'Yr 5'];

function ReserveRow({ reserve }: { reserve: NamedReserve }) {
  const { updateNamedReserve, removeNamedReserve, result } = useMTFSStore();
  const [expanded, setExpanded] = useState(false);

  // Find this reserve in year results
  const yearResults = result.years.map(
    (y) => y.namedReserveResults.find((r) => r.id === reserve.id)
  );
  const closingY5 = yearResults[4]?.closingBalance ?? reserve.openingBalance;

  return (
    <div className="border border-[rgba(99,179,237,0.08)] rounded-xl mb-2 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(99,179,237,0.02)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${reserve.isEarmarked ? 'bg-[#8b5cf6]' : 'bg-[#3b82f6]'}`} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#f0f4ff] truncate">{reserve.name || 'Unnamed reserve'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${reserve.isEarmarked ? 'bg-[rgba(139,92,246,0.12)] text-[#8b5cf6]' : 'bg-[rgba(59,130,246,0.12)] text-[#3b82f6]'}`}>
                {reserve.isEarmarked ? 'Earmarked' : 'General Fund'}
              </span>
              {reserve.purpose && <span className="text-[9px] text-[#4a6080] truncate">{reserve.purpose}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="mono text-[11px] font-bold text-[#f0f4ff]">{fmtK(reserve.openingBalance)}</p>
            <p className="text-[9px] text-[#4a6080]">opening</p>
          </div>
          <div className="text-right">
            <p className={`mono text-[11px] font-bold ${closingY5 < reserve.minimumBalance && reserve.minimumBalance > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {fmtK(closingY5)}
            </p>
            <p className="text-[9px] text-[#4a6080]">Y5 closing</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeNamedReserve(reserve.id); }}
            className="p-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
          >
            <Trash2 size={11} />
          </button>
          {expanded ? <ChevronDown size={13} className="text-[#4a6080]" /> : <ChevronRight size={13} className="text-[#4a6080]" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 bg-[rgba(99,179,237,0.02)]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Reserve Name</label>
              <input
                type="text"
                value={reserve.name}
                onChange={(e) => updateNamedReserve(reserve.id, { name: e.target.value })}
                placeholder="e.g. Insurance Reserve"
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none focus:border-[rgba(59,130,246,0.5)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Purpose / Description</label>
              <input
                type="text"
                value={reserve.purpose}
                onChange={(e) => updateNamedReserve(reserve.id, { purpose: e.target.value })}
                placeholder="e.g. Self-insurance for property and liability claims"
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Opening Balance (£000s)</label>
              <input
                type="number"
                value={reserve.openingBalance}
                step={100}
                onChange={(e) => updateNamedReserve(reserve.id, { openingBalance: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Minimum Balance (£000s)</label>
              <input
                type="number"
                value={reserve.minimumBalance}
                step={100}
                onChange={(e) => updateNamedReserve(reserve.id, { minimumBalance: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
              />
            </div>
            <div className="flex flex-col justify-end">
              <Toggle
                label="Earmarked Reserve"
                value={reserve.isEarmarked}
                tooltip="Earmarked reserves are held for specific purposes. General Fund reserves are available to the S151 Officer for general risk."
                onChange={(v) => updateNamedReserve(reserve.id, { isEarmarked: v })}
              />
            </div>
          </div>

          {/* Contributions by year */}
          <div>
            <label className="text-[10px] text-[#4a6080] block mb-2">Planned Contributions (£000s per year)</label>
            <div className="grid grid-cols-5 gap-2">
              {YEAR_LABELS.map((label, i) => (
                <div key={i}>
                  <p className="text-[9px] text-[#4a6080] text-center mb-1">{label}</p>
                  <input
                    type="number"
                    value={reserve.plannedContributions[i]}
                    step={100}
                    onChange={(e) => {
                      const arr = [...reserve.plannedContributions] as [number, number, number, number, number];
                      arr[i] = parseFloat(e.target.value) || 0;
                      updateNamedReserve(reserve.id, { plannedContributions: arr });
                    }}
                    className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-2 py-1.5 text-[11px] mono text-[#10b981] outline-none text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Drawdowns by year */}
          <div>
            <label className="text-[10px] text-[#4a6080] block mb-2">Planned Drawdowns (£000s per year)</label>
            <div className="grid grid-cols-5 gap-2">
              {YEAR_LABELS.map((label, i) => (
                <div key={i}>
                  <p className="text-[9px] text-[#4a6080] text-center mb-1">{label}</p>
                  <input
                    type="number"
                    value={reserve.plannedDrawdowns[i]}
                    step={100}
                    onChange={(e) => {
                      const arr = [...reserve.plannedDrawdowns] as [number, number, number, number, number];
                      arr[i] = parseFloat(e.target.value) || 0;
                      updateNamedReserve(reserve.id, { plannedDrawdowns: arr });
                    }}
                    className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-2 py-1.5 text-[11px] mono text-[#f59e0b] outline-none text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Projection table */}
          {yearResults.some(Boolean) && (
            <div className="overflow-x-auto">
              <table className="w-full premium-table text-[10px]">
                <thead>
                  <tr className="border-b border-[rgba(99,179,237,0.06)]">
                    <th className="text-left py-1.5 text-[#4a6080] font-semibold pr-3">Year</th>
                    <th className="text-right py-1.5 text-[#4a6080] font-semibold px-2">Opening</th>
                    <th className="text-right py-1.5 text-[#10b981] font-semibold px-2">Contribution</th>
                    <th className="text-right py-1.5 text-[#f59e0b] font-semibold px-2">Drawdown</th>
                    <th className="text-right py-1.5 text-[#4a6080] font-semibold">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {yearResults.map((yr, i) =>
                    yr ? (
                      <tr key={i} className="border-b border-[rgba(99,179,237,0.04)]">
                        <td className="py-1 pr-3 text-[#8ca0c0]">{result.years[i].label}</td>
                        <td className="py-1 text-right mono px-2 text-[#8ca0c0]">{fmtK(yr.openingBalance)}</td>
                        <td className="py-1 text-right mono px-2 text-[#10b981]">
                          {yr.contribution > 0 ? `+${fmtK(yr.contribution)}` : '—'}
                        </td>
                        <td className="py-1 text-right mono px-2 text-[#f59e0b]">
                          {yr.drawdown > 0 ? `-${fmtK(yr.drawdown)}` : '—'}
                        </td>
                        <td className={`py-1 text-right mono font-bold ${yr.closingBalance < reserve.minimumBalance && reserve.minimumBalance > 0 ? 'text-[#ef4444]' : 'text-[#f0f4ff]'}`}>
                          {fmtK(yr.closingBalance)}
                        </td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NamedReservesManager() {
  const { baseline, addNamedReserve, result } = useMTFSStore();
  const { namedReserves } = baseline;

  const handleAdd = () => {
    const id = `nr-${Date.now()}`;
    const newReserve: NamedReserve = {
      id,
      name: '',
      purpose: '',
      openingBalance: 1000,
      plannedContributions: [0, 0, 0, 0, 0],
      plannedDrawdowns: [0, 0, 0, 0, 0],
      isEarmarked: true,
      minimumBalance: 0,
    };
    addNamedReserve(newReserve);
  };

  const totalOpening = namedReserves.reduce((s, r) => s + r.openingBalance, 0);
  const totalY5 = namedReserves.reduce((s, r) => {
    const yr = result.years[4]?.namedReserveResults.find((nr) => nr.id === r.id);
    return s + (yr?.closingBalance ?? r.openingBalance);
  }, 0);
  const earmarkedOpening = namedReserves.filter((r) => r.isEarmarked).reduce((s, r) => s + r.openingBalance, 0);
  const gfOpening = namedReserves.filter((r) => !r.isEarmarked).reduce((s, r) => s + r.openingBalance, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.15)]">
        <PiggyBank size={16} className="text-[#8b5cf6] mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-[#f0f4ff]">Named Reserves Schedule</p>
          <p className="text-[10px] text-[#8ca0c0] mt-1 leading-relaxed">
            Define individual named reserves with opening balances, planned contributions, and planned drawdowns for each year.
            When named reserves are entered, they replace the flat general fund / earmarked split used by default.
            The minimum balance field flags reserves that would breach their restricted floor.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.3)] text-[#8b5cf6] text-[11px] font-semibold hover:bg-[rgba(139,92,246,0.25)] transition-colors"
        >
          <Plus size={12} />
          Add Reserve
        </button>
      </div>

      {namedReserves.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Opening', value: fmtK(totalOpening), color: '#3b82f6' },
            { label: 'General Fund Opening', value: fmtK(gfOpening), color: '#3b82f6' },
            { label: 'Earmarked Opening', value: fmtK(earmarkedOpening), color: '#8b5cf6' },
            { label: 'Y5 Total Closing', value: fmtK(totalY5), color: totalY5 < totalOpening * 0.5 ? '#ef4444' : '#10b981' },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <p className="text-[9px] text-[#4a6080] uppercase tracking-widest font-semibold">{kpi.label}</p>
              <p className="mono text-[14px] font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
            </Card>
          ))}
        </div>
      )}

      {namedReserves.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-[rgba(99,179,237,0.12)]">
          <PiggyBank size={28} className="text-[#4a6080] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#f0f4ff]">No named reserves defined</p>
          <p className="text-[11px] text-[#4a6080] mt-1">
            The model uses the flat general fund / earmarked reserves from the Baseline Editor
          </p>
          <p className="text-[10px] text-[#4a6080] mt-2">
            Examples: General Fund, Insurance Reserve, Transformation Reserve, SEND Reserve, Carbon Reserve
          </p>
        </div>
      ) : (
        <div>
          <p className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold mb-3">
            {namedReserves.length} Named Reserve{namedReserves.length !== 1 ? 's' : ''}
          </p>
          {namedReserves.map((r) => <ReserveRow key={r.id} reserve={r} />)}
        </div>
      )}
    </div>
  );
}
