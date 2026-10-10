/**
 * Consolidated Hospital Profit & Loss Dashboard — Clean English Edition
 * Displays All-Time, Monthly & Daily Profit/Loss Status, Date-Wise Profit & Loss Graph,
 * Consolidated Revenue vs. Expense/Salary/COGS Calculation, and Short-Form Daily Record Table.
 */
import React, { useState, useMemo } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Pill,
  Receipt,
  FlaskConical,
  Users,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type {
  Doctor,
  Patient,
  Encounter,
  LabOrder,
  PharmacyBatch,
  Invoice,
  SupplierBill,
  SalarySlip,
  ExpenseRecord,
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
  doctors?: Doctor[];
  patients: Patient[];
  encounters: Encounter[];
  labOrders: LabOrder[];
  pharmacyBatches: PharmacyBatch[];
  invoices: Invoice[];
  supplierBills?: SupplierBill[];
  salarySlips?: SalarySlip[];
  expenses?: ExpenseRecord[];
  searchQuery?: string;
  onNavigateModule: (module: HomeTargetModule, subSection?: string) => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  hospitalName,
  currency,
  analytics,
  invoices,
  supplierBills = [],
  salarySlips = [],
  expenses = [],
  searchQuery = '',
  onNavigateModule,
}) => {
  const [chartRange, setChartRange] = useState<'ALL_TIME' | 'MONTHLY' | 'WEEKLY'>('ALL_TIME');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const dailyList: Array<{
    date: string;
    hospitalRev: number;
    labRev: number;
    pharmacyRev: number;
    pharmacyCogs: number;
    expenses: number;
    netProfit: number;
  }> = analytics?.dailyBreakdown || [];

  // Chronological days (oldest -> newest) for graphing
  const chronologicalDays = useMemo(() => {
    return [...dailyList]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((d) => {
        if (startDateFilter && d.date < startDateFilter) return false;
        if (endDateFilter && d.date > endDateFilter) return false;
        return true;
      })
      .map((d) => {
        const totalRevenue = d.hospitalRev + d.labRev + d.pharmacyRev;
        const totalCostAndLoss = d.pharmacyCogs + d.expenses;
        const netProfit = d.netProfit;
        return {
          ...d,
          shortDate: d.date.slice(5),
          totalRevenue,
          totalCostAndLoss,
          netProfit,
        };
      });
  }, [dailyList, startDateFilter, endDateFilter]);

  const filteredChartData = useMemo(() => {
    if (chartRange === 'WEEKLY') return chronologicalDays.slice(-7);
    if (chartRange === 'MONTHLY') return chronologicalDays.slice(-30);
    return chronologicalDays;
  }, [chronologicalDays, chartRange]);

  // All-Time, Monthly, Weekly, and Daily Consolidated Calculations
  const metrics = useMemo(() => {
    const sortedDesc = [...chronologicalDays].sort((a, b) => b.date.localeCompare(a.date));
    const latestDateStr = sortedDesc[0]?.date || '2026-10-10';
    const currentMonthPrefix = latestDateStr.slice(0, 7);

    const todayEntry = sortedDesc.find((d) => d.date === latestDateStr) || {
      date: latestDateStr,
      hospitalRev: 0,
      labRev: 0,
      pharmacyRev: 0,
      pharmacyCogs: 0,
      expenses: 0,
      totalRevenue: 0,
      totalCostAndLoss: 0,
      netProfit: 0,
    };

    const allTimeHospitalRev = chronologicalDays.reduce((acc, d) => acc + d.hospitalRev, 0);
    const allTimeLabRev = chronologicalDays.reduce((acc, d) => acc + d.labRev, 0);
    const allTimePharmacyRev = chronologicalDays.reduce((acc, d) => acc + d.pharmacyRev, 0);
    const allTimeRevenue = allTimeHospitalRev + allTimeLabRev + allTimePharmacyRev;
    const allTimeCogs = chronologicalDays.reduce((acc, d) => acc + d.pharmacyCogs, 0);
    const allTimeExpensesAndSalaries = chronologicalDays.reduce((acc, d) => acc + d.expenses, 0);
    const allTimeTotalCosts = allTimeCogs + allTimeExpensesAndSalaries;
    const allTimeNetProfit = allTimeRevenue - allTimeTotalCosts;

    const totalSalariesPaid = salarySlips.reduce((acc, s) => acc + s.netPaid, 0);
    const totalDirectExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    const monthlyEntries = chronologicalDays.filter((d) => d.date.startsWith(currentMonthPrefix));
    const monthlyRevenue = monthlyEntries.reduce((acc, d) => acc + d.totalRevenue, 0);
    const monthlyCosts = monthlyEntries.reduce((acc, d) => acc + d.totalCostAndLoss, 0);
    const monthlyNetProfit = monthlyEntries.reduce((acc, d) => acc + d.netProfit, 0);
    const profitDaysCount = chronologicalDays.filter((d) => d.netProfit >= 0).length;
    const lossDaysCount = chronologicalDays.filter((d) => d.netProfit < 0).length;

    // Supplier Bills & Customer Invoices Totals
    const supplierTotalBilled = supplierBills.reduce((acc, b) => acc + b.totalBill, 0);
    const supplierTotalPaid = supplierBills.reduce((acc, b) => acc + b.paidAmount, 0);
    const supplierTotalRemaining = supplierBills.reduce((acc, b) => acc + b.remainingAmount, 0);

    const customerTotalBilled = invoices.reduce((acc, i) => acc + i.netTotal, 0);
    const customerTotalPaid = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
    const customerTotalRemaining = invoices.reduce(
      (acc, i) => acc + Math.max(0, i.netTotal - i.paidAmount - i.refundedAmount),
      0
    );

    return {
      latestDateStr,
      currentMonthPrefix,
      today: todayEntry,
      allTime: {
        hospitalRev: allTimeHospitalRev,
        labRev: allTimeLabRev,
        pharmacyRev: allTimePharmacyRev,
        revenue: allTimeRevenue,
        cogs: allTimeCogs,
        expensesAndSalaries: allTimeExpensesAndSalaries,
        totalCosts: allTimeTotalCosts,
        netProfit: allTimeNetProfit,
        totalSalariesPaid,
        totalDirectExpenses,
        profitDaysCount,
        lossDaysCount,
      },
      monthly: {
        revenue: monthlyRevenue,
        costs: monthlyCosts,
        netProfit: monthlyNetProfit,
      },
      bills: {
        supplierTotalBilled,
        supplierTotalPaid,
        supplierTotalRemaining,
        customerTotalBilled,
        customerTotalPaid,
        customerTotalRemaining,
      },
    };
  }, [chronologicalDays, salarySlips, expenses, supplierBills, invoices]);

  // Filter short-form daily records by search query if entered
  const filteredDailyRecords = useMemo(() => {
    const desc = [...chronologicalDays].sort((a, b) => b.date.localeCompare(a.date));
    if (!searchQuery.trim()) return desc;
    const q = searchQuery.toLowerCase();
    return desc.filter(
      (d) =>
        d.date.toLowerCase().includes(q) ||
        (d.netProfit >= 0 ? 'profit' : 'loss').includes(q)
    );
  }, [chronologicalDays, searchQuery]);

  const isOverallProfit = metrics.allTime.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          DASHBOARD HEADER & QUICK ACTIONS
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F2937]">
              Consolidated Profit &amp; Loss Dashboard
            </h1>
            <span
              className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                isOverallProfit
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {isOverallProfit ? 'HOSPITAL IN NET PROFIT' : 'HOSPITAL IN NET LOSS'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {hospitalName} · Combines Customer Billing, Lab Billing, Pharmacy Retail, Supplier Costs, Staff Salaries &amp; Operating Expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-Save Active (Backup &amp; History Files Saved Automatically)</span>
          </div>
          <a
            href="/api/backups/download-history-csv"
            download
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>History File (.CSV)</span>
          </a>
          <a
            href="/api/backups/download-laptop"
            download
            className="px-3.5 py-2 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup File (.JSON)</span>
          </a>
        </div>
      </div>

      {/* =====================================================================
          ROW 1: 4 CONSOLIDATED PROFIT & LOSS SUMMARY CARDS
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: ALL-TIME CONSOLIDATED PROFIT / LOSS */}
        <div
          className={`rounded-xl border p-5 shadow-xs flex flex-col justify-between ${
            isOverallProfit
              ? 'bg-white border-emerald-300'
              : 'bg-white border-rose-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>ALL-TIME NET {isOverallProfit ? 'PROFIT' : 'LOSS'}</span>
              {isOverallProfit ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-600" />
              )}
            </div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
                isOverallProfit ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isOverallProfit ? '+' : '-'}
              {Math.abs(metrics.allTime.netProfit).toLocaleString()} {currency}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Status:{' '}
              <strong className={isOverallProfit ? 'text-emerald-700' : 'text-rose-700'}>
                {isOverallProfit ? 'Overall Profitable' : 'Overall In Loss'}
              </strong>{' '}
              ({metrics.allTime.profitDaysCount} Profit Days / {metrics.allTime.lossDaysCount} Loss Days)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-700">
              Rev: {metrics.allTime.revenue.toLocaleString()}
            </span>
            <span className="text-rose-600">
              Cost: {metrics.allTime.totalCosts.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 2: TODAY'S CALCULATION */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>TODAY&apos;S CALCULATION ({metrics.latestDateStr})</span>
              {metrics.today.netProfit >= 0 ? (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  PROFIT
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                  LOSS
                </span>
              )}
            </div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
                metrics.today.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {metrics.today.netProfit >= 0 ? '+' : '-'}
              {Math.abs(metrics.today.netProfit).toLocaleString()} {currency}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Today&apos;s Net Balance after Medicine Cost, Salaries &amp; Expenses
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-700">
              Today In: {metrics.today.totalRevenue.toLocaleString()}
            </span>
            <span className="text-rose-600">
              Today Out: {metrics.today.totalCostAndLoss.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 3: MONTHLY CALCULATION */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>MONTHLY P&amp;L ({metrics.currentMonthPrefix})</span>
              {metrics.monthly.netProfit >= 0 ? (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  PROFIT
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                  LOSS
                </span>
              )}
            </div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
                metrics.monthly.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {metrics.monthly.netProfit >= 0 ? '+' : '-'}
              {Math.abs(metrics.monthly.netProfit).toLocaleString()} {currency}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Current Month Cumulative Net Profit / Loss
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-700">
              Rev: {metrics.monthly.revenue.toLocaleString()}
            </span>
            <span className="text-rose-600">
              Cost: {metrics.monthly.costs.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: SUPPLIER MEDICINE BILLS (TOTAL / PAID / REMAINING) */}
        <div
          onClick={() => onNavigateModule('pharmacy')}
          className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-[#1D5464]/40 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>SUPPLIER MEDICINE BILLS</span>
              <Pill className="w-4 h-4 text-[#1D5464]" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
              {metrics.bills.supplierTotalBilled.toLocaleString()} {currency}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Total Supplier Medicine Purchases
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-700">
              Paid: {metrics.bills.supplierTotalPaid.toLocaleString()}
            </span>
            <span className="text-amber-700 font-bold">
              Remaining: {metrics.bills.supplierTotalRemaining.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ROW 2: CONSOLIDATED PROFIT & LOSS GRAPH (BY DATE ACROSS ALL TIME)
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Total Hospital Profit &amp; Loss Graph (Date-Wise Consolidated Trajectory)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Combines Customer Billing + Lab Billing + Pharmacy Retail Sales vs. Medicine Wholesale Cost (COGS) + Staff Salaries + Operating Expenses
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-transparent font-mono text-slate-800 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-transparent font-mono text-slate-800 focus:outline-none"
              />
              {(startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDateFilter('');
                    setEndDateFilter('');
                  }}
                  className="text-rose-600 font-semibold ml-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-[#F1F5F8] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setChartRange('ALL_TIME')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  chartRange === 'ALL_TIME'
                    ? 'bg-[#1D5464] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setChartRange('MONTHLY')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  chartRange === 'MONTHLY'
                    ? 'bg-[#1D5464] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setChartRange('WEEKLY')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  chartRange === 'WEEKLY'
                    ? 'bg-[#1D5464] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
            </div>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredChartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#475569' }}
                stroke="#cbd5e1"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#475569' }}
                stroke="#cbd5e1"
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(val: any, name: any) => [
                  `${Number(val).toLocaleString()} ${currency}`,
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <ReferenceLine
                y={0}
                stroke="#0f172a"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <Bar
                dataKey="totalRevenue"
                name="Total Revenue (Customer + Lab + Pharmacy)"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={22}
              />
              <Bar
                dataKey="totalCostAndLoss"
                name="Total Costs (Medicine Cost + Salaries + Expenses)"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                barSize={22}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="Net Profit / Loss"
                stroke="#1D5464"
                strokeWidth={3}
                dot={{ r: 4, fill: '#1D5464', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =====================================================================
          ROW 3: BELOW THE GRAPH — DAILY & OVERALL CALCULATION BREAKDOWN
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Consolidated Calculation Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Complete Profit &amp; Loss Calculation Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Exact mathematical calculation of all Hospital Income vs. Costs, Salaries &amp; Expenses
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#1D5464]">
              Currency: {currency}
            </span>
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-700 font-medium">
                (+) Customer / Patient Billing (OPD, IPD &amp; Procedures)
              </span>
              <span className="font-mono font-semibold text-emerald-700">
                +{metrics.allTime.hospitalRev.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-700 font-medium">
                (+) Laboratory Diagnostic Test Billing
              </span>
              <span className="font-mono font-semibold text-emerald-700">
                +{metrics.allTime.labRev.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-700 font-medium">
                (+) Pharmacy Retail Medicine Sales
              </span>
              <span className="font-mono font-semibold text-emerald-700">
                +{metrics.allTime.pharmacyRev.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 bg-emerald-50/70 px-3 rounded font-bold text-slate-900">
              <span>(=) Total Consolidated Gross Revenue</span>
              <span className="font-mono text-emerald-800">
                {metrics.allTime.revenue.toLocaleString()} {currency}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 pt-2">
              <span className="text-slate-700 font-medium">
                (-) Supplier Wholesale Cost of Sold Medicines (Pharmacy COGS)
              </span>
              <span className="font-mono font-semibold text-rose-600">
                -{metrics.allTime.cogs.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-700 font-medium">
                (-) Staff Salaries Paid &amp; Departmental Operating Expenses
              </span>
              <span className="font-mono font-semibold text-rose-600">
                -{metrics.allTime.expensesAndSalaries.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 bg-rose-50/70 px-3 rounded font-bold text-slate-900">
              <span>(=) Total Consolidated Costs, Salaries &amp; Expenses</span>
              <span className="font-mono text-rose-800">
                {metrics.allTime.totalCosts.toLocaleString()} {currency}
              </span>
            </div>

            <div
              className={`flex items-center justify-between py-3 px-4 rounded-lg font-bold text-sm mt-2 border ${
                isOverallProfit
                  ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950'
                  : 'bg-rose-100/80 border-rose-300 text-rose-950'
              }`}
            >
              <span>
                NET HOSPITAL {isOverallProfit ? 'PROFIT' : 'LOSS'} (All-Time Consolidated):
              </span>
              <span className="font-mono text-base">
                {isOverallProfit ? '+' : '-'}
                {Math.abs(metrics.allTime.netProfit).toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Today's Calculation & Quick Department Actions */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Today&apos;s Daily Calculation ({metrics.latestDateStr})
                </h3>
                <p className="text-xs text-slate-500">
                  Single-day income and expense summary
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  metrics.today.netProfit >= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {metrics.today.netProfit >= 0 ? 'TODAY IN PROFIT' : 'TODAY IN LOSS'}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Today Customer / Hospital Billing:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {metrics.today.hospitalRev.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Today Laboratory Billing:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {metrics.today.labRev.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Today Pharmacy Retail Sales:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {metrics.today.pharmacyRev.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Today Medicine Wholesale Cost (COGS):</span>
                <span className="font-mono font-semibold text-rose-600">
                  -{metrics.today.pharmacyCogs.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Today Salaries &amp; Operating Expenses:</span>
                <span className="font-mono font-semibold text-rose-600">
                  -{metrics.today.expenses.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between py-2 px-3 rounded bg-slate-100 font-bold text-slate-900 mt-2">
                <span>Today&apos;s Net Profit / Loss:</span>
                <span
                  className={`font-mono ${
                    metrics.today.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {metrics.today.netProfit >= 0 ? '+' : '-'}
                  {Math.abs(metrics.today.netProfit).toLocaleString()} {currency}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-4 mt-4 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => onNavigateModule('pharmacy')}
              className="py-2 px-3 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Pharmacy &amp; Stock</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule('billing_hr')}
              className="py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Billing, Staff &amp; Salary</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule('laboratory')}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Laboratory Billing</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule('accounting_security')}
              className="py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>History &amp; Backups</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ROW 4: SHORT-FORM DAILY RECORD TABLE (DATE-WISE PROFIT & LOSS HISTORY)
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daily Profit &amp; Loss Record (Short-Form Date-Wise Summary)
            </h3>
            <p className="text-xs text-slate-500">
              Complete date-by-date financial record showing whether each day closed in Profit or Loss
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600">
            Total Recorded Days: {filteredDailyRecords.length}
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 font-semibold">Date</th>
                <th className="py-2.5 font-semibold text-right">Customer / OPD Billing</th>
                <th className="py-2.5 font-semibold text-right">Lab Billing</th>
                <th className="py-2.5 font-semibold text-right">Pharmacy Retail</th>
                <th className="py-2.5 font-semibold text-right">Total Revenue</th>
                <th className="py-2.5 font-semibold text-right">Medicine Cost (COGS)</th>
                <th className="py-2.5 font-semibold text-right">Salaries &amp; Expenses</th>
                <th className="py-2.5 font-semibold text-right">Net Profit / Loss</th>
                <th className="py-2.5 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDailyRecords.map((d) => {
                const isProfit = d.netProfit >= 0;
                return (
                  <tr key={d.date} className="hover:bg-slate-50/90">
                    <td className="py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {d.date}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {d.hospitalRev.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {d.labRev.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {d.pharmacyRev.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {d.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-rose-600">
                      -{d.pharmacyCogs.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-rose-600">
                      -{d.expenses.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 text-right font-mono tabular-nums font-bold ${
                        isProfit ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isProfit ? '+' : '-'}
                      {Math.abs(d.netProfit).toLocaleString()} {currency}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isProfit
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isProfit ? 'PROFIT' : 'LOSS'}
                      </span>
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
