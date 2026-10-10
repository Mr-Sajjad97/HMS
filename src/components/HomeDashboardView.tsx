/**
 * Modern Hospital ERP Home Dashboard — Daily, Weekly & Monthly Profit/Loss Analytics & Organized Command Center
 * Branded with: Developed by Sajjad Qaiser Shah
 */
import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  FlaskConical,
  Pill,
  Receipt,
  Landmark,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Plus,
  Activity,
  Users,
  FileText,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import type {
  Patient,
  Encounter,
  LabOrder,
  PharmacyBatch,
  Invoice,
} from '../types/erp.ts';

export type HomeTargetModule =
  | 'home'
  | 'clinical'
  | 'laboratory'
  | 'pharmacy'
  | 'billing_hr'
  | 'accounting_security';

interface HomeDashboardViewProps {
  hospitalName: string;
  currency: string;
  analytics: any;
  patients: Patient[];
  encounters: Encounter[];
  labOrders: LabOrder[];
  pharmacyBatches: PharmacyBatch[];
  invoices: Invoice[];
  onNavigateModule: (module: HomeTargetModule, subSection?: string) => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  hospitalName,
  currency,
  analytics,
  patients,
  encounters,
  labOrders,
  pharmacyBatches,
  invoices,
  onNavigateModule,
}) => {
  const [chartRange, setChartRange] = useState<'MONTHLY' | 'WEEKLY' | 'RECENT_3'>('MONTHLY');
  const [chartMode, setChartMode] = useState<'REVENUE_VS_EXPENSE' | 'PROFIT_VS_LOSS'>('REVENUE_VS_EXPENSE');

  const dailyList: Array<{
    date: string;
    hospitalRev: number;
    labRev: number;
    pharmacyRev: number;
    pharmacyCogs: number;
    expenses: number;
    netProfit: number;
  }> = analytics?.dailyBreakdown || [];

  // Sort chronologically (oldest -> newest) for charts
  const chronologicalDays = useMemo(() => {
    return [...dailyList]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const totalRevenue = d.hospitalRev + d.labRev + d.pharmacyRev;
        const totalCostAndLoss = d.pharmacyCogs + d.expenses;
        const netProfit = d.netProfit;
        return {
          ...d,
          shortDate: d.date.slice(5), // e.g. 10-01
          totalRevenue,
          totalCostAndLoss,
          netProfit,
          profitOnly: netProfit > 0 ? netProfit : 0,
          lossOnly: netProfit < 0 ? Math.abs(netProfit) : 0,
        };
      });
  }, [dailyList]);

  // Filtered chart dataset based on user's selected timeframe button
  const filteredChartData = useMemo(() => {
    if (chartRange === 'RECENT_3') {
      return chronologicalDays.slice(-3);
    }
    if (chartRange === 'WEEKLY') {
      return chronologicalDays.slice(-7);
    }
    return chronologicalDays;
  }, [chronologicalDays, chartRange]);

  // Compute Daily (Today), Weekly (Last 7 Days), and Monthly (Current Month) Summaries
  const periodMetrics = useMemo(() => {
    const sortedDesc = [...chronologicalDays].sort((a, b) => b.date.localeCompare(a.date));
    const todayDateStr = sortedDesc[0]?.date || '2026-10-10';
    const currentMonthPrefix = todayDateStr.slice(0, 7); // '2026-10'

    const todayEntry = sortedDesc.find((d) => d.date === todayDateStr) || {
      date: todayDateStr,
      totalRevenue: 0,
      totalCostAndLoss: 0,
      netProfit: 0,
      hospitalRev: 0,
      labRev: 0,
      pharmacyRev: 0,
      pharmacyCogs: 0,
      expenses: 0,
    };

    // Weekly: dates within last 7 calendar days (e.g., >= 2026-10-04)
    const weeklyEntries = chronologicalDays.filter((d) => d.date >= '2026-10-04');
    const weeklyRevenue = weeklyEntries.reduce((acc, d) => acc + d.totalRevenue, 0);
    const weeklyCostAndLoss = weeklyEntries.reduce((acc, d) => acc + d.totalCostAndLoss, 0);
    const weeklyNetProfit = weeklyEntries.reduce((acc, d) => acc + d.netProfit, 0);
    const weeklyLossDaysTotal = weeklyEntries
      .filter((d) => d.netProfit < 0)
      .reduce((acc, d) => acc + Math.abs(d.netProfit), 0);

    // Monthly: all dates in current month (e.g. 2026-10)
    const monthlyEntries = chronologicalDays.filter((d) =>
      d.date.startsWith(currentMonthPrefix)
    );
    const monthlyRevenue = monthlyEntries.reduce((acc, d) => acc + d.totalRevenue, 0);
    const monthlyCostAndLoss = monthlyEntries.reduce((acc, d) => acc + d.totalCostAndLoss, 0);
    const monthlyNetProfit = monthlyEntries.reduce((acc, d) => acc + d.netProfit, 0);
    const monthlyLossDaysTotal = monthlyEntries
      .filter((d) => d.netProfit < 0)
      .reduce((acc, d) => acc + Math.abs(d.netProfit), 0);
    const lossDaysCount = monthlyEntries.filter((d) => d.netProfit < 0).length;
    const profitDaysCount = monthlyEntries.filter((d) => d.netProfit >= 0).length;

    return {
      todayDateStr,
      currentMonthPrefix,
      today: todayEntry,
      weekly: {
        revenue: weeklyRevenue,
        costAndLoss: weeklyCostAndLoss,
        netProfit: weeklyNetProfit,
        lossDaysTotal: weeklyLossDaysTotal,
        daysCount: weeklyEntries.length,
      },
      monthly: {
        revenue: monthlyRevenue,
        costAndLoss: monthlyCostAndLoss,
        netProfit: monthlyNetProfit,
        lossDaysTotal: monthlyLossDaysTotal,
        profitDaysCount,
        lossDaysCount,
        marginPct:
          monthlyRevenue > 0 ? Math.round((monthlyNetProfit / monthlyRevenue) * 100) : 0,
      },
    };
  }, [chronologicalDays]);

  // Departmental comparison bar chart data
  const departmentChartData = useMemo(() => {
    const hospRev = analytics?.hospital?.revenue || 0;
    const hospExp = analytics?.hospital?.expenses || 0;
    const hospNet = analytics?.hospital?.netProfit || 0;

    const labRev = analytics?.laboratory?.revenue || 0;
    const labExp = analytics?.laboratory?.expenses || 0;
    const labNet = analytics?.laboratory?.netProfit || 0;

    const pharmRev = analytics?.pharmacy?.totalRevenue || 0;
    const pharmCost =
      (analytics?.pharmacy?.cogs || 0) + (analytics?.pharmacy?.operatingExpenses || 0);
    const pharmNet = analytics?.pharmacy?.netProfit || 0;

    return [
      {
        department: 'Hospital (OPD/IPD)',
        revenue: hospRev,
        costAndExpense: hospExp,
        netProfit: hospNet,
      },
      {
        department: 'Laboratory',
        revenue: labRev,
        costAndExpense: labExp,
        netProfit: labNet,
      },
      {
        department: 'Pharmacy POS',
        revenue: pharmRev,
        costAndExpense: pharmCost,
        netProfit: pharmNet,
      },
    ];
  }, [analytics]);

  const expiringBatchesCount = pharmacyBatches.filter(
    (b) => b.expiryDate <= '2026-12-31' || b.stockQty <= b.reorderLevel
  ).length;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. COLORFUL EXECUTIVE HERO BANNER & QUICK PERIOD SWITCHER
         ===================================================================== */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-teal-950 text-white p-6 border border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-teal-300">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>CENTRAL HOSPITAL COMMAND & PROFIT/LOSS DASHBOARD · LAN SERVER ACTIVE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {hospitalName} — Executive Home
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Live Daily, Weekly & Monthly Profit and Loss analytics, date-wise revenue vs. expense trajectories, and organized one-click access to all hospital departments ·{' '}
              <strong className="text-white">Developed by Sajjad Qaiser Shah</strong>
            </p>
          </div>

          {/* Quick Top Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateModule('clinical')}
              className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Patient / OPD Visit</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule('pharmacy')}
              className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Pill className="w-4 h-4" />
              <span>Open Pharmacy POS</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule('billing_hr')}
              className="px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Receipt className="w-4 h-4" />
              <span>Record Expense / Billing</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule('accounting_security')}
              className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-sky-300" />
              <span>Full P&L & AI Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. DAILY, WEEKLY & MONTHLY PROFIT & LOSS HIGHLIGHT CARDS (COLORFUL)
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TODAY'S (DAILY) PROFIT & LOSS */}
        <div className="bg-white rounded-xl border-2 border-teal-500/30 p-5 relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 to-cyan-500 absolute top-0 left-0" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Today&apos;s Profit & Loss (آج کا حساب)
            </span>
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                periodMetrics.today.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {periodMetrics.today.netProfit >= 0 ? '+' : ''}
              {periodMetrics.today.netProfit.toLocaleString()} {currency}
            </span>
            <span className="text-xs font-semibold text-slate-500">Net Today</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between text-slate-700">
              <span>Today Revenue (آمدن):</span>
              <strong className="text-emerald-700">
                {periodMetrics.today.totalRevenue.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Today Cost/Exp (اخراجات):</span>
              <strong className="text-rose-700">
                -{periodMetrics.today.totalCostAndLoss.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="text-[11px] text-slate-500 pt-0.5">
              Business Date: {periodMetrics.todayDateStr}
            </div>
          </div>
        </div>

        {/* Card 2: WEEKLY (LAST 7 DAYS) PROFIT & LOSS */}
        <div className="bg-white rounded-xl border-2 border-indigo-500/30 p-5 relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-blue-600 absolute top-0 left-0" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Weekly Profit & Loss (ہفتہ وار)
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                periodMetrics.weekly.netProfit >= 0 ? 'text-indigo-950' : 'text-rose-700'
              }`}
            >
              {periodMetrics.weekly.netProfit >= 0 ? '+' : ''}
              {periodMetrics.weekly.netProfit.toLocaleString()} {currency}
            </span>
            <span className="text-xs font-semibold text-slate-500">7-Day Net</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between text-slate-700">
              <span>7-Day Revenue (آمدن):</span>
              <strong className="text-emerald-700">
                {periodMetrics.weekly.revenue.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>7-Day Cost/Exp (اخراجات):</span>
              <strong className="text-rose-700">
                -{periodMetrics.weekly.costAndLoss.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="text-[11px] text-slate-500 pt-0.5">
              Daily Loss Recorded in Week: -{periodMetrics.weekly.lossDaysTotal.toLocaleString()} {currency}
            </div>
          </div>
        </div>

        {/* Card 3: MONTHLY PROFIT & LOSS */}
        <div className="bg-white rounded-xl border-2 border-emerald-500/30 p-5 relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-green-600 absolute top-0 left-0" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Monthly Profit & Loss (ماہانہ منافع)
            </span>
            <Landmark className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              +{periodMetrics.monthly.netProfit.toLocaleString()} {currency}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              ({periodMetrics.monthly.marginPct}% Margin)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between text-slate-700">
              <span>Month Revenue (کل آمدن):</span>
              <strong className="text-emerald-700">
                {periodMetrics.monthly.revenue.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Month Cost/Exp (کل خرچہ):</span>
              <strong className="text-rose-700">
                -{periodMetrics.monthly.costAndLoss.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="text-[11px] text-slate-500 pt-0.5">
              Month: {periodMetrics.currentMonthPrefix} ({periodMetrics.monthly.profitDaysCount} Profit Days · {periodMetrics.monthly.lossDaysCount} Loss Day)
            </div>
          </div>
        </div>

        {/* Card 4: LOSS & EXPENSE CONTROL SUMMARY */}
        <div className="bg-white rounded-xl border-2 border-rose-500/30 p-5 relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500 absolute top-0 left-0" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Expenses, COGS & Loss Monitor
            </span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              -{periodMetrics.monthly.lossDaysTotal.toLocaleString()} {currency}
            </span>
            <span className="text-xs font-semibold text-slate-500">Deficit Day Loss</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between text-slate-700">
              <span>Operating Expenses:</span>
              <strong className="text-rose-700">
                {analytics.consolidated.totalOperatingExpenses.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Pharmacy Batch COGS:</span>
              <strong className="text-amber-700">
                {analytics.consolidated.totalCogs.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="text-[11px] text-slate-500 pt-0.5">
              Internal Transfers Excluded: {analytics.consolidated.internalTransfersExcluded.toLocaleString()} {currency}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. ORGANIZED COLORFUL MODULE BUTTONS (6 DEPARTMENT LAUNCHERS)
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Organized Hospital ERP Modules & Quick Actions (تمام شعبہ جات)
            </h2>
            <p className="text-xs text-slate-500">
              Click any department card below to open its full operational workspace
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Central PostgreSQL Authority · Developed by Sajjad Qaiser Shah
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Patient Registry & Vitals */}
          <button
            type="button"
            onClick={() => onNavigateModule('clinical')}
            className="text-left group rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-cyan-50/50 hover:border-teal-500 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold text-teal-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Registry</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3">
                1. Patient Registry & Longitudinal Vitals
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Register MRN patients and monitor multi-encounter Blood Pressure, Heart Rate, SpO2, and Fever (°C) charts.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-teal-100 flex items-center justify-between text-xs font-mono text-slate-700">
              <span>Registered: {patients.length} Patients</span>
              <span className="text-teal-700 font-semibold">Vitals Active</span>
            </div>
          </button>

          {/* 2. OPD Appointments & IPD Admissions */}
          <button
            type="button"
            onClick={() => onNavigateModule('clinical')}
            className="text-left group rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 hover:border-indigo-500 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold text-indigo-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Book OPD / IPD</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3">
                2. OPD Consultations & IPD Ward Admissions
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Schedule doctor tokens, allocate surgical/general ward beds, and auto-post consultation invoices.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-indigo-100 flex items-center justify-between text-xs font-mono text-slate-700">
              <span>Encounters: {encounters.length}</span>
              <span className="text-indigo-700 font-semibold">
                IPD Admitted: {encounters.filter((e) => e.status === 'ADMITTED').length}
              </span>
            </div>
          </button>

          {/* 3. Laboratory & Barcode Pathology */}
          <button
            type="button"
            onClick={() => onNavigateModule('laboratory')}
            className="text-left group rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-purple-50/50 hover:border-violet-500 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold text-violet-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Lab</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3">
                3. Laboratory Orders & Sample Barcodes
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Generate specimen barcodes, verify pathology results, and print official verified diagnostic reports.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-violet-100 flex items-center justify-between text-xs font-mono text-slate-700">
              <span>Samples: {labOrders.length}</span>
              <span className="text-violet-700 font-semibold">
                Verified: {labOrders.filter((l) => l.status === 'VERIFIED').length}
              </span>
            </div>
          </button>

          {/* 4. Pharmacy POS & Inventory */}
          <button
            type="button"
            onClick={() => onNavigateModule('pharmacy')}
            className="text-left group rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-green-50/50 hover:border-emerald-500 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open POS & Stock</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3">
                4. Pharmacy POS (Retail/Wholesale) & Stock
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Dispense medicines with atomic batch deduction, receive supplier GRN purchases, and track expiry alerts.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-xs font-mono text-slate-700">
              <span>Active Batches: {pharmacyBatches.length}</span>
              <span className="text-amber-700 font-semibold">
                Expiry Alerts: {expiringBatchesCount}
              </span>
            </div>
          </button>

          {/* 5. Billing, Expenses, Ledgers & HR Payroll */}
          <button
            type="button"
            onClick={() => onNavigateModule('billing_hr')}
            className="text-left group rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 hover:border-amber-500 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold text-amber-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Billing & HR</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3">
                5. Patient Billing, Expenses & HR Payroll
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Settle due invoices, process authorized refunds, log hospital expenses, and run monthly staff payroll.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-xs font-mono text-slate-700">
              <span>Invoices: {invoices.length}</span>
              <span className="text-amber-800 font-semibold">Receipts & Slips</span>
            </div>
          </button>

          {/* 6. Double-Entry Accounting, AI & Backups */}
          <button
            type="button"
            onClick={() => onNavigateModule('accounting_security')}
            className="text-left group rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-sky-50/50 hover:border-rose-500 p-4 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold text-rose-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Ledger & Security</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3">
                6. Accounting Ledger, AI Assistant & Backups
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Consolidated P&L, Permission-Aware AI Assistant, AES-256-GCM Backups, and 7 Go-Live Acceptance Tests.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-xs font-mono text-slate-700">
              <span>DR = CR Balanced</span>
              <span className="text-emerald-700 font-semibold">AES-256 Verified</span>
            </div>
          </button>
        </div>
      </div>

      {/* =====================================================================
          4. INTERACTIVE DATE-WISE PROFIT & LOSS GRAPHS (DAILY / WEEKLY / MONTHLY)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Date-Wise Profit & Loss Graph */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Date-Wise Profit & Loss Graph (تاریخ وار منافع اور نقصان کا گراف)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualizes Gross Revenue (آمدن), Cost & Expenses (اخراجات/لاگت), and Net Profit vs. Loss ({currency}) by date
              </p>
            </div>

            {/* Interactive Timeframe & Chart Mode Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setChartRange('RECENT_3')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    chartRange === 'RECENT_3'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Last 3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setChartRange('WEEKLY')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    chartRange === 'WEEKLY'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Weekly (7D)
                </button>
                <button
                  type="button"
                  onClick={() => setChartRange('MONTHLY')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    chartRange === 'MONTHLY'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly (All Dates)
                </button>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setChartMode('REVENUE_VS_EXPENSE')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    chartMode === 'REVENUE_VS_EXPENSE'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Revenue vs Expense + Net Line
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('PROFIT_VS_LOSS')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    chartMode === 'PROFIT_VS_LOSS'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Direct Profit vs Loss Bars
                </button>
              </div>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'REVENUE_VS_EXPENSE' ? (
                <ComposedChart
                  data={filteredChartData}
                  margin={{ top: 12, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#334155', fontFamily: 'IBM Plex Mono, monospace' }}
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#334155', fontFamily: 'IBM Plex Mono, monospace' }}
                    stroke="#CBD5E1"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    formatter={(value: any, name: any) => [
                      `${Number(value).toLocaleString()} ${currency}`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <ReferenceLine y={0} stroke="#64748B" strokeDasharray="3 3" />
                  <Bar
                    dataKey="totalRevenue"
                    name="Gross Revenue (کل آمدن)"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    barSize={22}
                  />
                  <Bar
                    dataKey="totalCostAndLoss"
                    name="Expenses & COGS (اخراجات / لاگت)"
                    fill="#F43F5E"
                    radius={[4, 4, 0, 0]}
                    barSize={22}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="Net Profit / Loss (خالص منافع یا نقصان)"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    dot={{ r: 4.5, fill: '#4F46E5' }}
                    activeDot={{ r: 6.5 }}
                  />
                </ComposedChart>
              ) : (
                <BarChart
                  data={filteredChartData}
                  margin={{ top: 12, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#334155', fontFamily: 'IBM Plex Mono, monospace' }}
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#334155', fontFamily: 'IBM Plex Mono, monospace' }}
                    stroke="#CBD5E1"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    formatter={(value: any, name: any) => [
                      `${Number(value).toLocaleString()} ${currency}`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <ReferenceLine y={0} stroke="#0F172A" strokeWidth={1.5} />
                  <Bar
                    dataKey="profitOnly"
                    name="Net Profit Earned (خالص منافع)"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                  <Bar
                    dataKey="lossOnly"
                    name="Net Loss Incurred (خالص نقصان)"
                    fill="#E11D48"
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Departmental Revenue vs Expense & Profit Comparison Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Departmental P&L Split (شعبہ وار منافع)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hospital OPD/IPD vs. Laboratory vs. Pharmacy POS
              </p>
            </div>

            <div className="h-60 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentChartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 10, fill: '#334155' }}
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#334155', fontFamily: 'IBM Plex Mono, monospace' }}
                    stroke="#CBD5E1"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    formatter={(value: any) => `${Number(value).toLocaleString()} ${currency}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="#0EA5E9"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="costAndExpense"
                    name="Cost & Expense"
                    fill="#F43F5E"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="netProfit"
                    name="Net Profit"
                    fill="#10B981"
                    radius={[3, 3, 0, 0]}
                  >
                    {departmentChartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.netProfit >= 0 ? '#10B981' : '#E11D48'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs font-mono tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Hospital OPD/IPD Net:</span>
              <strong className="text-emerald-700">
                +{analytics.hospital.netProfit.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Laboratory Net:</span>
              <strong className="text-sky-700">
                +{analytics.laboratory.netProfit.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pharmacy POS Net:</span>
              <strong className="text-indigo-700">
                +{analytics.pharmacy.netProfit.toLocaleString()} {currency}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          5. DATE-WISE PROFIT & LOSS STATEMENT TABLE (WITH PROFIT / LOSS STATUS)
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Complete Date-Wise Profit & Loss Ledger (تاریخ وار نفع اور نقصان کی تفصیل)
            </h3>
            <p className="text-xs text-slate-500">
              Shows daily Hospital, Laboratory, and Pharmacy revenues, COGS, operating expenses, and net Profit or Loss
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-700 font-semibold">
              ● Profit Days: {periodMetrics.monthly.profitDaysCount}
            </span>
            <span className="text-rose-700 font-semibold">
              ● Loss Days: {periodMetrics.monthly.lossDaysCount}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-2.5 px-3 font-semibold">Business Date</th>
                <th className="py-2.5 px-3 font-semibold text-right">Hospital Rev</th>
                <th className="py-2.5 px-3 font-semibold text-right">Lab Rev</th>
                <th className="py-2.5 px-3 font-semibold text-right">Pharmacy Rev</th>
                <th className="py-2.5 px-3 font-semibold text-right">Gross Revenue (کل آمدن)</th>
                <th className="py-2.5 px-3 font-semibold text-right">COGS + Expenses (اخراجات)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Net Profit / Loss</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {[...chronologicalDays]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((d) => {
                  const isProfit = d.netProfit >= 0;
                  return (
                    <tr key={d.date} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{d.date}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {d.hospitalRev.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {d.labRev.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {d.pharmacyRev.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                        {d.totalRevenue.toLocaleString()} {currency}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-700">
                        -{d.totalCostAndLoss.toLocaleString()} {currency}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          isProfit ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {d.netProfit.toLocaleString()} {currency}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold">
                        {isProfit ? (
                          <span className="text-emerald-700">● NET PROFIT (منافع)</span>
                        ) : (
                          <span className="text-rose-700">▲ NET LOSS (نقصان)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
