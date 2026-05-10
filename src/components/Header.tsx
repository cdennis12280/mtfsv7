import React from 'react';
import { Activity, BarChart3, Database, TrendingDown, PiggyBank, ShieldCheck, Users, Calculator, Presentation, UserCheck } from 'lucide-react';
import { useMTFSStore } from '../store/mtfsStore';
import clsx from 'clsx';
import { RichTooltip } from './ui/RichTooltip';
import { ROLE_PRESETS, saveStateLabel } from '../utils/uiUx';

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
    activeRole,
    rolePreset,
    setRolePreset,
    result,
    authorityConfig,
    enterCfoDemoMode,
    saveState,
    workflowState,
    printPreviewMode,
    setPrintPreviewMode,
  } = useMTFSStore();

  const criticalCount = result.insights.filter((i) => i.type === 'critical').length;
  const warningCount = result.insights.filter((i) => i.type === 'warning').length;
  const visibleTabs = ROLE_PRESETS[rolePreset]?.tabs
    ? TABS.filter((t) => ROLE_PRESETS[rolePreset].tabs.includes(t.id))
    : activeRole === 'members' ? TABS.filter((t) => MEMBER_TABS.has(t.id)) : TABS;
  const confidence = Math.max(0, Math.min(100, 100 - (result.riskFactors.length * 4) - (workflowState.baselineLocked ? 0 : 10) - (workflowState.assumptionsFrozen ? 0 : 5)));

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
          <div className="hidden xl:flex items-center gap-2 rounded-lg border border-[rgba(99,179,237,0.12)] bg-[#080c14] px-2 py-1.5">
            <span className="text-[9px] uppercase tracking-widest text-[#4a6080]">Confidence</span>
            <span className={`mono text-[11px] font-bold ${confidence >= 80 ? 'text-[#10b981]' : confidence >= 60 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>{confidence}/100</span>
            <span className="text-[9px] text-[#8ca0c0]">{saveStateLabel(saveState)}</span>
          </div>
          <button
            onClick={enterCfoDemoMode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(16,185,129,0.32)] bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[10px] font-bold hover:bg-[rgba(16,185,129,0.18)]"
            title="Open the 10-minute CFO and Head of Finance demo walkthrough."
          >
            <Presentation size={12} />
            CFO Demo
          </button>
          <button
            onClick={() => setPrintPreviewMode(printPreviewMode === 'none' ? 'cfo_brief' : 'none')}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(99,179,237,0.2)] bg-[rgba(99,179,237,0.06)] text-[#8ca0c0] text-[10px] font-bold hover:bg-[rgba(99,179,237,0.1)]"
          >
            Preview Pack
          </button>
          <div className="flex items-center bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg p-0.5">
            {([
              { id: 'cfo' as const, label: 'CFO/S151', icon: <Calculator size={11} /> },
              { id: 'head_of_finance' as const, label: 'HoF', icon: <UserCheck size={11} /> },
              { id: 'councillor' as const, label: 'Cllr', icon: <Users size={11} /> },
            ]).map((role) => (
              <button
                key={role.id}
                onClick={() => setRolePreset(role.id)}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all',
                  rolePreset === role.id ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-[#4a6080] hover:text-[#8ca0c0]'
                )}
              >
                {role.icon}
                {role.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div id="header-tabs" className="flex items-center px-5 gap-1 overflow-x-auto">
        {visibleTabs.map((tab) => {
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
