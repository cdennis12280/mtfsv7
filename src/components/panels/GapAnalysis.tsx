import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend
} from 'recharts';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { AlertTriangle, CheckCircle } from 'lucide-react';

function fmtK(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}£${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`;
  return `${sign}£${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`;
}

interface TooltipPoint {
  color?: string;
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  fill?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPoint[];
  label?: string | number;
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

export function GapAnalysis() {
  const { result, peerBenchmark } = useMTFSStore();
  const { years } = result;

  const areaData = years.map((y) => ({
    year: y.label,
    Funding: Math.round(y.totalFunding),
    Expenditure: Math.round(y.totalExpenditure),
    Gap: Math.round(y.rawGap),
  }));

  const waterfallData = years.length > 0 ? [
    { name: 'Pay Pressure', value: Math.round(years[years.length - 1].payInflationImpact), color: '#ef4444' },
    { name: 'Non-Pay Inflation', value: Math.round(years[years.length - 1].nonPayInflationImpact), color: '#f59e0b' },
    { name: 'ASC Demand', value: Math.round(years[years.length - 1].ascPressure - years[0].ascPressure), color: '#f97316' },
    { name: 'CSC Demand', value: Math.round(years[years.length - 1].cscPressure - years[0].cscPressure), color: '#fb923c' },
    { name: 'Funding Growth', value: Math.round(-(years[years.length - 1].totalFunding - years[0].totalFunding)), color: '#10b981' },
    { name: 'Savings Delivered', value: Math.round(-years[years.length - 1].deliveredSavings), color: '#3b82f6' },
  ] : [];

  const gapBarData = years.map((y) => ({
    year: y.label,
    gap: Math.round(y.rawGap),
    net: Math.round(y.netGap),
    reserves: Math.round(y.reservesDrawdown),
    peerGap: Math.round((y.totalFunding * peerBenchmark.peerMedianGapPct) / 100),
  }));

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {years.map((y) => {
          const isDeficit = y.rawGap > 0;
          return (
            <Card key={y.year} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isDeficit
                    ? 'bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.25)]'
                    : 'bg-[rgba(16,185,129,0.12)] border-[rgba(16,185,129,0.25)]'
                } border`}
              >
                {isDeficit
                  ? <AlertTriangle size={14} className="text-[#ef4444]" />
                  : <CheckCircle size={14} className="text-[#10b981]" />
                }
              </div>
              <div>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">{y.label}</p>
                <p
                  className={`mono text-sm font-bold ${isDeficit ? 'text-[#ef4444]' : 'text-[#10b981]'}`}
                >
                  {isDeficit ? '+' : ''}{fmtK(y.rawGap)}
                </p>
                <p className="text-[9px] text-[#4a6080]">{isDeficit ? 'deficit' : 'surplus'}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Funding vs Expenditure Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Funding vs Expenditure Trajectory</CardTitle>
          <span className="text-[10px] text-[#4a6080]">£000s</span>
        </CardHeader>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFunding" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" />
              <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `£${(v / 1000).toLocaleString('en-GB', { maximumFractionDigits: 0 })}m`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8ca0c0', paddingTop: 8 }} />
              <Area
                type="monotone" dataKey="Funding" stroke="#3b82f6" strokeWidth={2}
                fill="url(#gradFunding)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }}
              />
              <Area
                type="monotone" dataKey="Expenditure" stroke="#ef4444" strokeWidth={2}
                fill="url(#gradExp)" dot={false} activeDot={{ r: 4, fill: '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Gap Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Annual Budget Gap</CardTitle>
            <span className="text-[10px] text-[#4a6080]">£000s</span>
          </CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapBarData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#4a6080', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toLocaleString('en-GB', { maximumFractionDigits: 0 })}m`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(99,179,237,0.3)" strokeDasharray="4 4" />
                <Bar dataKey="gap" name="Gross Gap" radius={[3, 3, 0, 0]}>
                  {gapBarData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.gap > 0 ? '#ef4444' : '#10b981'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
                <Bar dataKey="reserves" name="Reserves Used" fill="#f59e0b" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                {peerBenchmark.enabled && (
                  <Bar dataKey="peerGap" name="Peer Median Gap" fill="#06b6d4" fillOpacity={0.45} radius={[3, 3, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Drivers Waterfall (simplified) */}
        <Card>
          <CardHeader>
            <CardTitle>Drivers of Year-5 Gap</CardTitle>
            <span className="text-[10px] text-[#4a6080]">£000s change from base</span>
          </CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={waterfallData}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 80, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${(v / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#8ca0c0', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  content={({ active, payload, label }: ChartTooltipProps) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0];
                    const pointValue = Number(point?.value) || 0;
                    return (
                      <div className="bg-[#1a2540] border border-[rgba(99,179,237,0.2)] rounded-lg p-2 text-xs">
                        <p className="text-[#f0f4ff] font-semibold">{label}</p>
                        <p className="mono" style={{ color: point?.fill }}>
                          {pointValue > 0 ? '+' : ''}{fmtK(pointValue)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" name="Impact" radius={[0, 3, 3, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
