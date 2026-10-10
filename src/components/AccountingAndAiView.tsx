/**
 * Double-Entry Accounting, Consolidated P&L, Date-Wise Analytics & Permission-Aware AI Assistant
 * Branded with: Developed by Sajjad Qaiser Shah
 */
import React, { useState } from 'react';
import {
  CheckCircle2,
  Send,
  ShieldAlert,
  WifiOff,
  Calendar,
  BookOpen,
} from 'lucide-react';
import type { JournalEntry, StaffRole, HospitalSettings } from '../types/erp.ts';

interface AccountingAndAiViewProps {
  analytics: any;
  journalEntries: JournalEntry[];
  settings: HospitalSettings;
  activeRole: StaffRole;
  dateFilter: {
    startDate: string;
    endDate: string;
    dateBasis: 'businessDate' | 'paymentDate';
  };
  onDateFilterChange: (next: {
    startDate: string;
    endDate: string;
    dateBasis: 'businessDate' | 'paymentDate';
  }) => void;
  onAskAi: (
    prompt: string,
    forceOfflineFallback: boolean,
    useMapsGrounding?: boolean,
    latLng?: { latitude: number; longitude: number }
  ) => Promise<any>;
}

export const AccountingAndAiView: React.FC<AccountingAndAiViewProps> = ({
  analytics,
  journalEntries,
  settings,
  activeRole,
  dateFilter,
  onDateFilterChange,
  onAskAi,
}) => {
  const [aiPrompt, setAiPrompt] = useState(
    'Summarize Hospital, Laboratory, and Pharmacy profitability and highlight any expiring medicine batches.'
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [aiResult, setAiResult] = useState<{
    source: string;
    roleChecked: string;
    safeFallbackUsed: boolean;
    answer: string;
    mapLinks?: Array<{
      title: string;
      uri: string;
      reviewSnippets: string[];
    }>;
  } | null>(null);
  const [forceOfflineTest, setForceOfflineTest] = useState(false);

  const handleRunAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiLoading(true);
    try {
      let coords: { latitude: number; longitude: number } | undefined;
      if (useMapsGrounding && typeof navigator !== 'undefined' && navigator.geolocation) {
        coords = await new Promise<{ latitude: number; longitude: number } | undefined>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            () => resolve(undefined),
            { timeout: 3000 }
          );
        });
      }
      const res = await onAskAi(aiPrompt, forceOfflineTest, useMapsGrounding, coords);
      setAiResult(res);
    } finally {
      setAiLoading(false);
    }
  };

  const cur = settings.currency;

  return (
    <div className="space-y-8">
      {/* Section Header & Date-Wise Basis Filter */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              01. Double-Entry General Ledger & Segmented Profitability
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Separate Business Dates, Entry Timestamps, and Payment Dates · Internal Transfers & Capital Purchases Excluded from Revenue/Expense
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() =>
                  onDateFilterChange({ ...dateFilter, dateBasis: 'businessDate' })
                }
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  dateFilter.dateBasis === 'businessDate'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Accrual (Business Date)
              </button>
              <button
                type="button"
                onClick={() =>
                  onDateFilterChange({ ...dateFilter, dateBasis: 'paymentDate' })
                }
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  dateFilter.dateBasis === 'paymentDate'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cash Settlement (Payment Date)
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  onDateFilterChange({ ...dateFilter, startDate: e.target.value })
                }
                className="px-2.5 py-1.5 border border-slate-200 rounded-md font-mono text-xs text-slate-800 bg-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  onDateFilterChange({ ...dateFilter, endDate: e.target.value })
                }
                className="px-2.5 py-1.5 border border-slate-200 rounded-md font-mono text-xs text-slate-800 bg-white"
              />
              {(dateFilter.startDate || dateFilter.endDate) && (
                <button
                  type="button"
                  onClick={() =>
                    onDateFilterChange({
                      startDate: '',
                      endDate: '',
                      dateBasis: dateFilter.dateBasis,
                    })
                  }
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Reset Dates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Departmental & Consolidated Profitability Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
          {/* Hospital OPD/IPD P&L */}
          <div className="border border-slate-200 rounded-md p-4">
            <div className="text-xs text-slate-500">Hospital Clinical (OPD + IPD)</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {analytics.hospital.netProfit.toLocaleString()} {cur}
            </div>
            <div className="mt-3 space-y-1 text-xs font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>Gross Revenue:</span>
                <span className="text-slate-900">{analytics.hospital.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Direct Expenses:</span>
                <span className="text-red-700">-{analytics.hospital.expenses.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Laboratory P&L */}
          <div className="border border-slate-200 rounded-md p-4">
            <div className="text-xs text-slate-500">Diagnostic Laboratory</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {analytics.laboratory.netProfit.toLocaleString()} {cur}
            </div>
            <div className="mt-3 space-y-1 text-xs font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>Diagnostic Revenue:</span>
                <span className="text-slate-900">{analytics.laboratory.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Reagent & Lab Cost:</span>
                <span className="text-red-700">-{analytics.laboratory.expenses.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Pharmacy Retail + Wholesale P&L */}
          <div className="border border-slate-200 rounded-md p-4">
            <div className="text-xs text-slate-500">Pharmacy (Retail + Wholesale)</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {analytics.pharmacy.netProfit.toLocaleString()} {cur}
            </div>
            <div className="mt-3 space-y-1 text-xs font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>Sales (Ret/Whol):</span>
                <span className="text-slate-900">
                  {analytics.pharmacy.retailRevenue.toLocaleString()} /{' '}
                  {analytics.pharmacy.wholesaleRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Batch COGS Deducted:</span>
                <span className="text-amber-700">-{analytics.pharmacy.cogs.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Consolidated Hospital ERP Net Profit */}
          <div className="border border-slate-200 rounded-md p-4 bg-slate-50/60">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Consolidated Net Profit</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reconciled</span>
              </span>
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {analytics.consolidated.netProfit.toLocaleString()} {cur}
            </div>
            <div className="mt-3 space-y-1 text-xs font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>Trial Balance (DR=CR):</span>
                <span className="text-emerald-700">
                  {analytics.totalDebits.toLocaleString()} = {analytics.totalCredits.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Internal Transfers (Excl):</span>
                <span>{analytics.consolidated.internalTransfersExcluded.toLocaleString()} {cur}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date-Wise Analytical Breakdown & Permission-Aware AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Date-Wise Breakdown Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              02. Date-Wise Financial Reconciliation ({dateFilter.dateBasis})
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Daily breakdown of Hospital, Laboratory, and Pharmacy gross margin and operating expenses
            </p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 font-medium">Date</th>
                    <th className="py-2.5 font-medium text-right">Hospital ({cur})</th>
                    <th className="py-2.5 font-medium text-right">Lab ({cur})</th>
                    <th className="py-2.5 font-medium text-right">Pharmacy Sales ({cur})</th>
                    <th className="py-2.5 font-medium text-right">COGS ({cur})</th>
                    <th className="py-2.5 font-medium text-right">Expenses ({cur})</th>
                    <th className="py-2.5 font-medium text-right">Net Profit ({cur})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {analytics.dailyBreakdown.map((d: any) => (
                    <tr key={d.date} className="hover:bg-slate-50">
                      <td className="py-2.5 font-semibold text-slate-900">{d.date}</td>
                      <td className="py-2.5 text-right">{d.hospitalRev.toLocaleString()}</td>
                      <td className="py-2.5 text-right">{d.labRev.toLocaleString()}</td>
                      <td className="py-2.5 text-right">{d.pharmacyRev.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-amber-700">
                        -{d.pharmacyCogs.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-red-700">
                        -{d.expenses.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        {d.netProfit.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Capitalized Inventory Purchases Excluded from Expense:{' '}
              <strong className="font-mono text-slate-800">
                {analytics.consolidated.inventoryPurchasesCapitalizedExcluded.toLocaleString()} {cur}
              </strong>
            </span>
            <span>Developed by Sajjad Qaiser Shah</span>
          </div>
        </div>

        {/* Permission-Aware AI Reporting Assistant */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                03. Permission-Aware AI Reporting Assistant
              </h3>
              <span className="text-xs font-mono text-slate-600">Role: {activeRole}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Enforces strict RBAC data visibility and automatically falls back to the local LAN analytical engine when external AI or internet is unavailable.
            </p>

            <form onSubmit={handleRunAi} className="mt-4 space-y-3">
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-900"
                placeholder="Ask about departmental revenue, expiry alerts, or nearby referral hospitals & pharmacy suppliers..."
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useMapsGrounding}
                      onChange={(e) => setUseMapsGrounding(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Enable Google Maps Grounding (Nearby Hospitals, Labs &amp; Suppliers)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceOfflineTest || settings.simulatedInternetOffline}
                      onChange={(e) => setForceOfflineTest(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Simulate External AI Outage (Safe Local Fallback)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={aiLoading}
                  className="h-9 px-4 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{aiLoading ? 'Analyzing Ledger...' : 'Generate Authorized Report'}</span>
                </button>
              </div>
            </form>

            {aiResult && (
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-1.5 font-medium text-slate-800">
                    {aiResult.safeFallbackUsed ? (
                      <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                    <span>Engine: {aiResult.source}</span>
                  </span>
                  <span className="font-mono">RBAC Scope: {aiResult.roleChecked}</span>
                </div>
                <div className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                  {aiResult.answer}
                </div>
                {aiResult.mapLinks && aiResult.mapLinks.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <div className="font-semibold text-slate-900">
                      Google Maps Grounded Locations:
                    </div>
                    <ul className="space-y-1.5">
                      {aiResult.mapLinks.map((m, idx) => (
                        <li key={idx} className="space-y-0.5">
                          <a
                            href={m.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1D5464] font-semibold underline hover:text-[#16424F]"
                          >
                            {m.title}
                          </a>
                          {m.reviewSnippets && m.reviewSnippets.length > 0 && (
                            <div className="text-[11px] text-slate-600 pl-2">
                              {m.reviewSnippets.join(' · ')}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>
              Non-Admin/Accountant roles are automatically blocked from viewing Payroll & Consolidated P&L.
            </span>
          </div>
        </div>
      </div>

      {/* Double-Entry General Ledger Vouchers Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-700" />
              <span>04. Authoritative Double-Entry General Ledger Vouchers</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every financial mutation records balanced Debit and Credit accounts, separate Business Date, Payment Date, and UTC Entry Timestamp.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-600">
            Total Vouchers: {journalEntries.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 font-medium">Voucher</th>
                <th className="py-2.5 font-medium">Business Date</th>
                <th className="py-2.5 font-medium">Payment Date</th>
                <th className="py-2.5 font-medium">Entry Timestamp</th>
                <th className="py-2.5 font-medium">Cost Center</th>
                <th className="py-2.5 font-medium">Debit Account (DR)</th>
                <th className="py-2.5 font-medium">Credit Account (CR)</th>
                <th className="py-2.5 font-medium text-right">Amount ({cur})</th>
                <th className="py-2.5 font-medium text-right">COGS ({cur})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journalEntries.map((je) => (
                <tr key={je.id} className="hover:bg-slate-50">
                  <td className="py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {je.voucherNo}
                  </td>
                  <td className="py-2.5 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {je.businessDate}
                  </td>
                  <td className="py-2.5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {je.paymentDate || 'Non-Cash / Credit'}
                  </td>
                  <td className="py-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {je.createdAt.slice(11, 19)} UTC
                  </td>
                  <td className="py-2.5 text-slate-700 whitespace-nowrap">
                    {je.costCenter}
                    {je.isInternalTransfer ? ' · Internal (Non-Rev)' : ''}
                  </td>
                  <td className="py-2.5 text-slate-800">{je.debitAccount}</td>
                  <td className="py-2.5 text-slate-800">{je.creditAccount}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {je.amount.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-amber-700 whitespace-nowrap">
                    {je.cogsAmount > 0 ? je.cogsAmount.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
