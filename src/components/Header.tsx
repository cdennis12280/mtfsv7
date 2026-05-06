import React from 'react';
import { Activity, BarChart3, Database, TrendingDown, PiggyBank, ShieldCheck, Users, Calculator } from 'lucide-react';
import { useMTFSStore } from '../store/mtfsStore';
import clsx from 'clsx';
import { RichTooltip } from './ui/RichTooltip';

const TABS = [
  { id: 'summary', label: 'Summary', icon: <BarChart3 size={13} /> },
  { id: 'baseline', label: 'Baseline', icon: <Database size={13} /> },
  { id: 'savings', label: 'Savings', icon: <TrendingDown size={13} /> },
  { id: 'reserves', label: 'Reserves', icon: <PiggyBank size={13} /> },
  { id: 'scenarios', label: 'Scenarios', icon: <BarChart3 size={13} /> },
  { id: 'governance', label: 'Governance', icon: <ShieldCheck size={13} /> },
];

const MEMBER_TABS = new Set(['summary', 'scenarios', 'governance']);

export function Header() {
  const {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    activeRole,
    setActiveRole,
    result,
    authorityConfig,
  } = useMTFSStore();

  const criticalCount = result.insights.filter((i) => i.type === 'critical').length;
  const warningCount = result.insights.filter((i) => i.type === 'warning').length;
  const visibleTabs = activeRole === 'members' ? TABS.filter((t) => MEMBER_TABS.has(t.id)) : TABS;

  return (
    <div id="top-header" className="border-b border-[rgba(99,179,237,0.08)] bg-[#0a1120]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Activity size={14} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="heading-display text-[14px] font-bold text-[#f0f4ff] tracking-tight">MTFS</span>
                <span className="text-[13px] text-[#4a6080]">Financial Resilience Studio</span>
                <RichTooltip content="Medium Term Financial Strategy modelling workspace. Change assumptions and compare scenarios in real time." />
                {authorityConfig.authorityName && authorityConfig.authorityName !== 'Example Unitary Authority' && (
                  <>
                    <span className="text-[#4a6080]">·</span>
                    <span className="text-[12px] font-semibold text-[#8ca0c0] truncate max-w-[200px]">
                      {authorityConfig.authorityName}
                    </span>
                  </>
                )}
              </div>
              {authorityConfig.section151Officer && authorityConfig.authorityName !== 'Example Unitary Authority' && (
                <p className="text-[9px] text-[#4a6080]">
                  S151: {authorityConfig.section151Officer} · {authorityConfig.authorityType} · {authorityConfig.reportingPeriod}
                </p>
              )}
            </div>
          </div>
          <div className="h-4 w-px bg-[rgba(99,179,237,0.15)] mx-1" />
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulse-dot" />
            <span className="text-[10px] text-[#4a6080]">Live · {new Date().getFullYear()}–{new Date().getFullYear() + 4}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg p-0.5">
            {([
              { id: 'finance' as const, label: 'Finance', icon: <Calculator size={11} /> },
              { id: 'members' as const, label: 'Member', icon: <Users size={11} /> },
            ]).map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all',
                  activeRole === role.id ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-[#4a6080] hover:text-[#8ca0c0]'
                )}
              >
                {role.icon}
                {role.label}
              </button>
            ))}
          </div>
          <div className="flex items-center bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg p-0.5">
            <RichTooltip content="Switch between strategic summary and full technical finance detail." className="mx-1" />
            {(['strategic', 'technical'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={mode === 'strategic' ? 'Strategic view for leadership and members.' : 'Technical view with full finance detail.'}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-[10px] font-semibold capitalize transition-all',
                  viewMode === mode ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-[#4a6080] hover:text-[#8ca0c0]'
                )}
              >
                {mode} View
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div id="header-tabs" className="flex items-center px-5 gap-1 overflow-x-auto">
        {visibleTabs.map((tab, i) => {
            return (
              <React.Fragment key={tab.id}>
                <button
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  title={`Open ${tab.label} panel`}
                  className={clsx(
                    'group flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium whitespace-nowrap border rounded-lg transition-all shrink-0',
                    activeTab === tab.id
                      ? 'text-[#dbeafe] border-[#3b82f6] bg-[rgba(59,130,246,0.2)] shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                      : 'text-[#4a6080] border-transparent hover:text-[#8ca0c0] hover:border-[rgba(99,179,237,0.2)] hover:bg-[rgba(99,179,237,0.05)]'
                  )}
                >
                  <span className={activeTab === tab.id ? 'text-[#60a5fa]' : 'text-[#4a6080] group-hover:text-[#8ca0c0]'}>{tab.icon}</span>
                  {tab.label}
                  {activeTab === tab.id && <span className="w-1 h-1 rounded-full bg-[#3b82f6]" />}
                  {tab.id === 'summary' && (criticalCount > 0 || warningCount > 0) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] pulse-dot ml-0.5" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
      </div>
    </div>
  );
}
