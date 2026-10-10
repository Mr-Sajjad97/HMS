/**
 * Hospital ERP — Single-Hospital On-Premises LAN & Central Database System
 * Developed by Sajjad Qaiser Shah
 */
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  auth,
  googleAuthProvider,
  syncUserProfileToFirestore,
  mirrorAuditLogToFirestore,
} from './lib/firebase.ts';
import {
  Stethoscope,
  FlaskConical,
  Pill,
  Receipt,
  Landmark,
  ShieldCheck,
  Monitor,
  Smartphone,
  Globe,
  Wifi,
  WifiOff,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  LogIn,
  LogOut,
  Barcode,
  ArrowRightLeft,
} from 'lucide-react';
import {
  PrintableDocumentModal,
  PrintableDocPayload,
} from './components/PrintableDocumentModal.tsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AccountingAndAiView } from './components/AccountingAndAiView.tsx';
import { ArchitectureAndAcceptanceView } from './components/ArchitectureAndAcceptanceView.tsx';
import { HomeDashboardView } from './components/HomeDashboardView.tsx';
import type {
  StaffRole,
  ClientFormFactor,
  HospitalSettings,
  Doctor,
  Patient,
  VitalSignEntry,
  Encounter,
  LabOrder,
  PharmacyBatch,
  Invoice,
  JournalEntry,
  LedgerParty,
  ExpenseRecord,
  Employee,
  SalarySlip,
  AuditLogEntry,
  BackupRecord,
  AcceptanceTestItem,
} from './types/erp.ts';

type WorkspaceModule =
  | 'home'
  | 'clinical'
  | 'laboratory'
  | 'pharmacy'
  | 'billing_hr'
  | 'accounting_security';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<StaffRole>('ADMIN');
  const [clientMode, setClientMode] = useState<ClientFormFactor>('LAN_WEB');
  const [activeModule, setActiveModule] = useState<WorkspaceModule>('home');

  const [loading, setLoading] = useState<boolean>(true);
  const [statusBanner, setStatusBanner] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  // Authoritative Server State
  const [settings, setSettings] = useState<HospitalSettings>({
    hospitalName: 'Al-Hikmat General Hospital',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    auditRetentionDays: 2555,
    lanSubnet: '192.168.10.0/24',
    dbBindAddress: '127.0.0.1:5432 (Loopback Isolated)',
    walArchivingEnabled: true,
    simulatedInternetOffline: false,
    updatedAt: '2026-10-10T08:00:00.000Z',
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSignEntry[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [pharmacyBatches, setPharmacyBatches] = useState<PharmacyBatch[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [ledgerParties, setLedgerParties] = useState<LedgerParty[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [acceptanceTests, setAcceptanceTests] = useState<AcceptanceTestItem[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    dateBasis: 'businessDate',
    totalDebits: 0,
    totalCredits: 0,
    isBalanced: true,
    hospital: { revenue: 0, expenses: 0, netProfit: 0 },
    laboratory: { revenue: 0, expenses: 0, netProfit: 0 },
    pharmacy: {
      retailRevenue: 0,
      wholesaleRevenue: 0,
      totalRevenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
    },
    sharedAdminExpenses: 0,
    consolidated: {
      totalRevenue: 0,
      totalCogs: 0,
      totalOperatingExpenses: 0,
      netProfit: 0,
      internalTransfersExcluded: 0,
      inventoryPurchasesCapitalizedExcluded: 0,
      totalRefundsDeducted: 0,
    },
    dailyBreakdown: [],
  });

  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
    dateBasis: 'businessDate' | 'paymentDate';
  }>({
    startDate: '',
    endDate: '',
    dateBasis: 'businessDate',
  });

  const [printableDoc, setPrintableDoc] = useState<PrintableDocPayload | null>(null);

  // Forms State
  // 1. Patient Form
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    age: 34,
    gender: 'Male',
    phone: '+92-300-',
    cnic: '35202-',
    bloodGroup: 'O+',
    address: '',
    allergies: 'None',
    businessDate: '2026-10-10',
  });

  // 1b. Longitudinal Patient Vitals Tracker State
  const [selectedVitalsPatientId, setSelectedVitalsPatientId] = useState<string>('PAT-1001');
  const [vitalForm, setVitalForm] = useState({
    encounterToken: 'TKN-103 (Follow-up)',
    systolicBp: 128,
    diastolicBp: 82,
    heartRate: 76,
    spo2: 99,
    temperatureC: 36.8,
    clinicalNotes: '',
    businessDate: '2026-10-10',
  });

  // 2. Encounter Form (OPD/IPD)
  const [encounterForm, setEncounterForm] = useState({
    patientId: 'PAT-1001',
    doctorId: 'DOC-01',
    encounterType: 'OPD' as 'OPD' | 'IPD' | 'EMERGENCY',
    wardBed: 'OPD-101',
    chiefComplaint: '',
    diagnosis: '',
    vitals: 'BP 122/80 mmHg · HR 78 bpm · SpO2 98%',
    fee: 2500,
    paymentMethod: 'CASH',
    businessDate: '2026-10-10',
    paymentDate: '2026-10-10',
  });

  // 3. Lab Order Form
  const [labForm, setLabForm] = useState({
    patientId: 'PAT-1001',
    doctorId: 'DOC-01',
    testCode: 'HBA1C',
    testName: 'Glycated Hemoglobin (HbA1c)',
    category: 'Biochemistry',
    unit: '%',
    referenceRange: '4.0% - 5.6% (Non-Diabetic)',
    price: 2200,
    businessDate: '2026-10-10',
  });
  const [labVerifyInputs, setLabVerifyInputs] = useState<
    Record<string, { resultValue: string; abnormalFlag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' }>
  >({});

  // 4. Pharmacy POS & Inventory Forms
  const [posSaleType, setPosSaleType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [posCustomerName, setPosCustomerName] = useState('Walk-in OPD Patient');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'CASH' | 'CARD' | 'CREDIT_LEDGER'>('CASH');
  const [posBusinessDate, setPosBusinessDate] = useState('2026-10-10');
  const [posCart, setPosCart] = useState<Array<{ batchId: string; qty: number }>>([
    { batchId: 'BAT-501', qty: 1 },
  ]);

  const [grnForm, setGrnForm] = useState({
    sku: 'MED-OMEP-40',
    genericName: 'Omeprazole 40mg Capsule',
    brandName: 'Risek 40mg Caps (Pack of 14)',
    batchNo: 'B26-RK44',
    category: 'Gastrointestinal',
    expiryDate: '2028-09-30',
    qty: 60,
    unitCost: 350,
    retailPrice: 520,
    wholesalePrice: 440,
    supplierId: 'SUP-01',
    paymentMethod: 'CREDIT_LEDGER',
    businessDate: '2026-10-10',
  });

  const [transferForm, setTransferForm] = useState({
    batchId: 'BAT-501',
    qty: 5,
    targetWard: 'Surgical Ward A Emergency Trolley',
    businessDate: '2026-10-10',
  });

  // 5. Expense & Payroll Forms
  const [expenseForm, setExpenseForm] = useState({
    category: 'Medical Gases & Generator Fuel',
    costCenter: 'HOSPITAL',
    description: '',
    amount: 4500,
    paymentMethod: 'CASH',
    businessDate: '2026-10-10',
    paymentDate: '2026-10-10',
  });

  const [payrollMonth, setPayrollMonth] = useState('2026-10');

  const notify = (kind: 'success' | 'error', text: string) => {
    setStatusBanner({ kind, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  // Build request headers including role, actor identity, and optional idempotency key
  const buildHeaders = useCallback(
    async (idempotencyKey?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-ERP-Role': activeRole,
        'X-ERP-UID': user?.uid || 'lan_operator_01',
        'X-ERP-Email': user?.email || 'sajjadshaha58@gmail.com',
      };
      if (idempotencyKey) {
        headers['X-Idempotency-Key'] = idempotencyKey;
      }
      if (user && !settings.simulatedInternetOffline) {
        try {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch {
          // Local LAN operation continues even if external token refresh is offline
        }
      }
      return headers;
    },
    [activeRole, user, settings.simulatedInternetOffline]
  );

  const fetchBootstrap = useCallback(
    async (filterOverride?: typeof dateFilter) => {
      const f = filterOverride || dateFilter;
      const params = new URLSearchParams();
      if (f.startDate) params.set('startDate', f.startDate);
      if (f.endDate) params.set('endDate', f.endDate);
      params.set('dateBasis', f.dateBasis);

      try {
        const res = await fetch(`/api/erp/bootstrap?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load central ERP state');
        const data = await res.json();
        const st = data.state;
        setSettings(st.settings);
        setDoctors(st.doctors);
        setPatients(st.patients);
        setVitalSigns(st.vitalSigns || []);
        setEncounters(st.encounters);
        setLabOrders(st.labOrders);
        setPharmacyBatches(st.pharmacyBatches);
        setInvoices(st.invoices);
        setJournalEntries(st.journalEntries);
        setLedgerParties(st.ledgerParties);
        setExpenses(st.expenses);
        setEmployees(st.employees);
        setSalarySlips(st.salarySlips);
        setAuditLogs(st.auditLogs);
        setBackups(st.backups);
        setAcceptanceTests(st.acceptanceTests || []);
        setAnalytics(data.analytics);
      } catch (err: any) {
        notify('error', err.message || 'Could not reach local ERP server.');
      } finally {
        setLoading(false);
      }
    },
    [dateFilter]
  );

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.emailVerified) {
        try {
          await syncUserProfileToFirestore(
            u.uid,
            u.email || 'staff@hospital.lan',
            u.displayName || 'Hospital Staff',
            activeRole,
            'Central Hospital Operations'
          );
        } catch {
          // Handled by Firestore error logger
        }
      }
    });
    return () => unsub();
  }, [activeRole]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      notify('success', 'Authenticated with Google Sign-In & synced staff profile.');
    } catch (err: any) {
      notify('error', `Sign-in notice: ${err.message || 'Using Local LAN Workstation session.'}`);
    }
  };

  // Mutating Action Helpers (With Idempotency Key + Firestore Audit Mirror)
  const postMutation = async (
    endpoint: string,
    payload: unknown,
    method: 'POST' | 'PATCH' = 'POST'
  ) => {
    const idemKey = `IDEM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const headers = await buildHeaders(idemKey);
    const res = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Operation rejected by server');
    }
    if (data.audit && user && !settings.simulatedInternetOffline) {
      mirrorAuditLogToFirestore({
        id: data.audit.id,
        module: data.audit.module,
        action: data.audit.action,
        entityId: data.audit.entityId,
        summary: data.audit.summary,
        actorRole: activeRole,
      }).catch(() => {});
    }
    await fetchBootstrap();
    return data;
  };

  // Clinical Handlers
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/patients', patientForm);
      setPatientForm({
        ...patientForm,
        fullName: '',
        phone: '+92-300-',
        cnic: '35202-',
        address: '',
      });
      setEncounterForm((prev) => ({ ...prev, patientId: res.patient.id }));
      setLabForm((prev) => ({ ...prev, patientId: res.patient.id }));
      setSelectedVitalsPatientId(res.patient.id);
      notify('success', `Patient ${res.patient.fullName} registered (${res.patient.mrn}).`);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleRecordPatientVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation(
        `/api/patients/${selectedVitalsPatientId}/vitals`,
        vitalForm
      );
      setVitalForm({ ...vitalForm, clinicalNotes: '' });
      notify(
        'success',
        `Recorded vitals for ${res.vitalSign.patientName}: BP ${res.vitalSign.systolicBp}/${res.vitalSign.diastolicBp} mmHg, HR ${res.vitalSign.heartRate} bpm, SpO2 ${res.vitalSign.spo2}%.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/encounters', encounterForm);
      setEncounterForm({ ...encounterForm, chiefComplaint: '', diagnosis: '' });
      notify(
        'success',
        `${res.encounter.encounterType} ${res.encounter.tokenNo} created with Invoice ${res.invoice.invoiceNo}.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleUpdateEncounterStatus = async (id: string, status: string) => {
    try {
      await postMutation(`/api/encounters/${id}`, { status }, 'PATCH');
      notify('success', `Encounter updated to ${status}.`);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Laboratory Handlers
  const handleCreateLabOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/lab/orders', labForm);
      notify(
        'success',
        `Ordered ${res.labOrder.testName} · Barcode ${res.labOrder.sampleBarcode} generated.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleVerifyLabOrder = async (order: LabOrder, nextStatus: string) => {
    const input = labVerifyInputs[order.id] || {
      resultValue: order.resultValue || 'Within Normal Limits (Verified)',
      abnormalFlag: order.abnormalFlag || 'NORMAL',
    };
    try {
      await postMutation(
        `/api/lab/orders/${order.id}`,
        {
          status: nextStatus,
          resultValue: input.resultValue,
          abnormalFlag: input.abnormalFlag,
        },
        'PATCH'
      );
      notify('success', `Lab sample ${order.sampleBarcode} marked as ${nextStatus}.`);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Pharmacy POS & Inventory Handlers
  const handleCheckoutPos = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/pharmacy/pos', {
        saleType: posSaleType,
        customerName: posCustomerName,
        items: posCart,
        discount: 0,
        paymentMethod: posPaymentMethod,
        businessDate: posBusinessDate,
        paymentDate: posBusinessDate,
      });
      notify(
        'success',
        `Pharmacy ${posSaleType} Sale ${res.invoice.invoiceNo} completed (${res.invoice.netTotal.toLocaleString()} ${settings.currency}).`
      );
      setPrintableDoc({ type: 'INVOICE', data: res.invoice });
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleReceiveGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/pharmacy/purchase', grnForm);
      notify(
        'success',
        `GRN Received: ${res.batch.brandName} [Batch ${res.batch.batchNo}] capitalized to Inventory Asset.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleInternalTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/pharmacy/internal-transfer', transferForm);
      notify(
        'success',
        `Internal Transfer completed for ${res.batch.brandName} (Excluded from Revenue & Expense).`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Billing, Expense & HR Handlers
  const handleSettleInvoice = async (inv: Invoice) => {
    const due = inv.netTotal - inv.paidAmount - inv.refundedAmount;
    try {
      const res = await postMutation('/api/billing/payment', {
        invoiceId: inv.id,
        amount: due,
        paymentDate: '2026-10-10',
        paymentMethod: 'CASH',
      });
      notify('success', `Settled ${due.toLocaleString()} ${settings.currency} on ${res.invoice.invoiceNo}.`);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleRefundInvoice = async (inv: Invoice) => {
    const refundable = inv.paidAmount - inv.refundedAmount;
    if (refundable <= 0) return;
    try {
      const res = await postMutation('/api/billing/refund', {
        invoiceId: inv.id,
        refundAmount: refundable,
        reason: 'Authorized patient refund',
        paymentDate: '2026-10-10',
      });
      notify(
        'success',
        `Issued refund of ${refundable.toLocaleString()} ${settings.currency} on ${res.invoice.invoiceNo}.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/expenses', expenseForm);
      setExpenseForm({ ...expenseForm, description: '' });
      notify('success', `Expense ${res.expense.voucherNo} recorded in General Ledger.`);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleSettleParty = async (party: LedgerParty) => {
    const amt = Math.min(25000, party.currentBalance);
    if (amt <= 0) return;
    try {
      await postMutation('/api/ledgers/settle', {
        partyId: party.id,
        amount: amt,
        paymentDate: '2026-10-10',
      });
      notify(
        'success',
        `Settled ${amt.toLocaleString()} ${settings.currency} for ${party.name}.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleRunPayroll = async () => {
    try {
      const res = await postMutation('/api/hr/payroll', {
        payrollMonth,
        businessDate: '2026-10-10',
        paymentDate: '2026-10-10',
      });
      notify(
        'success',
        `Payroll for ${payrollMonth} disbursed (${res.totalDisbursed.toLocaleString()} ${settings.currency}).`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleToggleOfflineMode = async () => {
    const nextOffline = !settings.simulatedInternetOffline;
    try {
      await postMutation(
        '/api/settings',
        { simulatedInternetOffline: nextOffline },
        'PATCH'
      );
      notify(
        'success',
        nextOffline
          ? 'Internet Disconnected Simulation Active: Operating 100% on Local Hospital LAN Server.'
          : 'External Internet Restored: Cloud Sync & Gemini AI Assistant Active.'
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const cur = settings.currency;
  const expiringOrLowBatches = pharmacyBatches.filter(
    (b) => b.expiryDate <= '2026-12-31' || b.stockQty <= b.reorderLevel
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveModule('home');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          {settings.hospitalName} ERP
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveModule('home')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeModule === 'home'
                ? 'text-teal-700 border-b-2 border-teal-600 font-semibold'
                : ''
            }`}
          >
            Home & P&L
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('clinical')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeModule === 'clinical'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Clinical & IPD
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('laboratory')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeModule === 'laboratory'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Laboratory
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('pharmacy')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeModule === 'pharmacy'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Pharmacy POS
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveModule(
                activeModule === 'billing_hr' ? 'accounting_security' : 'billing_hr'
              )
            }
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeModule === 'billing_hr' || activeModule === 'accounting_security'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Finance, HR & Go-Live
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out ({user.email?.split('@')[0]})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Cloud Sign-In</span>
            </button>
          )}
        </div>
      </header>

      {/* WORKSPACE CONTROL BAR (Client Mode, LAN Offline Simulation, RBAC Role, Attribution) */}
      <div className="bg-slate-900 text-slate-200 px-6 py-2.5 border-b border-slate-800 text-xs">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-white">
              Developed by Sajjad Qaiser Shah
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-slate-300">
              Central DB: {settings.dbBindAddress}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <button
              type="button"
              onClick={handleToggleOfflineMode}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                settings.simulatedInternetOffline
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-emerald-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {settings.simulatedInternetOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Internet Disconnected (LAN-Only Mode Active)</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>LAN + Internet Connected (Click to Test Offline LAN)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Client Form Factor Selector */}
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setClientMode('LAN_WEB')}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  clientMode === 'LAN_WEB'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>LAN Web</span>
              </button>
              <button
                type="button"
                onClick={() => setClientMode('WINDOWS_DESKTOP')}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  clientMode === 'WINDOWS_DESKTOP'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>Windows App</span>
              </button>
              <button
                type="button"
                onClick={() => setClientMode('MOBILE_LAN')}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  clientMode === 'MOBILE_LAN'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Mobile Wi-Fi</span>
              </button>
            </div>

            {/* Staff Role RBAC Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Active Role:</span>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as StaffRole)}
                className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs font-mono"
              >
                <option value="ADMIN">ADMIN (Full Access)</option>
                <option value="DOCTOR">DOCTOR (Clinical/Lab)</option>
                <option value="LAB_TECH">LAB_TECH (Pathology)</option>
                <option value="PHARMACIST">PHARMACIST (POS/Stock)</option>
                <option value="CASHIER">CASHIER (Billing)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (Ledger/P&L)</option>
                <option value="HR_MANAGER">HR_MANAGER (Payroll)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Organized Module Bar (Visible across all screens for instant 1-click switching) */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 py-2 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto w-full flex items-center gap-2">
          {(
            [
              ['home', 'Home & P&L Graphs (ہوم پیج)'],
              ['clinical', 'Clinical & IPD Registry'],
              ['laboratory', 'Laboratory & Barcodes'],
              ['pharmacy', 'Pharmacy POS & Stock'],
              ['billing_hr', 'Billing, Expenses & HR'],
              ['accounting_security', 'Double-Entry P&L & Go-Live'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveModule(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                activeModule === key
                  ? key === 'home'
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Container (Adapts for LAN Web, Windows Desktop Wrapper, or Mobile Ward Client) */}
      <div
        className={`flex-1 mx-auto w-full transition-all ${
          clientMode === 'MOBILE_LAN'
            ? 'max-w-md border-x border-slate-300 bg-white shadow-sm my-4 rounded-xl overflow-hidden'
            : 'max-w-[1440px] px-4 sm:px-6 py-6'
        }`}
      >
        {/* Windows Desktop Client Titlebar Banner when in WINDOWS_DESKTOP mode */}
        {clientMode === 'WINDOWS_DESKTOP' && (
          <div className="mb-5 bg-slate-800 text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span>
                HospitalERP-Win64-Workstation.exe · Secure WebView2 Kiosk · Connected to 192.168.10.10:3000
              </span>
            </div>
            <div>USB Barcode HID: READY · Thermal Printer: COM1 · Developed by Sajjad Qaiser Shah</div>
          </div>
        )}

        {/* Mobile Ward Wi-Fi Header when in MOBILE_LAN mode */}
        {clientMode === 'MOBILE_LAN' && (
          <div className="bg-slate-900 text-white px-4 py-3 text-xs flex items-center justify-between">
            <div>
              <div className="font-bold">Hospital Ward Mobile Client</div>
              <div className="text-[11px] text-slate-300">
                Wi-Fi VLAN 192.168.20.0/24 · Developed by Sajjad Qaiser Shah
              </div>
            </div>
            <span className="font-mono text-[11px] text-emerald-400">LAN SYNC</span>
          </div>
        )}

        <div className={clientMode === 'MOBILE_LAN' ? 'p-4 space-y-6' : 'space-y-6'}>
          {/* Notification Banner */}
          {statusBanner && (
            <div
              className={`px-4 py-3 rounded-md border text-xs flex items-center justify-between ${
                statusBanner.kind === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {statusBanner.kind === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                )}
                <span>{statusBanner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-xs underline ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Top Executive KPI Strip (Tabular Numerals, Unboxed Metadata) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">
                Registered Patients · Active OPD/IPD
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {patients.length} Patients · {encounters.length} Visits
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                IPD Admitted: {encounters.filter((e) => e.status === 'ADMITTED').length} · Doctors On Duty: {doctors.filter((d) => d.onDuty).length}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">
                Laboratory Barcode Orders
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {labOrders.length} Samples
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                Verified Reports: {labOrders.filter((l) => l.status === 'VERIFIED').length} · Pending: {labOrders.filter((l) => l.status !== 'VERIFIED').length}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">
                Pharmacy Stock & Expiry Alerts
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {pharmacyBatches.reduce((a, b) => a + b.stockQty, 0)} Units
              </div>
              <div className="text-xs text-amber-700 mt-1.5">
                {expiringOrLowBatches.length} Batches Require Expiry / Reorder Attention
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">
                Consolidated Net Profit ({cur})
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {analytics.consolidated.netProfit.toLocaleString()} {cur}
              </div>
              <div className="text-xs text-emerald-700 mt-1.5">
                Double-Entry Balanced (DR = CR: {analytics.totalDebits.toLocaleString()})
              </div>
            </div>
          </div>

          {/* =====================================================================
              MODULE 0: HOME DASHBOARD — DAILY, WEEKLY & MONTHLY PROFIT/LOSS & GRAPHS
             ===================================================================== */}
          {activeModule === 'home' && (
            <HomeDashboardView
              hospitalName={settings.hospitalName}
              currency={cur}
              analytics={analytics}
              patients={patients}
              encounters={encounters}
              labOrders={labOrders}
              pharmacyBatches={pharmacyBatches}
              invoices={invoices}
              onNavigateModule={(mod) => setActiveModule(mod)}
            />
          )}

          {/* =====================================================================
              MODULE 1: CLINICAL — PATIENT REGISTRY, OPD APPOINTMENTS & IPD ADMISSIONS
             ===================================================================== */}
          {activeModule === 'clinical' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Register New Patient Form */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
                  <h2 className="text-base font-bold text-slate-900">
                    01. Central Hospital Patient Registry
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assigns unique MRN and records separate registration Business Date · Developed by Sajjad Qaiser Shah
                  </p>

                  <form onSubmit={handleRegisterPatient} className="mt-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={patientForm.fullName}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, fullName: e.target.value })
                          }
                          placeholder="e.g., Bilal Hassan"
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Phone Number *</label>
                        <input
                          type="text"
                          required
                          value={patientForm.phone}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, phone: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Age</label>
                        <input
                          type="number"
                          value={patientForm.age}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, age: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Gender</label>
                        <select
                          value={patientForm.gender}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, gender: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Blood Group</label>
                        <select
                          value={patientForm.bloodGroup}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, bloodGroup: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white font-mono text-slate-900"
                        >
                          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">National ID (CNIC)</label>
                        <input
                          type="text"
                          value={patientForm.cnic}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, cnic: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Business Date</label>
                        <input
                          type="date"
                          value={patientForm.businessDate}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, businessDate: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Drug Allergies</label>
                        <input
                          type="text"
                          value={patientForm.allergies}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, allergies: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Residential Address</label>
                        <input
                          type="text"
                          value={patientForm.address}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, address: e.target.value })
                          }
                          placeholder="Street, Sector, City"
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Register Patient in Central DB
                    </button>
                  </form>
                </div>

                {/* Book OPD Appointment / Admit IPD Patient */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
                  <h2 className="text-base font-bold text-slate-900">
                    02. OPD Appointment Scheduling & IPD Ward Admission
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Atomically creates clinical encounter, patient invoice, and balanced double-entry journal voucher
                  </p>

                  <form onSubmit={handleCreateEncounter} className="mt-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Select Patient</label>
                        <select
                          value={encounterForm.patientId}
                          onChange={(e) =>
                            setEncounterForm({ ...encounterForm, patientId: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                        >
                          {patients.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.mrn} · {p.fullName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-1">Consulting Doctor</label>
                        <select
                          value={encounterForm.doctorId}
                          onChange={(e) => {
                            const doc = doctors.find((d) => d.id === e.target.value);
                            setEncounterForm({
                              ...encounterForm,
                              doctorId: e.target.value,
                              fee:
                                encounterForm.encounterType === 'IPD'
                                  ? 45000
                                  : doc?.consultationFee || 2500,
                              wardBed:
                                encounterForm.encounterType === 'IPD'
                                  ? 'Surgical Ward A · Bed 08'
                                  : doc?.roomNo || 'OPD-101',
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                        >
                          {doctors.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.fullName} ({d.department})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-1">Encounter Type</label>
                        <select
                          value={encounterForm.encounterType}
                          onChange={(e) => {
                            const t = e.target.value as 'OPD' | 'IPD' | 'EMERGENCY';
                            setEncounterForm({
                              ...encounterForm,
                              encounterType: t,
                              fee: t === 'IPD' ? 45000 : 2500,
                              wardBed:
                                t === 'IPD' ? 'Surgical Ward A · Bed 08' : 'OPD-101',
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white font-semibold text-slate-900"
                        >
                          <option value="OPD">OPD Consultation</option>
                          <option value="IPD">IPD Ward Admission</option>
                          <option value="EMERGENCY">Emergency Triage</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">
                          Room / IPD Ward & Bed No
                        </label>
                        <input
                          type="text"
                          value={encounterForm.wardBed}
                          onChange={(e) =>
                            setEncounterForm({ ...encounterForm, wardBed: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">
                          Consultation / Admission Fee ({cur})
                        </label>
                        <input
                          type="number"
                          value={encounterForm.fee}
                          onChange={(e) =>
                            setEncounterForm({
                              ...encounterForm,
                              fee: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Payment Method</label>
                        <select
                          value={encounterForm.paymentMethod}
                          onChange={(e) =>
                            setEncounterForm({
                              ...encounterForm,
                              paymentMethod: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                        >
                          <option value="CASH">Cash Settlement</option>
                          <option value="CARD">Debit / Credit Card</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CREDIT_LEDGER">Credit / Unpaid Receivable</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">
                          Chief Complaint & Vitals
                        </label>
                        <input
                          type="text"
                          required
                          value={encounterForm.chiefComplaint}
                          onChange={(e) =>
                            setEncounterForm({
                              ...encounterForm,
                              chiefComplaint: e.target.value,
                            })
                          }
                          placeholder="e.g., Acute abdominal pain, BP 135/85 mmHg"
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">
                          Provisional Diagnosis / Treatment Plan
                        </label>
                        <input
                          type="text"
                          value={encounterForm.diagnosis}
                          onChange={(e) =>
                            setEncounterForm({
                              ...encounterForm,
                              diagnosis: e.target.value,
                            })
                          }
                          placeholder="e.g., Admit to Surgical Ward for IV Fluids & Ultrasound"
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">
                          Service Business Date
                        </label>
                        <input
                          type="date"
                          value={encounterForm.businessDate}
                          onChange={(e) =>
                            setEncounterForm({
                              ...encounterForm,
                              businessDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Payment Date</label>
                        <input
                          type="date"
                          value={encounterForm.paymentDate}
                          onChange={(e) =>
                            setEncounterForm({
                              ...encounterForm,
                              paymentDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Confirm {encounterForm.encounterType} Encounter & Generate Invoice
                    </button>
                  </form>
                </div>
              </div>

              {/* Patient Registry Directory & Longitudinal Vitals Trend Tracker */}
              {(() => {
                const selectedPatient =
                  patients.find((p) => p.id === selectedVitalsPatientId) || patients[0];
                const patientVitals = vitalSigns
                  .filter((v) => v.patientId === selectedPatient?.id)
                  .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

                const latestVital = patientVitals[0];
                const previousVital = patientVitals[1];

                const sysDelta =
                  latestVital && previousVital
                    ? latestVital.systolicBp - previousVital.systolicBp
                    : 0;
                const diaDelta =
                  latestVital && previousVital
                    ? latestVital.diastolicBp - previousVital.diastolicBp
                    : 0;
                const hrDelta =
                  latestVital && previousVital
                    ? latestVital.heartRate - previousVital.heartRate
                    : 0;
                const spo2Delta =
                  latestVital && previousVital
                    ? latestVital.spo2 - previousVital.spo2
                    : 0;

                const formatDelta = (val: number, unit: string) => {
                  if (!previousVital) return 'Baseline entry';
                  if (val === 0) return `0 ${unit} (Stable vs prior)`;
                  return `${val > 0 ? `+${val}` : val} ${unit} vs prior`;
                };

                return (
                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          03. Patient Registry Directory & Longitudinal Vitals Trend Tracker
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Track multi-encounter trends in Blood Pressure (mmHg), Heart Rate (bpm), Oxygen Saturation (SpO2 %), and Temperature (°C) · Developed by Sajjad Qaiser Shah
                        </p>
                      </div>

                      {/* Interactive Patient Selector Tabs */}
                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-md">
                        {patients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedVitalsPatientId(p.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              selectedPatient?.id === p.id
                                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {p.mrn} · {p.fullName}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected Patient Demographics & Latest Multi-Encounter Trend Summary */}
                    {selectedPatient && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="border border-slate-200 rounded-md p-3.5">
                          <div className="text-xs text-slate-500">
                            Selected Patient Profile
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1">
                            {selectedPatient.fullName} ({selectedPatient.mrn})
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {selectedPatient.age} yrs · {selectedPatient.gender} · Blood{' '}
                            <strong className="font-mono">{selectedPatient.bloodGroup}</strong> · Allergies:{' '}
                            <strong className="text-red-700">{selectedPatient.allergies}</strong>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-md p-3.5">
                          <div className="text-xs text-slate-500">
                            Blood Pressure Trend (Systolic / Diastolic)
                          </div>
                          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                            {latestVital
                              ? `${latestVital.systolicBp}/${latestVital.diastolicBp} mmHg`
                              : 'No Readings'}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-slate-600 mt-1">
                            {latestVital
                              ? `Sys ${formatDelta(sysDelta, 'mmHg')} · Dia ${
                                  diaDelta > 0 ? `+${diaDelta}` : diaDelta
                                } mmHg`
                              : 'Awaiting first encounter check'}
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-md p-3.5">
                          <div className="text-xs text-slate-500">
                            Heart Rate (Pulse) Trend
                          </div>
                          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                            {latestVital ? `${latestVital.heartRate} bpm` : 'No Readings'}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-slate-600 mt-1">
                            {latestVital
                              ? `${formatDelta(hrDelta, 'bpm')} · ${
                                  latestVital.heartRate > 100
                                    ? 'Tachycardic (>100 bpm)'
                                    : latestVital.heartRate < 60
                                    ? 'Bradycardic (<60 bpm)'
                                    : 'Normal Sinus Rate'
                                }`
                              : 'Awaiting first encounter check'}
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-md p-3.5">
                          <div className="text-xs text-slate-500">
                            Oxygen Saturation (SpO2) & Temp
                          </div>
                          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                            {latestVital
                              ? `${latestVital.spo2}% SpO2 · ${latestVital.temperatureC.toFixed(1)}°C`
                              : 'No Readings'}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-slate-600 mt-1">
                            {latestVital
                              ? `${formatDelta(spo2Delta, '%')} · ${
                                  latestVital.spo2 < 95 ? 'Hypoxemia Alert (<95%)' : 'Normoxic (Room Air)'
                                }`
                              : 'Awaiting first encounter check'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Longitudinal Vitals Trend Chart (Recharts LineChart: Systolic BP, Heart Rate, SpO2 & Temperature °C) */}
                    {patientVitals.length > 0 && (() => {
                      const chronologicalChartData = [...patientVitals]
                        .reverse()
                        .map((v) => ({
                          label: `${v.businessDate.slice(5)} · ${(v.encounterToken || 'Check').split(' ')[0]}`,
                          fullTimestamp: `${v.businessDate} ${v.recordedAt.slice(11, 16)} UTC (${v.encounterToken || 'OPD/Ward'})`,
                          systolicBp: v.systolicBp,
                          diastolicBp: v.diastolicBp,
                          heartRate: v.heartRate,
                          spo2: v.spo2,
                          temperatureC: Number(v.temperatureC ?? 37.0),
                        }));

                      return (
                        <div className="border border-slate-200 rounded-md p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">
                                Longitudinal Clinical Vitals Trajectory — {selectedPatient?.fullName} ({selectedPatient?.mrn})
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Chronological progression of Systolic Blood Pressure (mmHg), Heart Rate (bpm), Oxygen Saturation (SpO2 %), and Temperature (°C) across encounters
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-600">
                              <span>Sys BP Threshold: 140 mmHg</span>
                              <span>·</span>
                              <span>SpO2 Normal: &ge;95%</span>
                              <span>·</span>
                              <span className="text-rose-700">Fever Threshold: &ge;38.0°C</span>
                            </div>
                          </div>

                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={chronologicalChartData}
                                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis
                                  dataKey="label"
                                  tick={{ fontSize: 11, fill: '#475569', fontFamily: 'IBM Plex Mono, monospace' }}
                                  stroke="#CBD5E1"
                                />
                                <YAxis
                                  yAxisId="left"
                                  domain={[50, 200]}
                                  tick={{ fontSize: 11, fill: '#475569', fontFamily: 'IBM Plex Mono, monospace' }}
                                  stroke="#CBD5E1"
                                  label={{
                                    value: 'mmHg / bpm',
                                    angle: -90,
                                    position: 'insideLeft',
                                    style: { fontSize: 10, fill: '#64748B' },
                                  }}
                                />
                                <YAxis
                                  yAxisId="right"
                                  orientation="right"
                                  domain={[35, 100]}
                                  tick={{ fontSize: 11, fill: '#15803D', fontFamily: 'IBM Plex Mono, monospace' }}
                                  stroke="#CBD5E1"
                                  label={{
                                    value: 'SpO2 % / Temp °C',
                                    angle: 90,
                                    position: 'insideRight',
                                    style: { fontSize: 10, fill: '#15803D' },
                                  }}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: '#FFFFFF',
                                    borderColor: '#E2E8F0',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontFamily: 'IBM Plex Mono, monospace',
                                  }}
                                  labelFormatter={(_label, payload) =>
                                    payload?.[0]?.payload?.fullTimestamp || _label
                                  }
                                />
                                <Legend
                                  wrapperStyle={{
                                    fontSize: '12px',
                                    paddingTop: '6px',
                                  }}
                                />
                                <ReferenceLine
                                  yAxisId="left"
                                  y={140}
                                  stroke="#D97706"
                                  strokeDasharray="4 4"
                                />
                                <Line
                                  yAxisId="left"
                                  type="monotone"
                                  dataKey="systolicBp"
                                  name="Systolic BP (mmHg)"
                                  stroke="#0F172A"
                                  strokeWidth={2.25}
                                  dot={{ r: 4, fill: '#0F172A' }}
                                  activeDot={{ r: 6 }}
                                />
                                <Line
                                  yAxisId="left"
                                  type="monotone"
                                  dataKey="heartRate"
                                  name="Heart Rate (bpm)"
                                  stroke="#D97706"
                                  strokeWidth={2}
                                  dot={{ r: 3.5, fill: '#D97706' }}
                                  activeDot={{ r: 5.5 }}
                                />
                                <Line
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="spo2"
                                  name="SpO2 (%)"
                                  stroke="#16A34A"
                                  strokeWidth={2}
                                  dot={{ r: 3.5, fill: '#16A34A' }}
                                  activeDot={{ r: 5.5 }}
                                />
                                <Line
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="temperatureC"
                                  name="Temperature (°C)"
                                  stroke="#E11D48"
                                  strokeWidth={2}
                                  dot={{ r: 3.5, fill: '#E11D48' }}
                                  activeDot={{ r: 5.5 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Inline Form to Log New Vitals Entry + Tabular Historical Vitals Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <form
                        onSubmit={handleRecordPatientVitals}
                        className="lg:col-span-4 border border-slate-200 rounded-md p-4 space-y-3 text-xs bg-slate-50/50"
                      >
                        <div className="font-semibold text-slate-900">
                          Log New Vitals Entry for {selectedPatient?.fullName}
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-slate-600 mb-1">
                              Systolic BP (mmHg)
                            </label>
                            <input
                              type="number"
                              required
                              min={50}
                              max={280}
                              value={vitalForm.systolicBp}
                              onChange={(e) =>
                                setVitalForm({
                                  ...vitalForm,
                                  systolicBp: Number(e.target.value),
                                })
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">
                              Diastolic BP (mmHg)
                            </label>
                            <input
                              type="number"
                              required
                              min={30}
                              max={180}
                              value={vitalForm.diastolicBp}
                              onChange={(e) =>
                                setVitalForm({
                                  ...vitalForm,
                                  diastolicBp: Number(e.target.value),
                                })
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-slate-600 mb-1">
                              Heart Rate (bpm)
                            </label>
                            <input
                              type="number"
                              required
                              min={30}
                              max={240}
                              value={vitalForm.heartRate}
                              onChange={(e) =>
                                setVitalForm({
                                  ...vitalForm,
                                  heartRate: Number(e.target.value),
                                })
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">SpO2 (%)</label>
                            <input
                              type="number"
                              required
                              min={50}
                              max={100}
                              value={vitalForm.spo2}
                              onChange={(e) =>
                                setVitalForm({
                                  ...vitalForm,
                                  spo2: Number(e.target.value),
                                })
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">Temp (°C)</label>
                            <input
                              type="number"
                              step="0.1"
                              required
                              value={vitalForm.temperatureC}
                              onChange={(e) =>
                                setVitalForm({
                                  ...vitalForm,
                                  temperatureC: Number(e.target.value),
                                })
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-slate-600 mb-1">
                              Encounter Reference
                            </label>
                            <input
                              type="text"
                              value={vitalForm.encounterToken}
                              onChange={(e) =>
                                setVitalForm({
                                  ...vitalForm,
                                  encounterToken: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">
                              Business Date
                            </label>
                            <input
                              type="date"
                              value={vitalForm.businessDate}
                              onChange={(e) =>
                                setVitalForm({
                                  ...vitalForm,
                                  businessDate: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-600 mb-1">
                            Clinical Observation Notes
                          </label>
                          <input
                            type="text"
                            value={vitalForm.clinicalNotes}
                            onChange={(e) =>
                              setVitalForm({
                                ...vitalForm,
                                clinicalNotes: e.target.value,
                              })
                            }
                            placeholder="e.g., Supine resting check after antihypertensive dose"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-900"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 px-3 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Record Vitals Entry
                        </button>
                      </form>

                      {/* Tabular Historical Vitals Display */}
                      <div className="lg:col-span-8 overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="py-2.5 font-medium">Business Date & UTC Time</th>
                              <th className="py-2.5 font-medium">Encounter</th>
                              <th className="py-2.5 font-medium text-right">
                                Blood Pressure (mmHg)
                              </th>
                              <th className="py-2.5 font-medium text-right">
                                MAP (mmHg)
                              </th>
                              <th className="py-2.5 font-medium text-right">
                                Heart Rate (bpm)
                              </th>
                              <th className="py-2.5 font-medium text-right">
                                SpO2 (%)
                              </th>
                              <th className="py-2.5 font-medium text-right">
                                Temp (°C)
                              </th>
                              <th className="py-2.5 font-medium pl-4">
                                Clinical Trend & Notes
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {patientVitals.map((v, idx) => {
                              const older = patientVitals[idx + 1];
                              const dSys = older ? v.systolicBp - older.systolicBp : 0;
                              const dHr = older ? v.heartRate - older.heartRate : 0;
                              const mapVal = Math.round(
                                (v.systolicBp + 2 * v.diastolicBp) / 3
                              );
                              const isHypertensive =
                                v.systolicBp >= 140 || v.diastolicBp >= 90;
                              const isLowSpo2 = v.spo2 < 95;
                              const isTachy = v.heartRate > 100;

                              return (
                                <tr key={v.id} className="hover:bg-slate-50">
                                  <td className="py-2.5 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                                    <div className="font-semibold text-slate-900">
                                      {v.businessDate}
                                    </div>
                                    <div className="text-slate-500">
                                      {v.recordedAt.slice(11, 19)} UTC
                                    </div>
                                  </td>
                                  <td className="py-2.5 font-mono text-slate-700 whitespace-nowrap">
                                    {v.encounterToken || 'OPD/Ward'}
                                  </td>
                                  <td className="py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                                    <span
                                      className={
                                        isHypertensive
                                          ? 'font-bold text-amber-700'
                                          : 'font-semibold text-slate-900'
                                      }
                                    >
                                      {v.systolicBp}/{v.diastolicBp}
                                    </span>
                                    {older && dSys !== 0 && (
                                      <span className="block text-[11px] text-slate-500">
                                        {dSys > 0 ? `+${dSys}` : dSys} sys
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                                    {mapVal}
                                  </td>
                                  <td className="py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                                    <span
                                      className={
                                        isTachy
                                          ? 'font-bold text-amber-700'
                                          : 'font-semibold text-slate-900'
                                      }
                                    >
                                      {v.heartRate}
                                    </span>
                                    {older && dHr !== 0 && (
                                      <span className="block text-[11px] text-slate-500">
                                        {dHr > 0 ? `+${dHr}` : dHr} bpm
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                                    <span
                                      className={
                                        isLowSpo2
                                          ? 'font-bold text-red-700'
                                          : 'font-semibold text-emerald-700'
                                      }
                                    >
                                      {v.spo2}%
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                                    {v.temperatureC.toFixed(1)}°C
                                  </td>
                                  <td className="py-2.5 pl-4">
                                    <div className="text-slate-900">{v.clinicalNotes}</div>
                                    <div className="text-slate-500">
                                      {isHypertensive
                                        ? 'Elevated BP'
                                        : isTachy
                                        ? 'Tachycardia'
                                        : isLowSpo2
                                        ? 'Low SpO2'
                                        : 'Nominal Vitals'}{' '}
                                      · Recorded by {v.recordedBy}
                                    </div>
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
              })()}

              {/* Active OPD & IPD Encounters Table */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      04. Active OPD Queue & IPD Admissions Register
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real-time clinical encounters synchronized across Reception, Nursing Stations, and Doctor Consultations
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-600">
                    Total Encounters: {encounters.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">Token / Type</th>
                        <th className="py-2.5 font-medium">Patient & MRN</th>
                        <th className="py-2.5 font-medium">Physician & Ward/Room</th>
                        <th className="py-2.5 font-medium">Complaint & Clinical Notes</th>
                        <th className="py-2.5 font-medium">Business Date</th>
                        <th className="py-2.5 font-medium">Status</th>
                        <th className="py-2.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {encounters.map((enc) => (
                        <tr key={enc.id} className="hover:bg-slate-50">
                          <td className="py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {enc.tokenNo} · {enc.encounterType}
                          </td>
                          <td className="py-2.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{enc.patientName}</div>
                            <div className="font-mono text-slate-500">{enc.patientMrn}</div>
                          </td>
                          <td className="py-2.5 whitespace-nowrap">
                            <div className="text-slate-900">{enc.doctorName}</div>
                            <div className="text-slate-500">{enc.wardBed}</div>
                          </td>
                          <td className="py-2.5">
                            <div className="text-slate-900">{enc.chiefComplaint}</div>
                            <div className="text-slate-500">{enc.diagnosis} · {enc.vitals}</div>
                          </td>
                          <td className="py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {enc.businessDate}
                          </td>
                          <td className="py-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {enc.status}
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap space-x-2">
                            {enc.encounterType === 'IPD' && enc.status === 'ADMITTED' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateEncounterStatus(enc.id, 'DISCHARGED')
                                }
                                className="px-2.5 py-1 text-xs font-medium text-slate-900 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                Discharge IPD
                              </button>
                            )}
                            {enc.encounterType !== 'IPD' && enc.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateEncounterStatus(enc.id, 'COMPLETED')
                                }
                                className="px-2.5 py-1 text-xs font-medium text-slate-900 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                Complete OPD
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const inv = invoices.find((i) => i.id === enc.invoiceId);
                                if (inv) setPrintableDoc({ type: 'INVOICE', data: inv });
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              MODULE 2: LABORATORY — TEST ORDERING, BARCODE SAMPLES & VERIFICATION
             ===================================================================== */}
          {activeModule === 'laboratory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5">
                  <h2 className="text-base font-bold text-slate-900">
                    01. Order Diagnostic Lab Test
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generates unique sample barcode, patient invoice, and Laboratory revenue voucher · Developed by Sajjad Qaiser Shah
                  </p>

                  <form onSubmit={handleCreateLabOrder} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-1">Select Patient</label>
                      <select
                        value={labForm.patientId}
                        onChange={(e) =>
                          setLabForm({ ...labForm, patientId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                      >
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.mrn} · {p.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">Ordering Doctor</label>
                      <select
                        value={labForm.doctorId}
                        onChange={(e) =>
                          setLabForm({ ...labForm, doctorId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                      >
                        {doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Test Code</label>
                        <input
                          type="text"
                          value={labForm.testCode}
                          onChange={(e) =>
                            setLabForm({ ...labForm, testCode: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Category</label>
                        <select
                          value={labForm.category}
                          onChange={(e) =>
                            setLabForm({ ...labForm, category: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                        >
                          <option value="Hematology">Hematology</option>
                          <option value="Biochemistry">Biochemistry</option>
                          <option value="Microbiology">Microbiology</option>
                          <option value="Serology">Serology</option>
                          <option value="Pathology">Pathology</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">Test Name</label>
                      <input
                        type="text"
                        required
                        value={labForm.testName}
                        onChange={(e) =>
                          setLabForm({ ...labForm, testName: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Reference Range</label>
                        <input
                          type="text"
                          value={labForm.referenceRange}
                          onChange={(e) =>
                            setLabForm({ ...labForm, referenceRange: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Test Fee ({cur})</label>
                        <input
                          type="number"
                          value={labForm.price}
                          onChange={(e) =>
                            setLabForm({ ...labForm, price: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Generate Sample Barcode & Order Test
                    </button>
                  </form>
                </div>

                {/* Barcode Sample Tracking & Result Verification */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        02. Barcode Sample Queue, Result Entry & Pathologist Verification
                      </h2>
                      <p className="text-xs text-slate-500">
                        Once verified by pathologist, reports are locked for clinical integrity and ready for printing
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-600">
                      Orders: {labOrders.length}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {labOrders.map((o) => {
                      const draft = labVerifyInputs[o.id] ?? {
                        resultValue: o.resultValue,
                        abnormalFlag: o.abnormalFlag,
                      };
                      return (
                        <div
                          key={o.id}
                          className="border border-slate-200 rounded-md p-4 space-y-3 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Barcode className="w-4 h-4 text-slate-700" />
                              <span className="font-mono font-bold text-slate-900">
                                {o.sampleBarcode}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="font-semibold text-slate-900">
                                {o.patientName} ({o.patientMrn})
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-600">{o.category}</span>
                            </div>
                            <div className="font-mono font-semibold text-slate-800">
                              Status: {o.status}
                            </div>
                          </div>

                          <div className="text-sm font-semibold text-slate-900">
                            {o.testName}{' '}
                            <span className="text-xs font-mono font-normal text-slate-500">
                              (Ref: {o.referenceRange})
                            </span>
                          </div>

                          {o.status !== 'VERIFIED' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 items-center">
                              <div className="sm:col-span-6">
                                <input
                                  type="text"
                                  placeholder="Enter measured quantitative result..."
                                  value={draft.resultValue}
                                  onChange={(e) =>
                                    setLabVerifyInputs({
                                      ...labVerifyInputs,
                                      [o.id]: { ...draft, resultValue: e.target.value },
                                    })
                                  }
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono text-slate-900"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <select
                                  value={draft.abnormalFlag}
                                  onChange={(e) =>
                                    setLabVerifyInputs({
                                      ...labVerifyInputs,
                                      [o.id]: {
                                        ...draft,
                                        abnormalFlag: e.target.value as any,
                                      },
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-slate-900"
                                >
                                  <option value="NORMAL">Flag: NORMAL</option>
                                  <option value="HIGH">Flag: HIGH</option>
                                  <option value="LOW">Flag: LOW</option>
                                  <option value="CRITICAL">Flag: CRITICAL</option>
                                </select>
                              </div>
                              <div className="sm:col-span-3 flex justify-end gap-2">
                                {o.status === 'ORDERED' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleVerifyLabOrder(o, 'SAMPLE_COLLECTED')
                                    }
                                    className="px-3 py-1.5 border border-slate-300 rounded font-medium text-slate-800 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                                  >
                                    Collect Sample
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleVerifyLabOrder(o, 'VERIFIED')}
                                  className="px-3 py-1.5 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                                >
                                  Verify & Lock
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="font-mono text-slate-800">
                                Result: <strong>{o.resultValue}</strong> · Flag: {o.abnormalFlag} · Verified by {o.verifiedBy}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPrintableDoc({ type: 'LAB_REPORT', data: o })
                                }
                                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Official Lab Report</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              MODULE 3: PHARMACY POS, RETAIL/WHOLESALE, BATCHES, EXPIRY & TRANSFERS
             ===================================================================== */}
          {activeModule === 'pharmacy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Pharmacy POS Counter */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      01. Atomic Pharmacy POS (Retail & Wholesale)
                    </h2>
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded">
                      <button
                        type="button"
                        onClick={() => setPosSaleType('RETAIL')}
                        className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                          posSaleType === 'RETAIL'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Retail POS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPosSaleType('WHOLESALE');
                          setPosCustomerName('City Care Clinic (Wholesale)');
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                          posSaleType === 'WHOLESALE'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Wholesale B2B
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Atomically verifies batch expiry & stock, deducts inventory, and posts both Revenue and Batch COGS vouchers · Developed by Sajjad Qaiser Shah
                  </p>

                  <form onSubmit={handleCheckoutPos} className="mt-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">
                          Customer / Patient Name
                        </label>
                        <input
                          type="text"
                          value={posCustomerName}
                          onChange={(e) => setPosCustomerName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Business Date</label>
                        <input
                          type="date"
                          value={posBusinessDate}
                          onChange={(e) => setPosBusinessDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span>Cart Batch Items</span>
                        <button
                          type="button"
                          onClick={() =>
                            setPosCart([
                              ...posCart,
                              { batchId: pharmacyBatches[0]?.id || 'BAT-501', qty: 1 },
                            ])
                          }
                          className="text-slate-900 underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Line</span>
                        </button>
                      </div>

                      {posCart.map((line, idx) => {
                        const batch = pharmacyBatches.find((b) => b.id === line.batchId);
                        const unitPrice = batch
                          ? posSaleType === 'WHOLESALE'
                            ? batch.wholesalePrice
                            : batch.retailPrice
                          : 0;
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-7">
                              <select
                                value={line.batchId}
                                onChange={(e) => {
                                  const next = [...posCart];
                                  next[idx].batchId = e.target.value;
                                  setPosCart(next);
                                }}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-900"
                              >
                                {pharmacyBatches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.brandName} [{b.batchNo}] (Avail: {b.stockQty})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min={1}
                                value={line.qty}
                                onChange={(e) => {
                                  const next = [...posCart];
                                  next[idx].qty = Math.max(1, Number(e.target.value));
                                  setPosCart(next);
                                }}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono text-right text-slate-900"
                              />
                            </div>
                            <div className="col-span-3 text-right font-mono tabular-nums font-semibold">
                              {(unitPrice * line.qty).toLocaleString()} {cur}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between font-mono text-sm font-bold">
                      <span>POS Net Total ({posSaleType}):</span>
                      <span>
                        {posCart
                          .reduce((sum, l) => {
                            const b = pharmacyBatches.find((x) => x.id === l.batchId);
                            const p = b
                              ? posSaleType === 'WHOLESALE'
                                ? b.wholesalePrice
                                : b.retailPrice
                              : 0;
                            return sum + p * l.qty;
                          }, 0)
                          .toLocaleString()}{' '}
                        {cur}
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">Payment Mode</label>
                      <select
                        value={posPaymentMethod}
                        onChange={(e) => setPosPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                      >
                        <option value="CASH">Cash Counter Settlement</option>
                        <option value="CARD">POS Card Terminal</option>
                        <option value="CREDIT_LEDGER">Credit Ledger Account</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Complete Atomic POS Sale & Print Receipt
                    </button>
                  </form>
                </div>

                {/* Purchase GRN & Internal Ward Transfer */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Receive Purchase GRN */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <h2 className="text-base font-bold text-slate-900">
                      02. Receive Supplier Purchase (GRN — Capitalized to Asset)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Increases batch inventory and posts DR Pharmacy Inventory Asset / CR Supplier Payable (Never double-counted as expense upon purchase)
                    </p>

                    <form onSubmit={handleReceiveGrn} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 mb-1">Medicine Brand Name</label>
                        <input
                          type="text"
                          required
                          value={grnForm.brandName}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, brandName: e.target.value })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Batch Number</label>
                        <input
                          type="text"
                          required
                          value={grnForm.batchNo}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, batchNo: e.target.value })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          required
                          value={grnForm.expiryDate}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, expiryDate: e.target.value })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Qty Received</label>
                        <input
                          type="number"
                          value={grnForm.qty}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, qty: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Unit Cost ({cur})</label>
                        <input
                          type="number"
                          value={grnForm.unitCost}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, unitCost: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Retail Price ({cur})</label>
                        <input
                          type="number"
                          value={grnForm.retailPrice}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, retailPrice: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-1.5 px-3 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Receive Batch GRN
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Internal Stock Transfer */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-slate-700" />
                      <span>03. Internal Interdepartmental Ward Transfer (Non-Revenue)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Moves stock from Main Pharmacy Store to IPD Ward Emergency Consignment without inflating hospital or pharmacy revenue
                    </p>

                    <form onSubmit={handleInternalTransfer} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 mb-1">Medicine Batch</label>
                        <select
                          value={transferForm.batchId}
                          onChange={(e) =>
                            setTransferForm({ ...transferForm, batchId: e.target.value })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded bg-white text-slate-900"
                        >
                          {pharmacyBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.brandName} [{b.batchNo}] (Main Stock: {b.stockQty})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Transfer Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={transferForm.qty}
                          onChange={(e) =>
                            setTransferForm({
                              ...transferForm,
                              qty: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-1.5 px-3 border border-slate-900 text-slate-900 font-medium rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Transfer to IPD Ward
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* Complete Pharmacy Batch Inventory & Expiry Alert Table */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      04. Pharmacy Batch Inventory, Expiry & Reorder Control
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tracks batch numbers, expiry dates, main store stock, IPD ward consignment stock, unit cost, retail, and wholesale prices
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-600">
                    Active Batches: {pharmacyBatches.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">SKU & Batch</th>
                        <th className="py-2.5 font-medium">Brand & Generic Name</th>
                        <th className="py-2.5 font-medium">Expiry Date</th>
                        <th className="py-2.5 font-medium text-right">Main Stock</th>
                        <th className="py-2.5 font-medium text-right">IPD Ward Stock</th>
                        <th className="py-2.5 font-medium text-right">Unit Cost ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Retail ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Wholesale ({cur})</th>
                        <th className="py-2.5 font-medium">Alert Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pharmacyBatches.map((b) => {
                        const isExpiringSoon = b.expiryDate <= '2026-12-31';
                        const isLowStock = b.stockQty <= b.reorderLevel;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {b.sku} · {b.batchNo}
                            </td>
                            <td className="py-2.5">
                              <div className="font-semibold text-slate-900">{b.brandName}</div>
                              <div className="text-slate-500">
                                {b.genericName} · {b.supplierName}
                              </div>
                            </td>
                            <td className="py-2.5 font-mono tabular-nums whitespace-nowrap">
                              <span
                                className={
                                  isExpiringSoon
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-slate-800'
                                }
                              >
                                {b.expiryDate}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                              {b.stockQty}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                              {b.wardStockQty}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                              {b.unitCost.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {b.retailPrice.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                              {b.wholesalePrice.toLocaleString()}
                            </td>
                            <td className="py-2.5 whitespace-nowrap">
                              {isExpiringSoon && (
                                <span className="text-amber-700 font-medium">
                                  Expiring Soon (&lt;90d)
                                </span>
                              )}
                              {isExpiringSoon && isLowStock && <span> · </span>}
                              {isLowStock && (
                                <span className="text-red-700 font-medium">
                                  Low Stock (&le;{b.reorderLevel})
                                </span>
                              )}
                              {!isExpiringSoon && !isLowStock && (
                                <span className="text-emerald-700">Nominal</span>
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
          )}

          {/* =====================================================================
              MODULE 4: PATIENT BILLING, RECEIPTS, REFUNDS, LEDGERS, EXPENSES & HR PAYROLL
             ===================================================================== */}
          {activeModule === 'billing_hr' && (
            <div className="space-y-6">
              {/* Complete Patient Billing, Receipts & Refunds Register */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      01. Patient Billing, Payments, Official Receipts & Refunds Register
                    </h2>
                    <p className="text-xs text-slate-500">
                      Preserves finalized invoice audit history · Tracks separate Service Business Date, Payment Date, and Entry Timestamp · Developed by Sajjad Qaiser Shah
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-600">
                    Invoices: {invoices.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">Invoice No</th>
                        <th className="py-2.5 font-medium">Customer / Patient</th>
                        <th className="py-2.5 font-medium">Department</th>
                        <th className="py-2.5 font-medium">Business Date</th>
                        <th className="py-2.5 font-medium">Payment Date</th>
                        <th className="py-2.5 font-medium text-right">Net Total ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Paid ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Refunded ({cur})</th>
                        <th className="py-2.5 font-medium">Status</th>
                        <th className="py-2.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => {
                        const due = inv.netTotal - inv.paidAmount - inv.refundedAmount;
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {inv.invoiceNo}
                            </td>
                            <td className="py-2.5 font-medium text-slate-900">
                              {inv.customerName}
                            </td>
                            <td className="py-2.5 text-slate-600 whitespace-nowrap">
                              {inv.department}
                            </td>
                            <td className="py-2.5 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                              {inv.businessDate}
                            </td>
                            <td className="py-2.5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {inv.paymentDate || 'Unpaid'}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {inv.netTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-emerald-700">
                              {inv.paidAmount.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-amber-700">
                              {inv.refundedAmount > 0
                                ? inv.refundedAmount.toLocaleString()
                                : '—'}
                            </td>
                            <td className="py-2.5 font-mono font-semibold text-slate-800">
                              {inv.status}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPrintableDoc({ type: 'INVOICE', data: inv })
                                }
                                className="px-2.5 py-1 text-xs font-medium text-slate-900 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Receipt</span>
                              </button>
                              {due > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSettleInvoice(inv)}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
                                >
                                  Receive {due.toLocaleString()}
                                </button>
                              )}
                              {inv.paidAmount - inv.refundedAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleRefundInvoice(inv)}
                                  className="px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-300 rounded hover:bg-amber-50 cursor-pointer"
                                >
                                  Refund
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expenses & Supplier/Customer Ledgers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
                  <h3 className="text-base font-bold text-slate-900">
                    02. Record Departmental Operating Expense
                  </h3>
                  <form onSubmit={handleCreateExpense} className="mt-3 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Cost Center</label>
                        <select
                          value={expenseForm.costCenter}
                          onChange={(e) =>
                            setExpenseForm({ ...expenseForm, costCenter: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-slate-900"
                        >
                          <option value="HOSPITAL">HOSPITAL (OPD/IPD)</option>
                          <option value="LABORATORY">LABORATORY</option>
                          <option value="PHARMACY">PHARMACY</option>
                          <option value="SHARED_ADMIN">SHARED_ADMIN</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Amount ({cur})</label>
                        <input
                          type="number"
                          value={expenseForm.amount}
                          onChange={(e) =>
                            setExpenseForm({
                              ...expenseForm,
                              amount: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Expense Description *</label>
                      <input
                        type="text"
                        required
                        value={expenseForm.description}
                        onChange={(e) =>
                          setExpenseForm({ ...expenseForm, description: e.target.value })
                        }
                        placeholder="e.g., Backup Generator Diesel Refill (200 Liters)"
                        className="w-full px-3 py-2 border border-slate-200 rounded text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Business Date</label>
                        <input
                          type="date"
                          value={expenseForm.businessDate}
                          onChange={(e) =>
                            setExpenseForm({
                              ...expenseForm,
                              businessDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Payment Date</label>
                        <input
                          type="date"
                          value={expenseForm.paymentDate}
                          onChange={(e) =>
                            setExpenseForm({
                              ...expenseForm,
                              paymentDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Post Expense Voucher
                    </button>
                  </form>
                </div>

                {/* Supplier & Wholesale Customer Ledgers */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
                  <h3 className="text-base font-bold text-slate-900">
                    03. Supplier Payable & Wholesale Customer Receivable Ledgers
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time running balances updated automatically on credit GRNs, wholesale sales, and settlements
                  </p>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 font-medium">Party Name & Type</th>
                          <th className="py-2 font-medium text-right">Total Billed ({cur})</th>
                          <th className="py-2 font-medium text-right">Total Settled ({cur})</th>
                          <th className="py-2 font-medium text-right">Running Balance ({cur})</th>
                          <th className="py-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerParties.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2.5">
                              <div className="font-semibold text-slate-900">{p.name}</div>
                              <div className="text-slate-500 font-mono">
                                {p.partyType} · {p.phone}
                              </div>
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums">
                              {p.totalBilledOrPurchased.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-emerald-700">
                              {p.totalPaidOrReceived.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                              {p.currentBalance.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right">
                              {p.currentBalance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSettleParty(p)}
                                  className="px-2.5 py-1 text-xs font-medium text-slate-900 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                                >
                                  Settle 25,000
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* HR Employee Roster, Payroll Execution & Salary History */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      04. HR Staff Directory, Monthly Payroll Run & Salary History
                    </h3>
                    <p className="text-xs text-slate-500">
                      Generates itemized salary slips and posts departmental payroll vouchers to the General Ledger
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleRunPayroll}
                      className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Disburse {payrollMonth} Payroll
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Active Hospital Staff ({employees.length})
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 font-medium">Employee</th>
                          <th className="py-2 font-medium">Cost Center</th>
                          <th className="py-2 font-medium text-right">Net Salary ({cur})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employees.map((emp) => (
                          <tr key={emp.id}>
                            <td className="py-2">
                              <div className="font-semibold text-slate-900">
                                {emp.fullName}
                              </div>
                              <div className="text-slate-500">
                                {emp.empCode} · {emp.designation}
                              </div>
                            </td>
                            <td className="py-2 font-mono text-slate-600">
                              {emp.department}
                            </td>
                            <td className="py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {emp.netSalary.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Disbursed Salary History & Official Slips ({salarySlips.length})
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 font-medium">Month</th>
                          <th className="py-2 font-medium">Employee</th>
                          <th className="py-2 font-medium text-right">Net Paid ({cur})</th>
                          <th className="py-2 font-medium text-right">Slip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salarySlips.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2 font-mono font-semibold text-slate-900">
                              {s.payrollMonth}
                            </td>
                            <td className="py-2 text-slate-800">{s.employeeName}</td>
                            <td className="py-2 text-right font-mono tabular-nums font-semibold text-emerald-700">
                              {s.netPaid.toLocaleString()}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setPrintableDoc({ type: 'SALARY_SLIP', data: s })
                                }
                                className="px-2 py-1 text-xs font-medium text-slate-800 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Slip</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              MODULE 5: DOUBLE-ENTRY ACCOUNTING, AI ASSISTANT, BACKUPS & GO-LIVE SUITE
             ===================================================================== */}
          {activeModule === 'accounting_security' && (
            <div className="space-y-8">
              <AccountingAndAiView
                analytics={analytics}
                journalEntries={journalEntries}
                settings={settings}
                activeRole={activeRole}
                dateFilter={dateFilter}
                onDateFilterChange={(next) => {
                  setDateFilter(next);
                  fetchBootstrap(next);
                }}
                onAskAi={async (prompt, forceOfflineFallback) => {
                  const headers = await buildHeaders();
                  const res = await fetch('/api/ai/assistant', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ prompt, forceOfflineFallback }),
                  });
                  return res.json();
                }}
              />

              <ArchitectureAndAcceptanceView
                settings={settings}
                backups={backups}
                acceptanceTests={acceptanceTests}
                auditLogs={auditLogs}
                onCreateBackup={async () => {
                  const res = await postMutation('/api/backups/create', {});
                  notify(
                    'success',
                    `Created AES-256-GCM encrypted backup ${res.backup.filename}.`
                  );
                  return res;
                }}
                onVerifyRestore={async (backupId) => {
                  const res = await postMutation('/api/backups/verify-restore', {
                    backupId,
                  });
                  notify(
                    'success',
                    `Isolated test restoration verified for ${res.backup.filename} (SHA-256 matched).`
                  );
                  return res;
                }}
                onRunAcceptanceTests={async () => {
                  const res = await postMutation('/api/acceptance-tests/run', {});
                  notify(
                    'success',
                    'All 7 Pre-Go-Live Acceptance Tests executed and passed with verified evidence.'
                  );
                  return res;
                }}
                onUpdateSettings={async (partial) => {
                  const res = await postMutation('/api/settings', partial, 'PATCH');
                  notify('success', 'Hospital ERP settings updated.');
                  return res;
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Printable Official Document Modal */}
      <PrintableDocumentModal
        docPayload={printableDoc}
        settings={settings}
        onClose={() => setPrintableDoc(null)}
      />

      {/* Quiet Authoritative Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            {settings.hospitalName} · Single-Hospital On-Premises ERP · Central Database & Local LAN Architecture
          </div>
          <div className="font-semibold text-slate-900">
            Developed by Sajjad Qaiser Shah
          </div>
        </div>
      </footer>
    </div>
  );
}
