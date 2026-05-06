import React, { useState } from 'react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { ChevronRight } from 'lucide-react';

function fmtK(v: number, decimals = 0) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${sign}£${abs.toLocaleString('en-GB', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}k`;
}

interface TableSectionProps {
  title: string;
  rows: { label: string; isTotal?: boolean; isSub?: boolean; values: (number | null)[]; colorFn?: (v: number) => string }[];
  years: string[];
}

function TableSection({ title, rows }: TableSectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-2 px-1 text-left hover:bg-[rgba(99,179,237,0.03)] rounded transition-colors"
      >
        <ChevronRight
          size={12}
          className={`text-[#4a6080] transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-[10px] font-bold tracking-widest uppercase text-[#4a6080]">{title}</span>
      </button>
      {open && (
        <table className="w-full premium-table text-[11px] mb-3">
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-[rgba(99,179,237,0.04)] ${
                  row.isTotal ? 'bg-[rgba(99,179,237,0.04)]' : 'hover:bg-[rgba(99,179,237,0.02)]'
                }`}
              >
                <td
                  className={`py-1.5 pr-4 ${
                    row.isTotal ? 'font-bold text-[#f0f4ff]' : row.isSub ? 'pl-4 text-[#4a6080]' : 'text-[#8ca0c0]'
                  }`}
                  style={{ width: '35%' }}
                >
                  {row.label}
                </td>
                {row.values.map((v, j) => {
                  const color = row.colorFn && v !== null ? row.colorFn(v) : row.isTotal ? '#f0f4ff' : '#8ca0c0';
                  return (
                    <td key={j} className="py-1.5 text-right mono px-2" style={{ color }}>
                      {v === null ? '—' : fmtK(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function TechnicalDetail() {
  const { result } = useMTFSStore();
  const { years } = result;
  const yearLabels = years.map((y) => y.label);

  const fundingRows = [
    { label: 'Council Tax', values: years.map((y) => y.councilTax) },
    { label: 'Business Rates', values: years.map((y) => y.businessRates) },
    { label: 'Core Grants', values: years.map((y) => y.coreGrants) },
    { label: 'Fees & Charges', values: years.map((y) => y.feesAndCharges) },
    { label: 'Total Funding', isTotal: true, values: years.map((y) => y.totalFunding), colorFn: () => '#3b82f6' },
  ];

  const expenditureRows = [
    { label: 'Pay (Base)', values: years.map((y) => y.payBase) },
    { label: 'Pay Inflation Impact', isSub: true, values: years.map((y) => y.payInflationImpact), colorFn: (v: number) => v > 0 ? '#f59e0b' : '#8ca0c0' },
    { label: 'Non-Pay (Base)', values: years.map((y) => y.nonPayBase) },
    { label: 'Non-Pay Inflation Impact', isSub: true, values: years.map((y) => y.nonPayInflationImpact), colorFn: (v: number) => v > 0 ? '#f59e0b' : '#8ca0c0' },
    { label: 'ASC Demand-Led', values: years.map((y) => y.ascPressure), colorFn: () => '#f97316' },
    { label: 'CSC Demand-Led', values: years.map((y) => y.cscPressure), colorFn: () => '#fb923c' },
    { label: 'Other Service Expenditure', values: years.map((y) => y.otherServiceExp) },
    { label: 'Gross Expenditure (before savings)', isTotal: true, values: years.map((y) => y.grossExpenditureBeforeSavings) },
    { label: 'Less: Delivered Savings', values: years.map((y) => -y.deliveredSavings), colorFn: () => '#10b981' },
    { label: 'Net Expenditure', isTotal: true, values: years.map((y) => y.totalExpenditure), colorFn: () => '#ef4444' },
  ];

  const gapRows = [
    { label: 'Total Funding', values: years.map((y) => y.totalFunding), colorFn: () => '#3b82f6' },
    { label: 'Total Expenditure', values: years.map((y) => -y.totalExpenditure), colorFn: () => '#ef4444' },
    { label: 'Raw Budget Gap', isTotal: true, values: years.map((y) => y.rawGap), colorFn: (v: number) => v > 0 ? '#ef4444' : '#10b981' },
    { label: 'Reserves Drawdown', values: years.map((y) => -y.reservesDrawdown), colorFn: () => '#f59e0b' },
    { label: 'Net Gap After Reserves', isTotal: true, values: years.map((y) => y.netGap), colorFn: (v: number) => v > 0 ? '#ef4444' : '#10b981' },
  ];

  const reservesRows = [
    { label: 'General Fund Opening', values: years.map((y) => y.generalFundOpeningBalance) },
    { label: 'Earmarked Opening', values: years.map((y) => y.earmarkedOpeningBalance) },
    { label: 'Total Opening Reserves', isTotal: true, values: years.map((y) => y.totalOpeningReserves) },
    { label: 'GF Closing Balance', values: years.map((y) => y.generalFundClosingBalance), colorFn: (v: number) => v < 5000 ? '#ef4444' : '#3b82f6' },
    { label: 'Earmarked Closing Balance', values: years.map((y) => y.earmarkedClosingBalance), colorFn: () => '#8b5cf6' },
    { label: 'Total Closing Reserves', isTotal: true, values: years.map((y) => y.totalClosingReserves), colorFn: (v: number) => v < 8000 ? '#ef4444' : '#3b82f6' },
  ];

  const fundingBridgeRows = [
    { label: 'Council Tax Baseline', values: years.map((y) => y.fundingBridge.baseline.councilTax) },
    { label: 'Council Tax Modelled', values: years.map((y) => y.fundingBridge.modelled.councilTax), colorFn: () => '#3b82f6' },
    { label: 'Council Tax Delta', values: years.map((y) => y.fundingBridge.deltas.councilTax), colorFn: (v: number) => v >= 0 ? '#10b981' : '#ef4444' },
    { label: 'Business Rates Delta', values: years.map((y) => y.fundingBridge.deltas.businessRates), colorFn: (v: number) => v >= 0 ? '#10b981' : '#ef4444' },
    { label: 'Grants Delta', values: years.map((y) => y.fundingBridge.deltas.grants), colorFn: (v: number) => v >= 0 ? '#10b981' : '#ef4444' },
    { label: 'Other Funding Delta', values: years.map((y) => y.fundingBridge.deltas.otherFunding), colorFn: (v: number) => v >= 0 ? '#10b981' : '#ef4444' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="overflow-x-auto">
          {/* Column headers */}
          <div className="flex items-center mb-3">
            <div className="text-[10px] text-[#4a6080] font-semibold uppercase tracking-widest" style={{ width: '35%' }}>
              Line Item
            </div>
            {yearLabels.map((y) => (
              <div key={y} className="flex-1 text-right text-[10px] font-bold text-[#8ca0c0] uppercase tracking-widest px-2">
                {y}
              </div>
            ))}
          </div>

          <TableSection title="Funding (£000s)" rows={fundingRows} years={yearLabels} />
          <TableSection title="Funding Bridge (Baseline to Modelled)" rows={fundingBridgeRows} years={yearLabels} />
          <TableSection title="Expenditure (£000s)" rows={expenditureRows} years={yearLabels} />
          <TableSection title="Budget Gap Analysis (£000s)" rows={gapRows} years={yearLabels} />
          <TableSection title="Reserves Movement (£000s)" rows={reservesRows} years={yearLabels} />
        </div>

        <p className="text-[9px] text-[#4a6080] mt-4 leading-relaxed border-t border-[rgba(99,179,237,0.06)] pt-3">
          All figures in £000s. Expenditure model uses driver-based methodology: base + pay inflation + non-pay inflation + demand growth − delivered savings.
          Savings delivery is subject to achievement risk adjustment and time-lag ramp. Reserves are tracked by type with minimum threshold enforcement.
        </p>
      </Card>

      {/* Flags table */}
      <Card>
        <CardHeader>
          <CardTitle>Sustainability Flags by Year</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full premium-table text-[11px]">
            <thead>
              <tr className="border-b border-[rgba(99,179,237,0.08)]">
                <th className="text-left py-2 text-[#4a6080] font-semibold pr-6">Flag</th>
                {yearLabels.map((y) => (
                  <th key={y} className="text-center py-2 text-[#4a6080] font-semibold px-2">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Structural Deficit', key: 'structuralDeficit' as const },
                { label: 'Over-Reliant on Reserves', key: 'overReliantOnReserves' as const },
                { label: 'Unrealistic Savings', key: 'unrealisticSavings' as const },
                { label: 'Below Reserve Threshold', key: 'reservesBelowThreshold' as const },
                { label: 'Reserves Exhausted', key: 'reservesExhausted' as const },
              ].map((flag) => (
                <tr key={flag.label} className="border-b border-[rgba(99,179,237,0.04)] hover:bg-[rgba(99,179,237,0.02)]">
                  <td className="py-2 text-[#8ca0c0] pr-6">{flag.label}</td>
                  {years.map((y) => {
                    const val = y[flag.key];
                    return (
                      <td key={y.year} className="py-2 text-center px-2">
                        {val
                          ? <span className="bg-[rgba(239,68,68,0.15)] text-[#ef4444] text-[9px] px-1.5 py-0.5 rounded font-bold">YES</span>
                          : <span className="bg-[rgba(16,185,129,0.08)] text-[#4a6080] text-[9px] px-1.5 py-0.5 rounded">—</span>
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
