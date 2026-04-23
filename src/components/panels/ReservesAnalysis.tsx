import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend
} from 'recharts';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { AlertTriangle, TrendingDown, Shield } from 'lucide-react';
import { DEFAULT_BASELINE } from '../../engine/calculations';

function fmtK(v: number) {
  const abs = Math.abs(v);
  return `£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
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

export function ReservesAnalysis() {
  const { result, baseline } = useMTFSStore();
  const { years } = result;
  const safeBaseline = baseline || DEFAULT_BASELINE;
  const useNamedReserves = safeBaseline.namedReserves.length > 0;
  const openingGeneralFund = useNamedReserves
    ? safeBaseline.namedReserves.filter((r) => !r.isEarmarked).reduce((sum, r) => sum + r.openingBalance, 0)
    : safeBaseline.generalFundReserves;
  const openingEarmarked = useNamedReserves
    ? safeBaseline.namedReserves.filter((r) => r.isEarmarked).reduce((sum, r) => sum + r.openingBalance, 0)
    : safeBaseline.earmarkedReserves;
  const openingTotal = openingGeneralFund + openingEarmarked;
  const minThreshold = result.effectiveMinimumReservesThreshold;

  const reservesData = [
    {
      year: 'Baseline',
      'General Fund': Math.round(openingGeneralFund),
      'Earmarked': Math.round(openingEarmarked),
      Total: Math.round(openingTotal),
    },
    ...years.map((y) => ({
      year: y.label,
      'General Fund': Math.round(y.generalFundClosingBalance),
      'Earmarked': Math.round(y.earmarkedClosingBalance),
      Total: Math.round(y.totalClosingReserves),
    })),
  ];

  const getYearTotalDrawdown = (year: (typeof years)[number]) => {
    const namedDrawdown = (year.namedReserveResults ?? []).reduce((sum, reserve) => sum + (reserve.drawdown || 0), 0);
    return (year.reservesDrawdown || 0) + namedDrawdown;
  };

  const drawdownData = years.map((y) => ({
    year: y.label,
    drawdown: Math.round(getYearTotalDrawdown(y)),
    closing: Math.round(y.totalClosingReserves),
  }));

  const lastYear = years[years.length - 1];
  const totalCloseReserves = lastYear?.totalClosingReserves ?? 0;
  const isBelow = totalCloseReserves < minThreshold;
  const depletionPct = openingTotal > 0 ? ((openingTotal - totalCloseReserves) / openingTotal) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-[#3b82f6]" />
            <span className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold">Opening Reserves</span>
          </div>
          <p className="mono text-lg font-bold text-[#3b82f6]">{fmtK(openingTotal)}</p>
          <p className="text-[9px] text-[#4a6080] mt-0.5">General Fund + Earmarked</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className={isBelow ? 'text-[#ef4444]' : 'text-[#f59e0b]'} />
            <span className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold">Year-5 Closing Balance</span>
          </div>
          <p className={`mono text-lg font-bold ${isBelow ? 'text-[#ef4444]' : 'text-[#f0f4ff]'}`}>
            {fmtK(totalCloseReserves)}
          </p>
          <p className="text-[9px] text-[#4a6080] mt-0.5">
            {depletionPct > 0 ? `${depletionPct.toFixed(0)}% depleted` : 'Reserves growing'}
          </p>
        </Card>

        <Card className={isBelow ? 'border-[rgba(239,68,68,0.25)]' : ''}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className={isBelow ? 'text-[#ef4444]' : 'text-[#10b981]'} />
            <span className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold">Minimum Threshold</span>
          </div>
          <p className="mono text-lg font-bold text-[#f0f4ff]">{fmtK(minThreshold)}</p>
          <p className={`text-[9px] mt-0.5 ${isBelow ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
            {isBelow ? 'THRESHOLD BREACHED at Year 5' : 'Threshold maintained'}
          </p>
        </Card>
      </div>

      {/* Reserves Depletion Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Reserves Depletion Curve</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#ef4444] border-dashed" style={{ borderTop: '2px dashed #ef4444', height: 0 }} />
              <span className="text-[9px] text-[#4a6080]">Min. Threshold</span>
            </div>
          </div>
        </CardHeader>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={reservesData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradGF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradEM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" />
              <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `£${(v / 1000).toLocaleString('en-GB', { maximumFractionDigits: 0 })}m`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8ca0c0', paddingTop: 8 }} />
              <ReferenceLine
                y={minThreshold}
                stroke="#ef4444"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{ value: 'Min Threshold', position: 'right', fill: '#ef4444', fontSize: 10 }}
              />
              <Area
                type="monotone" dataKey="General Fund" stroke="#3b82f6" strokeWidth={2}
                fill="url(#gradGF)" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }}
              />
              <Area
                type="monotone" dataKey="Earmarked" stroke="#8b5cf6" strokeWidth={2}
                fill="url(#gradEM)" dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Annual drawdown + closing balance */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Reserves Drawdown & Closing Balance</CardTitle>
          <span className="text-[10px] text-[#4a6080]">£000s</span>
        </CardHeader>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={drawdownData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8ca0c0', paddingTop: 8 }} />
              <Bar dataKey="drawdown" name="Drawdown" fill="#f59e0b" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
              <Bar dataKey="closing" name="Closing Balance" fill="#3b82f6" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailed table */}
      <Card>
        <CardHeader>
          <CardTitle>Reserves Movement Schedule</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full premium-table text-[11px]">
            <thead>
              <tr className="border-b border-[rgba(99,179,237,0.08)]">
                <th className="text-left py-2 text-[#4a6080] font-semibold pr-4">Year</th>
                <th className="text-right py-2 text-[#4a6080] font-semibold pr-4">Opening</th>
                <th className="text-right py-2 text-[#4a6080] font-semibold pr-4">Drawdown</th>
                <th className="text-right py-2 text-[#4a6080] font-semibold pr-4">Closing</th>
                <th className="text-right py-2 text-[#4a6080] font-semibold pr-4">vs Threshold</th>
                <th className="text-right py-2 text-[#4a6080] font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => {
                const vsThreshold = y.totalClosingReserves - minThreshold;
                const ok = vsThreshold >= 0;
                const totalDrawdown = getYearTotalDrawdown(y);
                return (
                  <tr key={y.year} className="border-b border-[rgba(99,179,237,0.04)] hover:bg-[rgba(99,179,237,0.02)]">
                    <td className="py-2 font-semibold text-[#f0f4ff] pr-4">{y.label}</td>
                    <td className="py-2 text-right mono text-[#8ca0c0] pr-4">{fmtK(y.totalOpeningReserves)}</td>
                    <td className="py-2 text-right mono text-[#f59e0b] pr-4">
                      {totalDrawdown > 0 ? `-${fmtK(totalDrawdown)}` : '—'}
                    </td>
                    <td className="py-2 text-right mono font-semibold text-[#f0f4ff] pr-4">{fmtK(y.totalClosingReserves)}</td>
                    <td className={`py-2 text-right mono pr-4 ${ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {ok ? '+' : ''}{fmtK(vsThreshold)}
                    </td>
                    <td className="py-2 text-right">
                      {y.reservesExhausted
                        ? <span className="bg-[rgba(239,68,68,0.15)] text-[#ef4444] text-[9px] px-1.5 py-0.5 rounded font-semibold">EXHAUSTED</span>
                        : y.reservesBelowThreshold
                          ? <span className="bg-[rgba(245,158,11,0.15)] text-[#f59e0b] text-[9px] px-1.5 py-0.5 rounded font-semibold">BELOW MIN</span>
                          : <span className="bg-[rgba(16,185,129,0.15)] text-[#10b981] text-[9px] px-1.5 py-0.5 rounded font-semibold">ADEQUATE</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
