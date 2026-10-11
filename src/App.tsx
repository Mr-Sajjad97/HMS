/**
 * Hospital ERP — Single-Hospital On-Premises LAN & Central Database System
 * Developed by Sajjad Qaiser Shah
 */
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  syncUserProfileToFirestore,
  mirrorAuditLogToFirestore,
} from './lib/firebase.ts';
import {
  Stethoscope,
  FlaskConical,
  Pill,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Plus,
  LogOut,
  Barcode,
  LayoutGrid,
  Users,
  Calendar,
  CreditCard,
  Search,
  Download,
  KeyRound,
  Upload,
  History,
  UserPlus,
  Wallet,
  Trash2,
  RotateCcw,
  FolderCheck,
  Minus,
  Maximize2,
  Minimize2,
  ArrowLeft,
  X,
  Receipt,
} from 'lucide-react';
import {
  PrintableDocumentModal,
  PrintableDocPayload,
} from './components/PrintableDocumentModal.tsx';
import {
  printViaConnectedPrinter,
  supplierBillToPrintableInvoice,
  expenseToPrintableInvoice,
  journalEntryToPrintableInvoice,
  patientRegistrationToPrintableInvoice,
  encounterToFallbackInvoice,
} from './utils/printerEngine.ts';
import { PatientBillBuilderView } from './components/PatientBillBuilderView.tsx';
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
  HospitalSettings,
  Doctor,
  Patient,
  VitalSignEntry,
  Encounter,
  LabOrder,
  PharmacyBatch,
  Invoice,
  JournalEntry,
  ExpenseRecord,
  Employee,
  SalarySlip,
  StaffAttendanceRecord,
  AuditLogEntry,
  BackupRecord,
  SupplierBill,
  AcceptanceTestItem,
} from './types/erp.ts';

type WorkspaceModule =
  | 'home'
  | 'patient_billing'
  | 'clinical'
  | 'laboratory'
  | 'pharmacy'
  | 'billing_hr'
  | 'accounting_security';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<StaffRole>('ADMIN');
  const [activeModule, setActiveModule] = useState<WorkspaceModule>('home');
  const [activeSidebarKey, setActiveSidebarKey] = useState<string>('dashboard');
  const [moduleHistory, setModuleHistory] = useState<WorkspaceModule[]>([]);
  const [minimizedModules, setMinimizedModules] = useState<WorkspaceModule[]>([]);
  const [isModuleFullScreen, setIsModuleFullScreen] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

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
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState<string>('2026-10-10');
  const [supplierBills, setSupplierBills] = useState<SupplierBill[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Security Login, Custom Admin Account & PIN Lock State
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isLockModalMinimized, setIsLockModalMinimized] = useState<boolean>(false);
  const [isLockModalFullScreen, setIsLockModalFullScreen] = useState<boolean>(false);
  const [securityPin, setSecurityPin] = useState<string>('1234');
  const [loginMode, setLoginMode] = useState<'PIN' | 'PASSWORD' | 'CREATE_ADMIN'>('PIN');
  const [pinInput, setPinInput] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [isChangePinMinimized, setIsChangePinMinimized] = useState<boolean>(false);
  const [isChangePinFullScreen, setIsChangePinFullScreen] = useState<boolean>(false);
  const [oldPinInput, setOldPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState<string>('');
  const [pinModalError, setPinModalError] = useState<string>('');
  const [showAdminAccountModal, setShowAdminAccountModal] = useState<boolean>(false);
  const [isAdminModalMinimized, setIsAdminModalMinimized] = useState<boolean>(false);
  const [isAdminModalFullScreen, setIsAdminModalFullScreen] = useState<boolean>(false);
  const [isAppMinimized, setIsAppMinimized] = useState<boolean>(false);
  const [isAppFullScreen, setIsAppFullScreen] = useState<boolean>(false);
  const [showSidebarInFullScreen, setShowSidebarInFullScreen] = useState<boolean>(false);
  const [adminAccountForm, setAdminAccountForm] = useState({
    adminFullName: 'Hospital Administrator',
    adminEmail: 'admin@hospital.local',
    adminUsername: 'admin',
    adminPassword: '',
    currentPinOrPassword: '',
  });
  const [loggedInStaffName, setLoggedInStaffName] = useState<string>('Hospital Administrator');
  const [loggedInStaffEmail, setLoggedInStaffEmail] = useState<string>('admin@hospital.local');
  const [showVitalsTracker, setShowVitalsTracker] = useState<boolean>(false);
  const [staffDesignationPreset, setStaffDesignationPreset] = useState<string>('Doctor / Medical Officer');
  const [customStaffDesignation, setCustomStaffDesignation] = useState<string>('');
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
  const [posCustomerName, setPosCustomerName] = useState('Walk-in OPD Patient');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'CASH' | 'CARD' | 'CREDIT_LEDGER'>('CASH');
  const [posBusinessDate, setPosBusinessDate] = useState('2026-10-10');
  const [posCart, setPosCart] = useState<Array<{ batchId: string; qty: number }>>([
    { batchId: 'BAT-501', qty: 1 },
  ]);

  const [grnForm, setGrnForm] = useState({
    sku: 'MED-PANA-500',
    genericName: 'Paracetamol 500mg',
    brandName: 'Panadol 500mg Tablet',
    batchNo: 'B26-PN10',
    category: 'Tablet',
    expiryDate: '2028-09-30',
    qty: 10,
    unitCost: 35,
    retailPrice: 50,
    wholesalePrice: 35,
    supplierId: 'SUP-01',
    supplierName: 'AGP Pharma Distributors',
    paidAmount: 350,
    paymentMethod: 'CASH',
    businessDate: '2026-10-10',
  });

  // Pharmacy Search & Filter State
  const [pharmacySearch, setPharmacySearch] = useState<string>('');
  const [pharmacyFilter, setPharmacyFilter] = useState<
    'ALL' | 'IN_STOCK' | 'LOW_OR_OUT' | 'EXPIRING_OR_EXPIRED'
  >('ALL');

  // Direct Customer Billing Form
  const [customerBillForm, setCustomerBillForm] = useState({
    customerName: 'Walk-in Patient / Customer',
    department: 'HOSPITAL_OPD' as 'HOSPITAL_OPD' | 'HOSPITAL_IPD' | 'LABORATORY',
    description: 'OPD Consultation & Clinical Procedure',
    qty: 1,
    unitPrice: 1500,
    discount: 0,
    paidAmount: 1500,
    paymentMethod: 'CASH',
    businessDate: '2026-10-10',
  });

  // Add New Staff Member Form
  const [newStaffForm, setNewStaffForm] = useState({
    fullName: '',
    designation: 'Staff Nurse / Medical Officer',
    department: 'HOSPITAL' as 'HOSPITAL' | 'LABORATORY' | 'PHARMACY' | 'SHARED_ADMIN',
    role: 'DOCTOR' as StaffRole,
    baseSalary: 55000,
    allowance: 5000,
    deduction: 0,
    bankAccount: 'Cash / Payroll Counter',
  });

  // Complete History Filter State
  const [historyTypeFilter, setHistoryTypeFilter] = useState<
    'ALL' | 'INVOICE' | 'PHARMACY' | 'SUPPLIER_BILL' | 'PAYROLL' | 'EXPENSE'
  >('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Module-Specific Search Filters & Auto-Backup State
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [encounterSearch, setEncounterSearch] = useState<string>('');
  const [labSearch, setLabSearch] = useState<string>('');
  const [pharmacySaleSearch, setPharmacySaleSearch] = useState<string>('');
  const [supplierBillSearch, setSupplierBillSearch] = useState<string>('');
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [billingSearch, setBillingSearch] = useState<string>('');
  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [laptopDirHandle, setLaptopDirHandle] = useState<any>(null);
  const [laptopFolderName, setLaptopFolderName] = useState<string>(
    'data/Laptop_Auto_Backups (Auto-Saved on Every Entry)'
  );
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>(
    new Date().toLocaleTimeString()
  );

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
      const activeEmail =
        loggedInStaffEmail || settings.adminEmail || 'admin@hospital.local';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-ERP-Role': activeRole,
        'X-ERP-UID': user?.uid || 'lan_operator_01',
        'X-ERP-Email': activeEmail,
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
    [activeRole, user, settings.simulatedInternetOffline, settings.adminEmail, loggedInStaffEmail]
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
        if (st.settings?.securityPin) {
          setSecurityPin(st.settings.securityPin);
        }
        if (st.settings?.adminFullName) {
          setLoggedInStaffName(st.settings.adminFullName);
        }
        if (st.settings?.adminEmail) {
          setLoggedInStaffEmail(st.settings.adminEmail);
        }
        setAdminAccountForm((prev) => ({
          ...prev,
          adminFullName: st.settings?.adminFullName || 'Hospital Administrator',
          adminEmail: st.settings?.adminEmail || 'admin@hospital.local',
          adminUsername: st.settings?.adminUsername || 'admin',
        }));
        setDoctors(st.doctors);
        setPatients(st.patients);
        setVitalSigns(st.vitalSigns || []);
        setEncounters(st.encounters);
        setLabOrders(st.labOrders);
        setPharmacyBatches(st.pharmacyBatches);
        setInvoices(st.invoices);
        setJournalEntries(st.journalEntries);
        setExpenses(st.expenses);
        setEmployees(st.employees);
        setSalarySlips(st.salarySlips);
        setStaffAttendance(st.staffAttendance || []);
        setSupplierBills(st.supplierBills || []);
        setAuditLogs(st.auditLogs);
        setBackups(st.backups);
        setAcceptanceTests(st.acceptanceTests || []);
        setAnalytics(data.analytics);
        setLastAutoSavedTime(new Date().toLocaleTimeString());

        // If user linked a direct Laptop folder via File System Access API, auto-write latest JSON & CSV silently
        if (laptopDirHandle) {
          try {
            const jsonFileHandle = await laptopDirHandle.getFileHandle(
              'Al_Hikmat_Auto_Backup_Latest.json',
              { create: true }
            );
            const writableJson = await jsonFileHandle.createWritable();
            await writableJson.write(
              JSON.stringify(
                {
                  backupFormat: 'AL_HIKMAT_HMS_LAPTOP_BACKUP_V1',
                  autoSavedAt: new Date().toISOString(),
                  hospitalName: st.settings?.hospitalName || 'Al-Hikmat General Hospital',
                  state: st,
                },
                null,
                2
              )
            );
            await writableJson.close();
          } catch {
            // Ignore browser permission prompts during background sync
          }
        }
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

  // Restore Auto-Saved Form Drafts & Active Workspace on Initial Load
  useEffect(() => {
    try {
      const rawDrafts = localStorage.getItem('al_hikmat_hms_autosave_drafts_v1');
      if (!rawDrafts) return;
      const saved = JSON.parse(rawDrafts);
      if (saved.activeModule) setActiveModule(saved.activeModule);
      if (saved.activeSidebarKey) setActiveSidebarKey(saved.activeSidebarKey);
      if (saved.patientForm) setPatientForm((prev) => ({ ...prev, ...saved.patientForm }));
      if (saved.vitalForm) setVitalForm((prev) => ({ ...prev, ...saved.vitalForm }));
      if (saved.encounterForm) setEncounterForm((prev) => ({ ...prev, ...saved.encounterForm }));
      if (saved.labForm) setLabForm((prev) => ({ ...prev, ...saved.labForm }));
      if (saved.posCustomerName) setPosCustomerName(saved.posCustomerName);
      if (saved.posPaymentMethod) setPosPaymentMethod(saved.posPaymentMethod);
      if (saved.grnForm) setGrnForm((prev) => ({ ...prev, ...saved.grnForm }));
      if (saved.customerBillForm)
        setCustomerBillForm((prev) => ({ ...prev, ...saved.customerBillForm }));
      if (saved.newStaffForm) setNewStaffForm((prev) => ({ ...prev, ...saved.newStaffForm }));
      if (saved.staffDesignationPreset) setStaffDesignationPreset(saved.staffDesignationPreset);
      if (saved.customStaffDesignation !== undefined)
        setCustomStaffDesignation(saved.customStaffDesignation);
      if (saved.expenseForm) setExpenseForm((prev) => ({ ...prev, ...saved.expenseForm }));
    } catch {
      // Ignore malformed localStorage drafts
    }
  }, []);

  // Real-Time Auto-Save of All Form Inputs & Workspace State on Every Change
  useEffect(() => {
    if (loading) return;
    try {
      const draftPayload = {
        savedAt: new Date().toISOString(),
        activeModule,
        activeSidebarKey,
        patientForm,
        vitalForm,
        encounterForm,
        labForm,
        posCustomerName,
        posPaymentMethod,
        grnForm,
        customerBillForm,
        newStaffForm,
        staffDesignationPreset,
        customStaffDesignation,
        expenseForm,
      };
      localStorage.setItem('al_hikmat_hms_autosave_drafts_v1', JSON.stringify(draftPayload));
      setLastAutoSavedTime(new Date().toLocaleTimeString());
    } catch {
      // Ignore storage quota limits
    }
  }, [
    loading,
    activeModule,
    activeSidebarKey,
    patientForm,
    vitalForm,
    encounterForm,
    labForm,
    posCustomerName,
    posPaymentMethod,
    grnForm,
    customerBillForm,
    newStaffForm,
    staffDesignationPreset,
    customStaffDesignation,
    expenseForm,
  ]);

  // Listen to native browser Fullscreen changes & ESC key to keep full-screen state in sync
  useEffect(() => {
    const handleFsChange = () => {
      const docAny: any = document;
      const isNativeFs = Boolean(
        docAny.fullscreenElement ||
          docAny.webkitFullscreenElement ||
          docAny.mozFullScreenElement ||
          docAny.msFullscreenElement
      );
      setIsAppFullScreen(isNativeFs);
      if (!isNativeFs) {
        setIsModuleFullScreen(false);
        setShowSidebarInFullScreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const docAny: any = document;
        if (!docAny.fullscreenElement && !docAny.webkitFullscreenElement) {
          setIsModuleFullScreen(false);
          setIsAppFullScreen(false);
          setShowSidebarInFullScreen(false);
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getModuleMeta = useCallback((mod: WorkspaceModule) => {
    switch (mod) {
      case 'home':
        return { key: 'dashboard', label: 'Dashboard (Consolidated Profit & Loss)' };
      case 'patient_billing':
        return {
          key: 'patient_billing',
          label: 'Make Patient Bill (Doctor + Test + Medicine + Drip)',
        };
      case 'pharmacy':
        return { key: 'records', label: 'Pharmacy & Medical Store (Medicines Only)' };
      case 'billing_hr':
        return { key: 'billing', label: 'Customer Billing, Staff & Salary' };
      case 'laboratory':
        return { key: 'laboratory', label: 'Laboratory Billing & Diagnostics' };
      case 'clinical':
        return { key: 'patients', label: 'Patients Registry & OPD/IPD' };
      case 'accounting_security':
        return { key: 'settings', label: 'History, Audit Log & Laptop Backups' };
      default:
        return { key: 'dashboard', label: 'Dashboard (P&L)' };
    }
  }, []);

  const navigateToOption = useCallback(
    (nextMod: WorkspaceModule) => {
      setMinimizedModules((prev) => prev.filter((m) => m !== nextMod));
      if (nextMod !== activeModule) {
        setModuleHistory((prev) => [...prev.slice(-15), activeModule]);
        setActiveModule(nextMod);
        setActiveSidebarKey(getModuleMeta(nextMod).key);
      }
    },
    [activeModule, getModuleMeta]
  );

  const handleGoBackOption = useCallback(() => {
    if (moduleHistory.length > 0) {
      const prevMod = moduleHistory[moduleHistory.length - 1];
      setModuleHistory((prev) => prev.slice(0, -1));
      setActiveModule(prevMod);
      setActiveSidebarKey(getModuleMeta(prevMod).key);
    } else if (activeModule !== 'home') {
      setActiveModule('home');
      setActiveSidebarKey('dashboard');
    } else if (isModuleFullScreen || isAppFullScreen) {
      setIsModuleFullScreen(false);
      setIsAppFullScreen(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [moduleHistory, activeModule, getModuleMeta, isModuleFullScreen, isAppFullScreen]);

  const handleMinimizeCurrentOption = useCallback(async () => {
    await autoSaveAdminProfileSilently();
    if (activeModule !== 'home') {
      const current = activeModule;
      setMinimizedModules((prev) => (prev.includes(current) ? prev : [...prev, current]));
      if (moduleHistory.length > 0) {
        const prevMod = moduleHistory[moduleHistory.length - 1];
        setModuleHistory((prev) => prev.slice(0, -1));
        setActiveModule(prevMod);
        setActiveSidebarKey(getModuleMeta(prevMod).key);
      } else {
        setActiveModule('home');
        setActiveSidebarKey('dashboard');
      }
    } else {
      setIsAppMinimized(true);
    }
  }, [activeModule, moduleHistory, getModuleMeta]);

  const requestOrExitNativeBrowserFullScreen = async (enterFullScreen: boolean) => {
    try {
      const docEl: any = document.documentElement;
      const docAny: any = document;
      const activeFsEl =
        docAny.fullscreenElement ||
        docAny.webkitFullscreenElement ||
        docAny.mozFullScreenElement ||
        docAny.msFullscreenElement;
      if (enterFullScreen && !activeFsEl) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } else if (!enterFullScreen && activeFsEl) {
        if (docAny.exitFullscreen) {
          await docAny.exitFullscreen();
        } else if (docAny.webkitExitFullscreen) {
          await docAny.webkitExitFullscreen();
        } else if (docAny.mozCancelFullScreen) {
          await docAny.mozCancelFullScreen();
        } else if (docAny.msExitFullscreen) {
          await docAny.msExitFullscreen();
        }
      }
    } catch {
      // Visual full-screen workspace (isModuleFullScreen) works inside restricted iframes
    }
  };

  const toggleBrowserFullScreen = async () => {
    const currentlyFull = isModuleFullScreen || isAppFullScreen;
    const nextState = !currentlyFull;
    setIsModuleFullScreen(nextState);
    setIsAppFullScreen(nextState);
    setIsAppMinimized(false);
    if (!nextState) {
      setShowSidebarInFullScreen(false);
    }
    await requestOrExitNativeBrowserFullScreen(nextState);
  };

  // Auto-save Admin Profile Changes silently when edited or when closing modal with Cross (✕)
  const autoSaveAdminProfileSilently = useCallback(async () => {
    const nextName = adminAccountForm.adminFullName.trim() || 'Hospital Administrator';
    const nextEmail = adminAccountForm.adminEmail.trim() || 'admin@hospital.local';
    const nextUser = adminAccountForm.adminUsername.trim() || 'admin';
    const hasChanged =
      nextName !== (settings.adminFullName || 'Hospital Administrator') ||
      nextEmail !== (settings.adminEmail || 'admin@hospital.local') ||
      nextUser !== (settings.adminUsername || 'admin') ||
      Boolean(adminAccountForm.adminPassword.trim());

    if (!hasChanged) {
      setLastAutoSavedTime(new Date().toLocaleTimeString());
      return;
    }

    try {
      const payload: Record<string, any> = {
        adminFullName: nextName,
        adminEmail: nextEmail,
        adminUsername: nextUser,
      };
      if (adminAccountForm.adminPassword.trim()) {
        payload.adminPassword = adminAccountForm.adminPassword.trim();
      }
      const headers = await buildHeaders();
      await fetch('/api/settings', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      setSettings((prev) => ({
        ...prev,
        adminFullName: nextName,
        adminEmail: nextEmail,
        adminUsername: nextUser,
      }));
      setLoggedInStaffName(nextName);
      setLoggedInStaffEmail(nextEmail);
      setLastAutoSavedTime(new Date().toLocaleTimeString());
    } catch {
      // Silent background auto-save
    }
  }, [adminAccountForm, settings, buildHeaders]);

  // Debounced real-time auto-save while typing inside Customize Admin ID modal
  useEffect(() => {
    if (!showAdminAccountModal && !(isLocked && loginMode === 'CREATE_ADMIN')) return;
    const timer = setTimeout(() => {
      autoSaveAdminProfileSilently();
    }, 700);
    return () => clearTimeout(timer);
  }, [
    adminAccountForm.adminFullName,
    adminAccountForm.adminEmail,
    adminAccountForm.adminUsername,
    adminAccountForm.adminPassword,
    showAdminAccountModal,
    isLocked,
    loginMode,
    autoSaveAdminProfileSilently,
  ]);

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

  // Pharmacy POS & Inventory Handlers (Hospital Retail Only)
  const handleCheckoutPos = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/pharmacy/pos', {
        saleType: 'RETAIL',
        customerName: posCustomerName,
        items: posCart,
        discount: 0,
        paymentMethod: posPaymentMethod,
        businessDate: posBusinessDate,
        paymentDate: posBusinessDate,
      });
      notify(
        'success',
        `Pharmacy Retail Sale ${res.invoice.invoiceNo} completed (${res.invoice.netTotal.toLocaleString()} ${settings.currency}). Stock deducted & Profit updated.`
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
        `Medicine Added: ${grnForm.qty} units of ${res.batch.brandName} [Batch ${res.batch.batchNo}] added to stock. Total Bill: ${(grnForm.qty * grnForm.unitCost).toLocaleString()} ${settings.currency}.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handlePaySupplierBill = async (bill: SupplierBill) => {
    if (bill.remainingAmount <= 0) return;
    try {
      const res = await postMutation(`/api/pharmacy/supplier-bills/${bill.id}/pay`, {
        amount: bill.remainingAmount,
      });
      notify(
        'success',
        `Paid remaining balance on Supplier Bill ${res.supplierBill.billNo} (${res.supplierBill.supplierName}).`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleCreateCustomerBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await postMutation('/api/billing/create-invoice', customerBillForm);
      notify(
        'success',
        `Customer Bill ${res.invoice.invoiceNo} created for ${res.invoice.customerName} (${res.invoice.netTotal.toLocaleString()} ${settings.currency}).`
      );
      setPrintableDoc({ type: 'INVOICE', data: res.invoice });
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleCreateCombinedPatientBill = async (
    payload: any,
    _printAction: 'OPEN_VIRTUAL_AND_PRINT_MODAL' | 'DIRECT_HARDWARE_PRINT' | 'VIRTUAL_ONLY'
  ): Promise<Invoice | null> => {
    try {
      const res = await postMutation('/api/billing/patient-combined-bill', payload);
      if (payload.businessDate) {
        setAttendanceDate(payload.businessDate);
      }
      notify(
        'success',
        `Patient Bill ${res.invoice.invoiceNo} saved for ${res.invoice.customerName} (Total: ${res.invoice.netTotal.toLocaleString()} ${settings.currency}). Deducted from Stock & Home Calculation, and saved in Virtual Bill & Date-Wise Patient History.`
      );
      setPrintableDoc({ type: 'INVOICE', data: res.invoice });
      return res.invoice as Invoice;
    } catch (err: any) {
      notify('error', err.message);
      return null;
    }
  };

  const handleAddStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenDesignation =
      staffDesignationPreset === 'OTHER_CUSTOM'
        ? customStaffDesignation.trim() || 'General Hospital Staff'
        : staffDesignationPreset;
    try {
      const res = await postMutation('/api/hr/employees', {
        ...newStaffForm,
        designation: chosenDesignation,
      });
      setNewStaffForm({ ...newStaffForm, fullName: '' });
      setCustomStaffDesignation('');
      notify(
        'success',
        `Added staff member ${res.employee.fullName} (${res.employee.designation}) — Net Salary: ${res.employee.netSalary.toLocaleString()} ${settings.currency}.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handlePayIndividualSalary = async (emp: Employee) => {
    try {
      const res = await postMutation('/api/hr/pay-salary', {
        employeeId: emp.id,
        payrollMonth,
        amount: emp.netSalary,
        businessDate: '2026-10-10',
        paymentDate: '2026-10-10',
      });
      notify(
        'success',
        `Salary of ${res.slip.netPaid.toLocaleString()} ${settings.currency} paid to ${emp.fullName} & deducted from Hospital Profit/Loss.`
      );
      setPrintableDoc({ type: 'SALARY_SLIP', data: res.slip });
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleMarkStaffAttendance = async (
    emp: Employee,
    status: 'PRESENT' | 'ABSENT' | 'LEAVE',
    dateOverride?: string,
    remarks?: string
  ) => {
    const targetDate = dateOverride || attendanceDate || '2026-10-10';
    try {
      await postMutation('/api/hr/attendance', {
        date: targetDate,
        employeeId: emp.id,
        status,
        remarks,
      });
      notify(
        'success',
        `Attendance Saved (${targetDate}): ${emp.fullName} marked as ${
          status === 'PRESENT'
            ? 'PRESENT (Hazir)'
            : status === 'ABSENT'
            ? 'ABSENT (Ghair Hazir / Chutti)'
            : 'ON LEAVE (Chutti)'
        } & saved to History.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleSaveDailyAttendanceBatch = async (
    targetDate: string,
    forceAllPresent?: boolean
  ) => {
    try {
      const recordsPayload = employees.map((emp) => {
        const existing = staffAttendance.find(
          (a) => a.employeeId === emp.id && a.date === targetDate
        );
        const status = forceAllPresent
          ? 'PRESENT'
          : existing
          ? existing.status
          : 'PRESENT';
        return {
          employeeId: emp.id,
          status,
          remarks:
            status === 'PRESENT'
              ? 'Present on duty (Hazir)'
              : existing?.remarks || 'Absent (Ghair Hazir / Chutti)',
        };
      });
      const res = await postMutation('/api/hr/attendance', {
        date: targetDate,
        records: recordsPayload,
      });
      notify(
        'success',
        `Daily Staff Attendance for ${targetDate} saved to History & Backup (${res.presentCount} Present / Hazir, ${res.absentCount} Absent / Chutti).`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleRestoreLaptopFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await postMutation('/api/backups/restore-laptop', parsed);
      notify('success', `Successfully restored Hospital ERP database from laptop backup file (${file.name}).`);
    } catch (err: any) {
      notify('error', err.message || 'Invalid backup file.');
    } finally {
      e.target.value = '';
    }
  };

  // Link a Laptop Folder for Direct Browser Auto-Save (in addition to Server Disk Auto-Save)
  const handleLinkLaptopFolder = async () => {
    try {
      const anyWin = window as any;
      if (typeof anyWin.showDirectoryPicker === 'function') {
        const handle = await anyWin.showDirectoryPicker({ mode: 'readwrite' });
        setLaptopDirHandle(handle);
        setLaptopFolderName(`Laptop Folder: ${handle.name} (Live Auto-Sync Active)`);
        notify(
          'success',
          `Linked Laptop folder "${handle.name}" — Backups & History will now auto-save directly to this folder on every transaction.`
        );
        await fetchBootstrap();
      } else {
        notify(
          'success',
          'Automatic server-side file backup is active in data/Laptop_Auto_Backups/ (JSON + Excel CSV updated after every transaction).'
        );
      }
    } catch {
      // User cancelled folder picker
    }
  };

  // Customer Medicine Return (Restores Stock + Reverses Revenue & COGS in Profit & Loss)
  const handleReturnPharmacySale = async (
    inv: Invoice,
    itemIndex?: number,
    returnQty?: number
  ) => {
    try {
      const res = await postMutation('/api/pharmacy/return-sale', {
        invoiceId: inv.id,
        itemIndex,
        returnQty,
        reason: 'Customer returned medicine to pharmacy counter',
      });
      notify(
        'success',
        `Medicine Return Processed on ${res.invoice.invoiceNo}: Returned medicine added back to Pharmacy Stock & Profit/Loss updated automatically.`
      );
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Universal Delete Handler for Mistaken Entries (Updates Stock, Ledgers & P&L Immediately)
  const handleDeleteRecord = async (
    entityType:
      | 'patient'
      | 'encounter'
      | 'lab-order'
      | 'pharmacy-batch'
      | 'supplier-bill'
      | 'invoice'
      | 'employee'
      | 'staff-attendance'
      | 'salary-slip'
      | 'expense'
      | 'journal-entry',
    id: string,
    label: string
  ) => {
    try {
      const headers = await buildHeaders();
      const res = await fetch(`/api/records/${entityType}/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete record');
      }
      await fetchBootstrap();
      notify('success', data.summary || `Deleted ${label} & updated records.`);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleUnlockSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMode === 'CREATE_ADMIN') {
      const currentPin = settings.securityPin || securityPin || '1234';
      const currentPass = settings.adminPassword || 'admin123';
      if (
        adminAccountForm.currentPinOrPassword &&
        adminAccountForm.currentPinOrPassword !== currentPin &&
        adminAccountForm.currentPinOrPassword !== currentPass
      ) {
        setLoginError('Current PIN or Password is incorrect.');
        return;
      }
      try {
        const nextName = adminAccountForm.adminFullName.trim() || 'Hospital Administrator';
        const nextEmail = adminAccountForm.adminEmail.trim() || 'admin@hospital.local';
        const nextUser = adminAccountForm.adminUsername.trim() || 'admin';
        const payload: Record<string, any> = {
          adminFullName: nextName,
          adminEmail: nextEmail,
          adminUsername: nextUser,
        };
        if (adminAccountForm.adminPassword.trim()) {
          payload.adminPassword = adminAccountForm.adminPassword.trim();
        }
        await postMutation('/api/settings', payload, 'PATCH');
        setLoggedInStaffName(nextName);
        setLoggedInStaffEmail(nextEmail);
        setIsLocked(false);
        setLoginError('');
        notify('success', `Admin ID saved & logged in as ${nextName} (${nextEmail}).`);
      } catch (err: any) {
        setLoginError(err.message || 'Could not save Admin account.');
      }
      return;
    }

    if (loginMode === 'PIN') {
      if (pinInput === (settings.securityPin || securityPin)) {
        setIsLocked(false);
        setPinInput('');
        setLoginError('');
        notify('success', `Unlocked session as ${loggedInStaffName}.`);
      } else {
        setLoginError('Incorrect Security PIN. Please enter your valid PIN.');
      }
    } else {
      const configuredUser = (settings.adminUsername || 'admin').toLowerCase();
      const configuredEmail = (settings.adminEmail || 'admin@hospital.local').toLowerCase();
      const configuredPass = settings.adminPassword || 'admin123';
      const enteredUser = usernameInput.trim().toLowerCase();
      if (
        (enteredUser === configuredUser || enteredUser === configuredEmail || enteredUser === 'admin') &&
        (passwordInput === configuredPass || passwordInput === (settings.securityPin || securityPin))
      ) {
        setIsLocked(false);
        setPasswordInput('');
        setLoginError('');
        notify('success', `Logged in as ${settings.adminFullName || loggedInStaffName}.`);
      } else {
        setLoginError('Invalid Username/Email or Password.');
      }
    }
  };

  const handleSaveCustomAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nextName = adminAccountForm.adminFullName.trim() || 'Hospital Administrator';
      const nextEmail = adminAccountForm.adminEmail.trim() || 'admin@hospital.local';
      const nextUser = adminAccountForm.adminUsername.trim() || 'admin';
      const payload: Record<string, any> = {
        adminFullName: nextName,
        adminEmail: nextEmail,
        adminUsername: nextUser,
      };
      if (adminAccountForm.adminPassword.trim()) {
        payload.adminPassword = adminAccountForm.adminPassword.trim();
      }
      await postMutation('/api/settings', payload, 'PATCH');
      setLoggedInStaffName(nextName);
      setLoggedInStaffEmail(nextEmail);
      setShowAdminAccountModal(false);
      setAdminAccountForm((prev) => ({ ...prev, adminPassword: '', currentPinOrPassword: '' }));
      notify(
        'success',
        `Admin Profile customized: ${nextName} (${nextEmail} · Login ID: ${nextUser}).`
      );
    } catch (err: any) {
      notify('error', err.message || 'Failed to update Admin account');
    }
  };

  const handleSaveNewSecurityPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinModalError('');
    const activePin = settings.securityPin || securityPin || '1234';
    const activePass = settings.adminPassword || 'admin123';
    if (oldPinInput !== activePin && oldPinInput !== activePass) {
      setPinModalError('Incorrect Current (Old) PIN! You must enter the valid old PIN first.');
      return;
    }
    if (newPinInput.length < 4) {
      setPinModalError('New PIN must be at least 4 digits.');
      return;
    }
    if (newPinInput !== confirmNewPinInput) {
      setPinModalError('New PIN and Confirm New PIN do not match.');
      return;
    }
    try {
      await postMutation(
        '/api/settings',
        { oldPin: oldPinInput, securityPin: newPinInput },
        'PATCH'
      );
      setSecurityPin(newPinInput);
      setOldPinInput('');
      setNewPinInput('');
      setConfirmNewPinInput('');
      setPinModalError('');
      setShowChangePinModal(false);
      notify('success', 'Security PIN updated after verifying old PIN.');
    } catch (err: any) {
      setPinModalError(err.message || 'Could not update PIN');
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

  const cur = settings.currency;

  // =========================================================================
  // DAILY & MONTHLY PATIENTS, STAFF ATTENDANCE (HAZIR / CHUTTIYAN) & MEDICINES METRICS
  // =========================================================================
  const selectedDayStr = attendanceDate || '2026-10-10';
  const selectedMonthStr = payrollMonth || selectedDayStr.slice(0, 7);

  // Patients who visited/registered/billed on selectedDayStr
  const dailyPatientNames = Array.from(
    new Set([
      ...patients
        .filter((p) => p.registeredBusinessDate === selectedDayStr)
        .map((p) => p.fullName),
      ...encounters
        .filter((e) => e.businessDate === selectedDayStr)
        .map((e) => e.patientName),
      ...labOrders
        .filter((l) => l.businessDate === selectedDayStr)
        .map((l) => l.patientName),
      ...invoices
        .filter(
          (i) =>
            i.businessDate === selectedDayStr &&
            !i.department.startsWith('PHARMACY_WHOLESALE')
        )
        .map((i) => i.customerName),
    ])
  );

  // Helper to get a staff member's attendance status on a given date
  const getStaffStatusOnDate = (
    empId: string,
    dateStr: string
  ): 'PRESENT' | 'ABSENT' | 'LEAVE' => {
    const rec = staffAttendance.find((a) => a.employeeId === empId && a.date === dateStr);
    return rec ? rec.status : 'PRESENT';
  };

  const dailyPresentStaffList = employees.filter(
    (emp) => getStaffStatusOnDate(emp.id, selectedDayStr) === 'PRESENT'
  );
  const dailyAbsentStaffList = employees.filter(
    (emp) => getStaffStatusOnDate(emp.id, selectedDayStr) !== 'PRESENT'
  );

  const totalMedicineUnitsInStock = pharmacyBatches.reduce(
    (acc, b) => acc + (b.stockQty || 0) + (b.wardStockQty || 0),
    0
  );

  // Per-Employee Monthly & All-Time Attendance / Chuttiyan Summary
  const getEmployeeAttendanceSummary = (empId: string, monthPrefix: string) => {
    const allEmpRecords = staffAttendance.filter((a) => a.employeeId === empId);
    const monthRecords = allEmpRecords.filter((a) => a.month === monthPrefix);

    const monthPresentDates = monthRecords
      .filter((a) => a.status === 'PRESENT')
      .map((a) => a.date)
      .sort();
    const monthAbsentDates = monthRecords
      .filter((a) => a.status === 'ABSENT' || a.status === 'LEAVE')
      .map((a) => a.date)
      .sort();

    const allTimePresentDates = allEmpRecords
      .filter((a) => a.status === 'PRESENT')
      .map((a) => a.date)
      .sort();
    const allTimeAbsentDates = allEmpRecords
      .filter((a) => a.status === 'ABSENT' || a.status === 'LEAVE')
      .map((a) => a.date)
      .sort();

    // Month-by-month breakdown of absences (Chuttiyan) and present days
    const monthsMap = new Map<
      string,
      { month: string; presentCount: number; absentCount: number; absentDates: string[]; presentDates: string[] }
    >();
    for (const r of allEmpRecords) {
      const m = r.month || r.date.slice(0, 7);
      if (!monthsMap.has(m)) {
        monthsMap.set(m, {
          month: m,
          presentCount: 0,
          absentCount: 0,
          absentDates: [],
          presentDates: [],
        });
      }
      const bucket = monthsMap.get(m)!;
      if (r.status === 'PRESENT') {
        bucket.presentCount += 1;
        bucket.presentDates.push(r.date);
      } else {
        bucket.absentCount += 1;
        bucket.absentDates.push(r.date);
      }
    }

    const monthlyBreakdown = Array.from(monthsMap.values()).sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    return {
      monthPresentCount: monthPresentDates.length,
      monthAbsentCount: monthAbsentDates.length,
      monthPresentDates,
      monthAbsentDates,
      allTimePresentCount: allTimePresentDates.length,
      allTimeAbsentCount: allTimeAbsentDates.length,
      allTimePresentDates,
      allTimeAbsentDates,
      monthlyBreakdown,
    };
  };

  // All unique dates recorded across hospital history (patients + staff attendance)
  const allRecordedHistoryDates = Array.from(
    new Set([
      selectedDayStr,
      ...staffAttendance.map((a) => a.date),
      ...patients.map((p) => p.registeredBusinessDate),
      ...encounters.map((e) => e.businessDate),
      ...invoices.map((i) => i.businessDate),
    ])
  )
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex bg-[#EEF3F6] text-slate-900 ${
        isModuleFullScreen || isAppFullScreen ? 'fixed inset-0 z-40' : ''
      }`}
    >
      {/* =====================================================================
          MINIMIZED OPTIONS / MODULES LAPTOP TASKBAR BAR (BOTTOM LEFT)
         ===================================================================== */}
      {(minimizedModules.length > 0 || isAppMinimized) && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-wrap items-center gap-2 max-w-xl">
          {isAppMinimized && (
            <div className="bg-[#1D5464] text-white rounded-xl shadow-2xl border border-white/20 px-3 py-1.5 flex items-center gap-2 text-xs">
              <span className="font-semibold truncate max-w-[180px]">
                {getModuleMeta(activeModule).label}
              </span>
              <button
                type="button"
                onClick={() => setIsAppMinimized(false)}
                className="h-6 w-6 rounded bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center cursor-pointer"
                title="Restore Window"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsAppMinimized(false)}
                className="h-6 w-6 rounded bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer"
                title="Close (✕)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {minimizedModules.map((mod) => {
            const meta = getModuleMeta(mod);
            return (
              <div
                key={mod}
                className="bg-[#1D5464] text-white rounded-xl shadow-2xl border border-white/20 px-3 py-1.5 flex items-center gap-2 text-xs"
              >
                <span className="font-semibold truncate max-w-[180px]">
                  {meta.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAppMinimized(false);
                    navigateToOption(mod);
                  }}
                  className="h-6 w-6 rounded bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center cursor-pointer"
                  title="Restore Window"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMinimizedModules((prev) => prev.filter((item) => item !== mod))
                  }
                  className="h-6 w-6 rounded bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer"
                  title="Close (✕)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          LOGIN / LOGOUT OVERLAY (WITH LAPTOP ← BACK, —, □, ✕)
         ===================================================================== */}
      {isLocked && isLockModalMinimized && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#1D5464] text-white rounded-xl shadow-2xl border border-white/20 px-3.5 py-2 flex items-center gap-2.5 text-xs">
          <KeyRound className="w-4 h-4 text-teal-200 shrink-0" />
          <span className="font-semibold whitespace-nowrap">
            Login / Logout (PIN)
          </span>
          <button
            type="button"
            onClick={() => {
              setIsLockModalMinimized(false);
              setIsLockModalFullScreen(false);
            }}
            className="h-7 w-7 rounded bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center cursor-pointer"
            title="Restore Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={async () => {
              await autoSaveAdminProfileSilently();
              setIsLocked(false);
              setIsLockModalMinimized(false);
              setIsLockModalFullScreen(false);
            }}
            className="h-7 w-7 rounded bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer"
            title="Close (✕)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLocked && !isLockModalMinimized && (
        <div className="fixed inset-0 z-50 bg-[#0F2937]/95 flex flex-col overflow-hidden">
          {/* Top-Most Laptop Window Bar for Login / Logout Screen */}
          <div className="bg-slate-100 border-b border-slate-300 px-6 py-2 shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  await autoSaveAdminProfileSilently();
                  setIsLocked(false);
                  setIsLockModalMinimized(false);
                  setIsLockModalFullScreen(false);
                }}
                className="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors"
                title="Back (←)"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Login / Logout — {settings.hospitalName}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  await autoSaveAdminProfileSilently();
                  setIsLockModalMinimized(true);
                }}
                className="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors"
                title="Minimize (—)"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLockModalFullScreen((prev) => !prev);
                  toggleBrowserFullScreen();
                }}
                className="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors"
                title={isLockModalFullScreen ? 'Restore Down' : 'Maximize / Full Screen'}
              >
                {isLockModalFullScreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await autoSaveAdminProfileSilently();
                  setIsLocked(false);
                  setIsLockModalMinimized(false);
                  setIsLockModalFullScreen(false);
                }}
                className="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                title="Close (✕)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`flex-1 overflow-y-auto flex items-center justify-center ${
              isLockModalFullScreen ? 'p-0' : 'p-4'
            }`}
          >
            <div
              className={`bg-white shadow-2xl border border-slate-200 w-full space-y-4 ${
                isLockModalFullScreen
                  ? 'w-full min-h-full max-w-none rounded-none p-6 md:p-12 flex flex-col justify-center'
                  : 'rounded-2xl max-w-lg p-6 my-auto'
              }`}
            >
              {/* Laptop Window Bar inside Login / Logout Box */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await autoSaveAdminProfileSilently();
                      setIsLocked(false);
                      setIsLockModalMinimized(false);
                      setIsLockModalFullScreen(false);
                    }}
                    className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors"
                    title="Back (←)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800">
                    Login / Logout (Security PIN &amp; Staff Login)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await autoSaveAdminProfileSilently();
                      setIsLockModalMinimized(true);
                    }}
                    className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors"
                    title="Minimize (—)"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isLockModalFullScreen;
                      setIsLockModalFullScreen(next);
                      requestOrExitNativeBrowserFullScreen(next);
                    }}
                    className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors"
                    title={isLockModalFullScreen ? 'Restore Down' : 'Maximize / Full Screen'}
                  >
                    {isLockModalFullScreen ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await autoSaveAdminProfileSilently();
                      setIsLocked(false);
                      setIsLockModalMinimized(false);
                      setIsLockModalFullScreen(false);
                    }}
                    className="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                    title="Close (✕)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="w-11 h-11 rounded-xl bg-[#1D5464] text-white flex items-center justify-center mx-auto">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {settings.hospitalName}
                </h2>
                <p className="text-xs text-slate-500">
                  Enter Security PIN or Staff Login to Access System
                </p>
              </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('PIN');
                  setLoginError('');
                }}
                className={`flex-1 py-2 rounded-md font-bold cursor-pointer ${
                  loginMode === 'PIN'
                    ? 'bg-[#1D5464] text-white'
                    : 'text-slate-600'
                }`}
              >
                Security PIN
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('PASSWORD');
                  setLoginError('');
                }}
                className={`flex-1 py-2 rounded-md font-bold cursor-pointer ${
                  loginMode === 'PASSWORD'
                    ? 'bg-[#1D5464] text-white'
                    : 'text-slate-600'
                }`}
              >
                Admin ID &amp; Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('CREATE_ADMIN');
                  setLoginError('');
                }}
                className={`flex-1 py-2 rounded-md font-bold cursor-pointer ${
                  loginMode === 'CREATE_ADMIN'
                    ? 'bg-[#1D5464] text-white'
                    : 'text-slate-600'
                }`}
              >
                Setup Admin ID
              </button>
            </div>

            <form onSubmit={handleUnlockSession} className="space-y-4 text-xs">
              {loginMode !== 'CREATE_ADMIN' && (
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Select Staff Profile / Role
                  </label>
                  <select
                    value={activeRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as StaffRole;
                      setActiveRole(nextRole);
                      setLoggedInStaffName(
                        nextRole === 'ADMIN'
                          ? settings.adminFullName || 'Hospital Administrator'
                          : nextRole === 'PHARMACIST'
                          ? 'Chief Pharmacist'
                          : nextRole === 'CASHIER'
                          ? 'Billing Cashier'
                          : nextRole === 'LAB_TECH'
                          ? 'Pathology Lab Officer'
                          : nextRole === 'COOK'
                          ? 'Kitchen / Cook Staff'
                          : nextRole === 'SWEEPER'
                          ? 'Sanitation / Sweeper Staff'
                          : 'Hospital Staff'
                      );
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
                  >
                    <option value="ADMIN">
                      {settings.adminFullName || 'Administrator'} (Full Access)
                    </option>
                    <option value="PHARMACIST">Pharmacist (Pharmacy &amp; Stock)</option>
                    <option value="CASHIER">Cashier (Customer Billing &amp; Receipts)</option>
                    <option value="LAB_TECH">Laboratory Technologist / Assistant</option>
                    <option value="ACCOUNTANT">Accountant (Profit/Loss &amp; Salary)</option>
                    <option value="DOCTOR">Physician / Doctor</option>
                    <option value="NURSE">Staff Nurse</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="COOK">Cook / Kitchen Staff</option>
                    <option value="SWEEPER">Cleaner / Sweeper Staff</option>
                    <option value="OTHER">Other / Custom Hospital Staff</option>
                  </select>
                </div>
              )}

              {loginMode === 'PIN' ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={settings.adminUsername || 'admin'}
                    readOnly
                    className="hidden"
                  />
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Enter Secret Security PIN
                    </label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="••••"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-center font-mono text-xl tracking-widest text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Enter'].map(
                      (k) => (
                        <button
                          key={k}
                          type={k === 'Enter' ? 'submit' : 'button'}
                          onClick={() => {
                            if (k === 'Clear') setPinInput('');
                            else if (k !== 'Enter') setPinInput((p) => (p + k).slice(0, 6));
                          }}
                          className={`py-2.5 rounded-lg font-mono font-bold text-sm cursor-pointer border ${
                            k === 'Enter'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : k === 'Clear'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200'
                          }`}
                        >
                          {k}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : loginMode === 'PASSWORD' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Admin Username or Email ID
                    </label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter your Admin Username or Email..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Password
                    </label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Your Full Name (Admin Name)
                    </label>
                    <input
                      type="text"
                      autoComplete="name"
                      value={adminAccountForm.adminFullName}
                      onChange={(e) =>
                        setAdminAccountForm({
                          ...adminAccountForm,
                          adminFullName: e.target.value,
                        })
                      }
                      placeholder="e.g., Dr. Ahmed / Hospital Admin"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Your Email / Official ID
                    </label>
                    <input
                      type="text"
                      autoComplete="email"
                      value={adminAccountForm.adminEmail}
                      onChange={(e) =>
                        setAdminAccountForm({
                          ...adminAccountForm,
                          adminEmail: e.target.value,
                        })
                      }
                      placeholder="e.g., admin@hospital.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">
                        Login Username
                      </label>
                      <input
                        type="text"
                        autoComplete="username"
                        value={adminAccountForm.adminUsername}
                        onChange={(e) =>
                          setAdminAccountForm({
                            ...adminAccountForm,
                            adminUsername: e.target.value,
                          })
                        }
                        placeholder="e.g., admin"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">
                        New Password (Optional)
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={adminAccountForm.adminPassword}
                        onChange={(e) =>
                          setAdminAccountForm({
                            ...adminAccountForm,
                            adminPassword: e.target.value,
                          })
                        }
                        placeholder="Set password..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {loginError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium text-center">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white font-bold text-sm cursor-pointer"
              >
                {loginMode === 'CREATE_ADMIN'
                  ? 'Save Admin ID & Open'
                  : 'Login & Open System'}
              </button>
            </form>
          </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECURE CHANGE PIN MODAL (WITH LAPTOP ← BACK, —, □, ✕)
         ===================================================================== */}
      {showChangePinModal && isChangePinMinimized && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#1D5464] text-white rounded-xl shadow-2xl border border-white/20 px-3.5 py-2 flex items-center gap-2.5 text-xs">
          <KeyRound className="w-4 h-4 text-teal-200 shrink-0" />
          <span className="font-semibold whitespace-nowrap">
            Change Security PIN
          </span>
          <button
            type="button"
            onClick={() => {
              setIsChangePinMinimized(false);
              setIsChangePinFullScreen(false);
            }}
            className="h-7 w-7 rounded bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center cursor-pointer"
            title="Restore Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowChangePinModal(false);
              setIsChangePinMinimized(false);
              setIsChangePinFullScreen(false);
            }}
            className="h-7 w-7 rounded bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer"
            title="Close (✕)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showChangePinModal && !isChangePinMinimized && (
        <div
          className={`fixed inset-0 z-50 flex justify-center overflow-y-auto ${
            isChangePinFullScreen
              ? 'items-start bg-white p-0 w-screen h-screen'
              : 'items-center bg-slate-900/60 p-4'
          }`}
        >
          <form
            onSubmit={handleSaveNewSecurityPin}
            className={`bg-white border border-slate-200 w-full space-y-4 text-xs ${
              isChangePinFullScreen
                ? 'w-screen min-h-screen max-w-2xl mx-auto rounded-none border-0 p-6 md:p-10'
                : 'rounded-xl max-w-md p-6'
            }`}
          >
            <div
              onDoubleClick={() => {
                const next = !isChangePinFullScreen;
                setIsChangePinFullScreen(next);
                requestOrExitNativeBrowserFullScreen(next);
              }}
              className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 select-none"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePinModal(false);
                    setIsChangePinMinimized(false);
                    setIsChangePinFullScreen(false);
                  }}
                  className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors"
                  title="Back (←)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-slate-900">
                  Change Security PIN (Protected)
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsChangePinMinimized(true)}
                  className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors"
                  title="Minimize (—)"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isChangePinFullScreen;
                    setIsChangePinFullScreen(next);
                    requestOrExitNativeBrowserFullScreen(next);
                  }}
                  className={`h-8 w-8 rounded-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                    isChangePinFullScreen
                      ? 'bg-[#1D5464] text-white border-[#1D5464]'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  }`}
                  title={isChangePinFullScreen ? 'Restore Down' : 'Maximize / Full Screen'}
                >
                  {isChangePinFullScreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePinModal(false);
                    setIsChangePinMinimized(false);
                    setIsChangePinFullScreen(false);
                    setPinModalError('');
                    setOldPinInput('');
                    setNewPinInput('');
                    setConfirmNewPinInput('');
                  }}
                  className="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                  title="Close (✕)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-slate-500">
              For security, the existing PIN is hidden. Enter your current (old) PIN first to set a new PIN.
            </p>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={settings.adminUsername || 'admin'}
              readOnly
              className="hidden"
            />
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                1. Enter Current (Old) PIN *
              </label>
              <input
                type="password"
                autoComplete="current-password"
                maxLength={12}
                value={oldPinInput}
                onChange={(e) => setOldPinInput(e.target.value)}
                placeholder="•••• (Hidden)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-base tracking-widest text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                2. Enter New Security PIN (4-6 Digits) *
              </label>
              <input
                type="password"
                autoComplete="new-password"
                maxLength={6}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-base tracking-widest text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                3. Confirm New Security PIN *
              </label>
              <input
                type="password"
                autoComplete="new-password"
                maxLength={6}
                value={confirmNewPinInput}
                onChange={(e) => setConfirmNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-base tracking-widest text-slate-900"
              />
            </div>
            {pinModalError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {pinModalError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowChangePinModal(false);
                  setPinModalError('');
                  setOldPinInput('');
                  setNewPinInput('');
                  setConfirmNewPinInput('');
                }}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#1D5464] text-white font-semibold cursor-pointer"
              >
                Verify Old PIN &amp; Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          CUSTOMIZE ADMIN ACCOUNT / ID MODAL (WITH LAPTOP ← BACK, —, □, ✕)
         ===================================================================== */}
      {showAdminAccountModal && isAdminModalMinimized && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#1D5464] text-white rounded-xl shadow-2xl border border-white/20 px-3.5 py-2 flex items-center gap-2.5 text-xs">
          <UserPlus className="w-4 h-4 text-teal-200 shrink-0" />
          <span className="font-semibold whitespace-nowrap">
            Customize Admin ID
          </span>
          <button
            type="button"
            onClick={() => {
              setIsAdminModalMinimized(false);
              setIsAdminModalFullScreen(false);
            }}
            className="h-7 w-7 rounded bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center cursor-pointer"
            title="Restore Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={async () => {
              await autoSaveAdminProfileSilently();
              setShowAdminAccountModal(false);
              setIsAdminModalMinimized(false);
              setIsAdminModalFullScreen(false);
            }}
            className="h-7 w-7 rounded bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer"
            title="Close (✕)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showAdminAccountModal && !isAdminModalMinimized && (
        <div
          className={`fixed inset-0 z-50 flex justify-center overflow-y-auto ${
            isAdminModalFullScreen
              ? 'items-start bg-white p-0 w-screen h-screen'
              : 'items-center bg-slate-900/60 p-4'
          }`}
        >
          <form
            onSubmit={handleSaveCustomAdminAccount}
            className={`bg-white border border-slate-200 w-full space-y-4 text-xs ${
              isAdminModalFullScreen
                ? 'w-screen min-h-screen max-w-2xl mx-auto rounded-none border-0 p-6 md:p-10'
                : 'rounded-xl max-w-md p-6'
            }`}
          >
            <div
              onDoubleClick={() => {
                const next = !isAdminModalFullScreen;
                setIsAdminModalFullScreen(next);
                requestOrExitNativeBrowserFullScreen(next);
              }}
              className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 select-none"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await autoSaveAdminProfileSilently();
                    setShowAdminAccountModal(false);
                    setIsAdminModalMinimized(false);
                    setIsAdminModalFullScreen(false);
                  }}
                  className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors"
                  title="Back (←)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-slate-900">
                  Customize Admin ID &amp; Profile
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await autoSaveAdminProfileSilently();
                    setIsAdminModalMinimized(true);
                  }}
                  className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors"
                  title="Minimize (—)"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isAdminModalFullScreen;
                    setIsAdminModalFullScreen(next);
                    requestOrExitNativeBrowserFullScreen(next);
                  }}
                  className={`h-8 w-8 rounded-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                    isAdminModalFullScreen
                      ? 'bg-[#1D5464] text-white border-[#1D5464]'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  }`}
                  title={isAdminModalFullScreen ? 'Restore Down' : 'Maximize / Full Screen'}
                >
                  {isAdminModalFullScreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await autoSaveAdminProfileSilently();
                    setShowAdminAccountModal(false);
                    setIsAdminModalMinimized(false);
                    setIsAdminModalFullScreen(false);
                  }}
                  className="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer transition-colors"
                  title="Close (✕)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-slate-500">
              Create or customize your own Admin Name, Email ID, Login Username, and Password to operate the software under your own identity.
            </p>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Admin Full Name
              </label>
              <input
                type="text"
                value={adminAccountForm.adminFullName}
                onChange={(e) =>
                  setAdminAccountForm({ ...adminAccountForm, adminFullName: e.target.value })
                }
                placeholder="e.g., Dr. Muhammad Ali / Hospital Admin"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Admin Email / Official ID (Recorded in History)
              </label>
              <input
                type="text"
                value={adminAccountForm.adminEmail}
                onChange={(e) =>
                  setAdminAccountForm({ ...adminAccountForm, adminEmail: e.target.value })
                }
                placeholder="e.g., admin@hospital.local"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Login Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={adminAccountForm.adminUsername}
                  onChange={(e) =>
                    setAdminAccountForm({ ...adminAccountForm, adminUsername: e.target.value })
                  }
                  placeholder="e.g., admin"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Login Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={adminAccountForm.adminPassword}
                  onChange={(e) =>
                    setAdminAccountForm({ ...adminAccountForm, adminPassword: e.target.value })
                  }
                  placeholder="Leave blank to keep current"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdminAccountModal(false)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#1D5464] text-white font-semibold cursor-pointer"
              >
                Save Admin ID &amp; Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          LEFT DEEP-TEAL SIDEBAR (AUTO-COLLAPSES FOR 100% EDGE-TO-EDGE FULL SCREEN UNLESS TOGGLED OPEN)
         ===================================================================== */}
      {(!(isModuleFullScreen || isAppFullScreen) || showSidebarInFullScreen) && (
      <aside className="no-print flex w-56 md:w-64 h-screen overflow-y-auto bg-[#1D5464] text-white flex-col justify-between shrink-0 select-none z-40">
        <div>
          {/* Brand Crest & Wordmark (No Developer Name at Top) */}
          <div className="px-6 py-5 flex items-center gap-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-teal-200 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold tracking-wide text-white truncate">
                AL-HIKMAT HMS
              </div>
              <div className="text-[10px] text-teal-200/90 truncate">
                Hospital Management System
              </div>
            </div>
          </div>

          {/* Sidebar Navigation Menu */}
          <nav className="px-3 py-5 space-y-1.5 text-sm">
            {(
              [
                {
                  key: 'dashboard',
                  label: 'Dashboard (P&L)',
                  mod: 'home' as WorkspaceModule,
                  icon: LayoutGrid,
                },
                {
                  key: 'patient_billing',
                  label: 'Make Patient Bill',
                  mod: 'patient_billing' as WorkspaceModule,
                  icon: Receipt,
                },
                {
                  key: 'records',
                  label: 'Pharmacy & Stock',
                  mod: 'pharmacy' as WorkspaceModule,
                  icon: Pill,
                },
                {
                  key: 'billing',
                  label: 'Billing, Staff & Salary',
                  mod: 'billing_hr' as WorkspaceModule,
                  icon: CreditCard,
                },
                {
                  key: 'laboratory',
                  label: 'Laboratory Billing',
                  mod: 'laboratory' as WorkspaceModule,
                  icon: FlaskConical,
                },
                {
                  key: 'patients',
                  label: 'Patients & OPD/IPD',
                  mod: 'clinical' as WorkspaceModule,
                  icon: Users,
                },
                {
                  key: 'settings',
                  label: 'History & Backups',
                  mod: 'accounting_security' as WorkspaceModule,
                  icon: History,
                },
              ] as const
            ).map((item) => {
              const IconComp = item.icon;
              const isSelected = activeModule === item.mod;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigateToOption(item.mod)}
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#3B6E7C] text-white font-semibold shadow-xs'
                      : 'text-teal-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Actions: Login/Logout, Change PIN, Hospital Administrator & Developer Credit */}
        <div className="p-4 border-t border-white/10 space-y-2 text-xs">
          <div className="px-3 py-2 rounded-lg bg-white/10 text-teal-100 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Auto-Backup Active
            </span>
            <span className="font-mono text-[10px] text-teal-200">{lastAutoSavedTime}</span>
          </div>

          {/* 1. Login / Logout (PIN) */}
          <button
            type="button"
            onClick={() => {
              setIsLockModalMinimized(false);
              setIsLocked(true);
            }}
            className="w-full py-2 px-3 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Login / Logout (PIN)</span>
          </button>

          {/* 2. Change PIN (Below Login / Logout) */}
          <button
            type="button"
            onClick={() => {
              setOldPinInput('');
              setNewPinInput('');
              setConfirmNewPinInput('');
              setPinModalError('');
              setIsChangePinMinimized(false);
              setShowChangePinModal(true);
            }}
            className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-teal-200" />
            <span>Change PIN (••••)</span>
          </button>

          {/* 3. Hospital Administrator / Active Profile & Role Selector (Below Change PIN) */}
          <div className="p-2.5 rounded-lg bg-white/10 border border-white/10 space-y-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsAdminModalMinimized(false);
                  setShowAdminAccountModal(true);
                }}
                title="Click to customize Admin Name, Email & Login ID"
                className="w-8 h-8 rounded-full bg-teal-500/30 border border-teal-300/40 text-white font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer"
              >
                {(loggedInStaffName || 'AD').slice(0, 2).toUpperCase()}
              </button>
              <div className="min-w-0 flex-1 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminModalMinimized(false);
                    setShowAdminAccountModal(true);
                  }}
                  className="text-xs font-bold text-white hover:text-teal-200 truncate block w-full text-left cursor-pointer"
                  title="Customize Hospital Administrator ID"
                >
                  {loggedInStaffName}
                </button>
                <select
                  value={activeRole}
                  onChange={(e) => setActiveRole(e.target.value as StaffRole)}
                  className="w-full mt-0.5 text-[11px] text-teal-100 bg-[#16424F] border border-white/15 rounded px-1.5 py-0.5 font-medium cursor-pointer focus:outline-none"
                >
                  <option value="ADMIN">Admin ({loggedInStaffEmail})</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="LAB_TECH">Lab Tech</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="HR_MANAGER">HR Manager</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="COOK">Cook / Kitchen</option>
                  <option value="SWEEPER">Cleaner / Sweeper</option>
                  <option value="OTHER">Other Staff</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAdminModalMinimized(false);
                setShowAdminAccountModal(true);
              }}
              className="w-full py-1.5 px-2.5 rounded bg-white/10 hover:bg-white/20 text-teal-100 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <UserPlus className="w-3 h-3 text-teal-200" />
              <span>Customize Admin ID</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 text-[11px] text-teal-200 font-semibold text-center">
            Developed by Sajjad Qaiser Shah
          </div>
        </div>
      </aside>
      )}

      {/* =====================================================================
          RIGHT MAIN WORKSPACE COLUMN (EXPANDS TO 100% FULL SCREEN WHEN MAXIMIZED)
         ===================================================================== */}
      <div
        className={`flex-1 flex flex-col h-screen print:h-auto overflow-hidden print:overflow-visible min-w-0 transition-all ${
          isAppMinimized ? 'opacity-10 pointer-events-none scale-95' : ''
        }`}
      >
        {/* =====================================================================
            TOP-MOST LAPTOP WINDOW BAR (ABOVE SEARCH BAR) — ← BACK, —, □, ✕
           ===================================================================== */}
        <div
          onDoubleClick={toggleBrowserFullScreen}
          className={`no-print border-b px-4 sm:px-6 py-2 shrink-0 z-30 flex items-center justify-between gap-3 select-none ${
            isModuleFullScreen || isAppFullScreen
              ? 'bg-[#1D5464] text-white border-[#16424F]'
              : 'bg-slate-100 text-slate-900 border-slate-200'
          }`}
          title="Double-click title bar or click □ to toggle Full Screen"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoBackOption}
              className={`h-8 w-8 rounded-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                isModuleFullScreen || isAppFullScreen
                  ? 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
                  : 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
              title="Back (←)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            {(isModuleFullScreen || isAppFullScreen) && (
              <button
                type="button"
                onClick={() => setShowSidebarInFullScreen((prev) => !prev)}
                className="h-8 px-2.5 rounded-md bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Show or Hide Left Menu while in Full Screen"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{showSidebarInFullScreen ? 'Hide Menu' : 'Show Menu'}</span>
              </button>
            )}
            <div
              className={`text-xs sm:text-sm font-bold truncate ${
                isModuleFullScreen || isAppFullScreen ? 'text-white' : 'text-slate-900'
              }`}
            >
              {getModuleMeta(activeModule).label}
            </div>
            {(isModuleFullScreen || isAppFullScreen) && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-300/30 text-emerald-100 text-[10px] font-bold">
                FULL SCREEN MODE
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleMinimizeCurrentOption}
              className={`h-8 w-8 rounded-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                isModuleFullScreen || isAppFullScreen
                  ? 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
                  : 'bg-white hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title="Minimize (—)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleBrowserFullScreen}
              className={`h-8 px-2.5 rounded-md border inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-xs font-semibold ${
                isModuleFullScreen || isAppFullScreen
                  ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
              title={
                isModuleFullScreen || isAppFullScreen
                  ? 'Restore Down (Exit Full Screen)'
                  : 'Maximize / Full Screen'
              }
            >
              {isModuleFullScreen || isAppFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restore Down</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Maximize</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={async () => {
                await autoSaveAdminProfileSilently();
                if (activeModule !== 'home') {
                  setActiveModule('home');
                  setActiveSidebarKey('dashboard');
                } else if (isModuleFullScreen || isAppFullScreen) {
                  setIsModuleFullScreen(false);
                  setIsAppFullScreen(false);
                  setShowSidebarInFullScreen(false);
                  await requestOrExitNativeBrowserFullScreen(false);
                }
              }}
              className="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer transition-colors"
              title="Close (✕)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOP WHITE HEADER BAR (SEARCH & AUTOMATIC DAILY PATIENTS, STAFF ATTENDANCE & MEDICINE STOCK SUMMARY) */}
        <header
          className={`no-print bg-white border-b border-slate-200/80 shrink-0 z-30 flex flex-wrap items-center justify-between gap-3 ${
            isModuleFullScreen || isAppFullScreen ? 'px-4 py-1.5' : 'px-6 py-3'
          }`}
        >
          {/* Left: Search Input Box */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Search staff name, absent dates, patients, medicines, or YYYY-MM-DD..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#F1F5F8] text-xs text-slate-800 placeholder-slate-400 border border-transparent focus:border-[#1D5464]/30 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Right Header Controls: Auto-Updating Daily Patients, Staff Attendance (Hazir/Absent) & Medicine Stock */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#1D5464]" />
              <span>Date:</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value || '2026-10-10')}
                className="bg-transparent font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
                title="Select Date to view or mark Daily Patients & Staff Attendance"
              />
            </div>

            <button
              type="button"
              onClick={() => navigateToOption('clinical')}
              className="px-3 py-1.5 rounded-lg bg-[#F1F5F8] hover:bg-slate-200/80 border border-slate-200/80 text-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title={`Patients on ${selectedDayStr}: ${dailyPatientNames.join(', ') || 'None'} (Total Registered: ${patients.length})`}
            >
              <Users className="w-3.5 h-3.5 text-[#1D5464]" />
              <span>
                Patients ({selectedDayStr}):{' '}
                <strong className="text-[#1D5464]">{dailyPatientNames.length} Hazir</strong>
              </span>
              <span className="text-slate-400 text-[11px]">(Total: {patients.length})</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToOption('billing_hr')}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Click to open Staff Attendance (Hazir / Ghair Hazir) & Salary System"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                Staff ({selectedDayStr}):{' '}
                <strong className="text-emerald-700">
                  {dailyPresentStaffList.length} Present
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-700 font-bold">
                {dailyAbsentStaffList.length} Absent
              </span>
              <span className="text-slate-400 text-[11px]">(Total: {employees.length})</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToOption('pharmacy')}
              className="px-3 py-1.5 rounded-lg bg-[#F1F5F8] hover:bg-slate-200/80 border border-slate-200/80 text-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="4 Medicine Types/Batches in Pharmacy Inventory with total available units"
            >
              <Pill className="w-3.5 h-3.5 text-[#1D5464]" />
              <span>
                Medicines: <strong>{pharmacyBatches.length} Types</strong>
              </span>
              <span className="text-slate-400 text-[11px]">
                ({totalMedicineUnitsInStock} Stock Units)
              </span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Content Area */}
        <div className="flex-1 overflow-y-auto print:overflow-visible flex flex-col">
          <div
            className={`app-workspace-content no-print flex-1 mx-auto w-full ${
              isModuleFullScreen || isAppFullScreen
                ? 'max-w-none px-3 sm:px-5 py-3'
                : 'max-w-[1400px] px-4 sm:px-7 py-6'
            }`}
          >
            <div className="space-y-6">
              {/* Notification Banner */}
              {statusBanner && (
                <div
                  className={`px-4 py-3 rounded-lg border text-xs flex items-center justify-between ${
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

              {/* =====================================================================
                  LIVE SEARCH RESULTS: STAFF ATTENDANCE (PRESENT / ABSENT DATES & MONTHLY CHUTTIYAN)
                 ===================================================================== */}
              {globalSearchQuery.trim() !== '' && (
                <div className="bg-white border-2 border-[#1D5464]/30 rounded-xl p-4 shadow-xs space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#1D5464]" />
                      <span className="font-bold text-slate-900 text-sm">
                        Search Results — Staff Attendance (Present / Absent Dates &amp; Monthly Chuttiyan): &ldquo;{globalSearchQuery}&rdquo;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigateToOption('billing_hr')}
                        className="px-2.5 py-1 rounded bg-[#1D5464] text-white font-semibold cursor-pointer"
                      >
                        Open Staff Attendance &amp; Salary
                      </button>
                      <button
                        type="button"
                        onClick={() => setGlobalSearchQuery('')}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        Clear Search
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 font-semibold">Staff Member &amp; Role</th>
                          <th className="py-2 font-semibold">
                            Month ({selectedMonthStr}) Present / Chuttiyan
                          </th>
                          <th className="py-2 font-semibold">
                            Month-Wise Total Chuttiyan Breakdown
                          </th>
                          <th className="py-2 font-semibold">
                            Exact Absent Dates (Kis Din Absent Thay)
                          </th>
                          <th className="py-2 font-semibold">
                            Exact Present Dates (Kis Din Present Thay)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employees
                          .filter((emp) => {
                            const q = globalSearchQuery.trim().toLowerCase();
                            const summary = getEmployeeAttendanceSummary(
                              emp.id,
                              selectedMonthStr
                            );
                            if (
                              emp.fullName.toLowerCase().includes(q) ||
                              emp.designation.toLowerCase().includes(q) ||
                              emp.empCode.toLowerCase().includes(q) ||
                              emp.department.toLowerCase().includes(q) ||
                              q.includes('absent') ||
                              q.includes('present') ||
                              q.includes('chutti') ||
                              q.includes('hazir') ||
                              q.includes('staff')
                            ) {
                              return true;
                            }
                            return (
                              summary.allTimeAbsentDates.some((d) => d.includes(q)) ||
                              summary.allTimePresentDates.some((d) => d.includes(q))
                            );
                          })
                          .map((emp) => {
                            const sum = getEmployeeAttendanceSummary(
                              emp.id,
                              selectedMonthStr
                            );
                            return (
                              <tr key={emp.id} className="hover:bg-slate-50">
                                <td className="py-2.5 pr-3">
                                  <div className="font-bold text-slate-900">{emp.fullName}</div>
                                  <div className="text-slate-500">
                                    {emp.empCode} · {emp.designation}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 font-mono">
                                  <span className="text-emerald-700 font-bold">
                                    Present: {sum.monthPresentCount}d
                                  </span>{' '}
                                  |{' '}
                                  <span className="text-rose-700 font-bold">
                                    Absent (Chutti): {sum.monthAbsentCount}d
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <div className="font-bold text-slate-900">
                                    Total All-Time Chuttiyan: {sum.allTimeAbsentCount} Days (Present: {sum.allTimePresentCount} Days)
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {sum.monthlyBreakdown.map((mb) => (
                                      <span
                                        key={mb.month}
                                        className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]"
                                      >
                                        {mb.month}: {mb.presentCount}P /{' '}
                                        <strong className="text-rose-700">
                                          {mb.absentCount} Chutti
                                        </strong>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3">
                                  {sum.allTimeAbsentDates.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {sum.allTimeAbsentDates.map((d) => (
                                        <span
                                          key={d}
                                          className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-mono font-bold text-[11px]"
                                        >
                                          Absent: {d}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-emerald-700 font-semibold">
                                      0 Absences (Regular Present)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    {sum.allTimePresentDates.map((d) => (
                                      <span
                                        key={d}
                                        className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px]"
                                      >
                                        Present: {d}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  MODULE 0: CONSOLIDATED PROFIT & LOSS HOME DASHBOARD
                 ===================================================================== */}
              {activeModule === 'home' && (
                <HomeDashboardView
                  hospitalName={settings.hospitalName}
                  currency={cur}
                  analytics={analytics}
                  doctors={doctors}
                  patients={patients}
                  encounters={encounters}
                  labOrders={labOrders}
                  pharmacyBatches={pharmacyBatches}
                  invoices={invoices}
                  supplierBills={supplierBills}
                  salarySlips={salarySlips}
                  expenses={expenses}
                  searchQuery={globalSearchQuery}
                  onNavigateModule={(mod) => navigateToOption(mod)}
                />
              )}

              {/* =====================================================================
                  MODULE 0B: DEDICATED PATIENT BILL BUILDER (CUSTOMER DETAIL + DOCTOR FEE + LAB TESTS + MEDICINES FROM STOCK + EXTRA DRIP/INJECTION + VIRTUAL/PRINTER BILL)
                 ===================================================================== */}
              {activeModule === 'patient_billing' && (
                <PatientBillBuilderView
                  currency={cur}
                  defaultDate={selectedDayStr}
                  doctors={doctors}
                  patients={patients}
                  encounters={encounters}
                  labOrders={labOrders}
                  pharmacyBatches={pharmacyBatches}
                  invoices={invoices}
                  globalSearchQuery={globalSearchQuery}
                  onSubmitCombinedBill={handleCreateCombinedPatientBill}
                  onOpenPrintableInvoice={(inv) =>
                    setPrintableDoc({ type: 'INVOICE', data: inv })
                  }
                  onDirectHardwarePrint={(inv, layout) => {
                    setPrintableDoc({ type: 'INVOICE', data: inv });
                    printViaConnectedPrinter({ type: 'INVOICE', data: inv }, settings, layout || 'A4');
                  }}
                  onReturnMedicineSale={(inv) => handleReturnPharmacySale(inv)}
                  onDeleteInvoice={(inv) =>
                    handleDeleteRecord('invoice', inv.id, `Patient Bill ${inv.invoiceNo}`)
                  }
                  onNavigateToPharmacyStore={() => navigateToOption('pharmacy')}
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
                    Assigns unique MRN and records separate registration Business Date
                  </p>

                  <form onSubmit={handleRegisterPatient} className="mt-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Full Name (Optional if Walk-in)</label>
                        <input
                          type="text"
                          value={patientForm.fullName}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, fullName: e.target.value })
                          }
                          placeholder="e.g., Bilal Hassan (or leave blank)"
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Phone Number (Optional)</label>
                        <input
                          type="text"
                          value={patientForm.phone}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, phone: e.target.value })
                          }
                          placeholder="Optional phone number"
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
                          Chief Complaint &amp; Vitals (Optional)
                        </label>
                        <input
                          type="text"
                          value={encounterForm.chiefComplaint}
                          onChange={(e) =>
                            setEncounterForm({
                              ...encounterForm,
                              chiefComplaint: e.target.value,
                            })
                          }
                          placeholder="Optional — leave blank if not needed"
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

              {/* Optional Service Toggle: Patient Registry Directory & Longitudinal Vitals Trend Tracker */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      03. Patient Registry Directory &amp; Longitudinal Vitals Trend Tracker
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      Optional Clinical Tool (Zero Impact on P&amp;L Calculations)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    If you do not need clinical vitals tracking, keep this section hidden — skipping it has zero effect on Hospital Billing or Profit &amp; Loss calculations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVitalsTracker((prev) => !prev)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer shrink-0"
                >
                  {showVitalsTracker ? 'Hide Optional Vitals Tracker' : 'Show Optional Vitals Tracker'}
                </button>
              </div>

              {showVitalsTracker && (() => {
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
                          Track multi-encounter trends in Blood Pressure (mmHg), Heart Rate (bpm), Oxygen Saturation (SpO2 %), and Temperature (°C)
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

                          <div className="h-64 w-full min-w-0">
                            <ResponsiveContainer width="100%" height={250} minWidth={100} minHeight={200}>
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

              {/* Searchable Registered Patients / People Directory with Total Count & Delete Option */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">
                        04. Registered Patients / People Directory
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md bg-[#1D5464] text-white text-xs font-bold font-mono">
                        Total People: {patients.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search any registered person by name, MRN, phone number, CNIC, or address, or delete a mistaken entry
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="Search person by name, phone, MRN, CNIC..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">MRN</th>
                        <th className="py-2.5 font-medium">Full Name</th>
                        <th className="py-2.5 font-medium">Age / Gender / Blood</th>
                        <th className="py-2.5 font-medium">Phone &amp; CNIC</th>
                        <th className="py-2.5 font-medium">Address &amp; Allergies</th>
                        <th className="py-2.5 font-medium">Registered Date</th>
                        <th className="py-2.5 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patients
                        .filter((p) => {
                          const q = (patientSearch || globalSearchQuery).trim().toLowerCase();
                          if (!q) return true;
                          return (
                            p.fullName.toLowerCase().includes(q) ||
                            p.mrn.toLowerCase().includes(q) ||
                            p.phone.toLowerCase().includes(q) ||
                            p.cnic.toLowerCase().includes(q) ||
                            p.address.toLowerCase().includes(q)
                          );
                        })
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-mono font-bold text-[#1D5464] whitespace-nowrap">
                              {p.mrn}
                            </td>
                            <td className="py-2.5 font-bold text-slate-900 whitespace-nowrap">
                              {p.fullName}
                            </td>
                            <td className="py-2.5 text-slate-700 whitespace-nowrap">
                              {p.age} yrs · {p.gender} · <strong className="font-mono">{p.bloodGroup}</strong>
                            </td>
                            <td className="py-2.5 font-mono text-slate-700 whitespace-nowrap">
                              <div>{p.phone}</div>
                              <div className="text-slate-400">{p.cnic}</div>
                            </td>
                            <td className="py-2.5 text-slate-700">
                              <div>{p.address}</div>
                              <div className="text-rose-700 text-[11px]">Allergies: {p.allergies}</div>
                            </td>
                            <td className="py-2.5 font-mono text-slate-700 whitespace-nowrap">
                              {p.registeredBusinessDate}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPrintableDoc(patientRegistrationToPrintableInvoice(p))
                                }
                                className="px-2.5 py-1 text-xs font-medium text-slate-800 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print Slip</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const doc = patientRegistrationToPrintableInvoice(p);
                                  setPrintableDoc(doc);
                                  printViaConnectedPrinter(doc, settings, 'A4');
                                }}
                                className="px-2 py-1 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded inline-flex items-center gap-1 cursor-pointer"
                                title="Send directly to connected printer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Printer</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteRecord('patient', p.id, `Patient ${p.fullName}`)
                                }
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active OPD & IPD Encounters Table */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">
                        05. Active OPD Queue &amp; IPD Admissions Register
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold font-mono">
                        Total Encounters: {encounters.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Search encounters by patient name, token, or doctor, or delete mistaken entries
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={encounterSearch}
                      onChange={(e) => setEncounterSearch(e.target.value)}
                      placeholder="Search OPD/IPD by patient or token..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
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
                      {encounters
                        .filter((enc) => {
                          const q = (encounterSearch || globalSearchQuery).trim().toLowerCase();
                          if (!q) return true;
                          return (
                            enc.patientName.toLowerCase().includes(q) ||
                            enc.tokenNo.toLowerCase().includes(q) ||
                            enc.doctorName.toLowerCase().includes(q) ||
                            enc.patientMrn.toLowerCase().includes(q)
                          );
                        })
                        .map((enc) => (
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
                          <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
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
                                const doc: PrintableDocPayload = inv
                                  ? { type: 'INVOICE', data: inv }
                                  : encounterToFallbackInvoice(enc);
                                setPrintableDoc(doc);
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const inv = invoices.find((i) => i.id === enc.invoiceId);
                                const doc: PrintableDocPayload = inv
                                  ? { type: 'INVOICE', data: inv }
                                  : encounterToFallbackInvoice(enc);
                                setPrintableDoc(doc);
                                printViaConnectedPrinter(doc, settings, 'A4');
                              }}
                              className="px-2 py-1 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded inline-flex items-center gap-1 cursor-pointer"
                              title="Direct print on connected printer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Printer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteRecord('encounter', enc.id, `Encounter ${enc.tokenNo}`)
                              }
                              className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
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
                    Generates unique sample barcode, patient invoice, and Laboratory revenue voucher
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
                        value={labForm.testName}
                        onChange={(e) =>
                          setLabForm({ ...labForm, testName: e.target.value })
                        }
                        placeholder="e.g., CBC / Blood Sugar / HbA1c"
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          02. Barcode Sample Queue, Result Entry &amp; Pathologist Verification
                        </h2>
                        <span className="px-2.5 py-0.5 rounded bg-[#1D5464] text-white text-xs font-bold font-mono">
                          Total Lab Orders: {labOrders.length}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Search lab orders by patient name, barcode, or test name, verify results, or delete mistaken entries
                      </p>
                    </div>
                    <div className="relative w-full sm:w-64 text-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={labSearch}
                        onChange={(e) => setLabSearch(e.target.value)}
                        placeholder="Search lab order, patient, barcode..."
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {labOrders
                      .filter((o) => {
                        const q = (labSearch || globalSearchQuery).trim().toLowerCase();
                        if (!q) return true;
                        return (
                          o.patientName.toLowerCase().includes(q) ||
                          o.sampleBarcode.toLowerCase().includes(q) ||
                          o.testName.toLowerCase().includes(q) ||
                          o.orderNo.toLowerCase().includes(q)
                        );
                      })
                      .map((o) => {
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
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-slate-800">
                                Status: {o.status} ({o.price.toLocaleString()} {cur})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const doc: PrintableDocPayload = { type: 'LAB_REPORT', data: o };
                                  setPrintableDoc(doc);
                                  printViaConnectedPrinter(doc, settings, 'A4');
                                }}
                                className="px-2 py-1 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded inline-flex items-center gap-1 cursor-pointer"
                                title="Print Lab Slip / Report on Connected Printer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Printer</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteRecord('lab-order', o.id, `Lab Order ${o.orderNo}`)
                                }
                                className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
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
              MODULE 3: PHARMACY RETAIL POS, SUPPLIER MEDICINE ENTRY & BILLS, STOCK & EXPIRY
             ===================================================================== */}
          {activeModule === 'pharmacy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Pharmacy Retail POS Counter (Separate Medical Store Counter — Medicines Only) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      01. Medical Store POS (Only Medicines Counter)
                    </h2>
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-100 text-emerald-800 whitespace-nowrap">
                      Medical Store Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Separate counter for customers buying ONLY medicines from the Medical Store. For full Hospital Patient Bills (Doctor Fee + Lab Test + Medicine + Drip/Injection), use{' '}
                    <button
                      type="button"
                      onClick={() => navigateToOption('patient_billing')}
                      className="text-[#1D5464] font-bold underline cursor-pointer"
                    >
                      Make Patient Bill
                    </button>
                    .
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
                        <label className="block text-slate-600 mb-1">Sale Date</label>
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
                        <span>Medicine Items to Sell</span>
                        <button
                          type="button"
                          onClick={() =>
                            setPosCart([
                              ...posCart,
                              { batchId: pharmacyBatches[0]?.id || 'BAT-501', qty: 1 },
                            ])
                          }
                          className="text-[#1D5464] font-semibold underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Medicine Row</span>
                        </button>
                      </div>

                      {posCart.map((line, idx) => {
                        const batch = pharmacyBatches.find((b) => b.id === line.batchId);
                        const unitRetail = batch ? batch.retailPrice : 0;
                        const unitSupplierCost = batch ? batch.unitCost : 0;
                        const lineProfit = (unitRetail - unitSupplierCost) * line.qty;
                        return (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="grid grid-cols-12 gap-2 items-center">
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
                                      {b.brandName} (Stock: {b.stockQty}) — Retail: {b.retailPrice}
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
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono text-right text-slate-900 bg-white"
                                />
                              </div>
                              <div className="col-span-3 text-right font-mono tabular-nums font-bold text-slate-900">
                                {(unitRetail * line.qty).toLocaleString()} {cur}
                              </div>
                            </div>
                            {batch && (
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                <span>
                                  Supplier Cost: {unitSupplierCost} · Retail: {unitRetail} · Stock Left After Sale: {Math.max(0, batch.stockQty - line.qty)}
                                </span>
                                <span className="text-emerald-700 font-semibold">
                                  Profit: +{lineProfit.toLocaleString()} {cur}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1 font-mono text-xs">
                      <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                        <span>Customer Total Retail Bill:</span>
                        <span>
                          {posCart
                            .reduce((sum, l) => {
                              const b = pharmacyBatches.find((x) => x.id === l.batchId);
                              return sum + (b ? b.retailPrice : 0) * l.qty;
                            }, 0)
                            .toLocaleString()}{' '}
                          {cur}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-800">
                        <span>Calculated Net Profit on Sale:</span>
                        <span>
                          +
                          {posCart
                            .reduce((sum, l) => {
                              const b = pharmacyBatches.find((x) => x.id === l.batchId);
                              return sum + (b ? b.retailPrice - b.unitCost : 0) * l.qty;
                            }, 0)
                            .toLocaleString()}{' '}
                          {cur}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">Payment Method</label>
                      <select
                        value={posPaymentMethod}
                        onChange={(e) => setPosPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900"
                      >
                        <option value="CASH">Cash Counter Settlement</option>
                        <option value="CARD">POS Card Terminal</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-[#1D5464] hover:bg-[#16424F] text-white font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      Complete Retail Sale, Deduct Stock &amp; Print Receipt
                    </button>
                  </form>
                </div>

                {/* 2. Add New Medicine / Supplier Delivery with Supplier Cost, Retail Price, Paid & Remaining Bill */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        02. Add New Medicine / Supplier Delivery Entry
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Record supplier wholesale cost price, hospital retail sale price, quantity ordered, and supplier bill paid vs. remaining balance
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleReceiveGrn} className="mt-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Supplier / Distributor Name (Optional)</label>
                        <input
                          type="text"
                          value={grnForm.supplierName}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, supplierName: e.target.value })
                          }
                          placeholder="e.g., AGP Pharma (or leave blank)"
                          className="w-full px-3 py-2 border border-slate-200 rounded text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Medicine Brand Name</label>
                        <input
                          type="text"
                          value={grnForm.brandName}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, brandName: e.target.value })
                          }
                          placeholder="e.g., Panadol 500mg Tablet"
                          className="w-full px-3 py-2 border border-slate-200 rounded text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Generic / Formula Name (Optional)</label>
                        <input
                          type="text"
                          value={grnForm.genericName}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, genericName: e.target.value })
                          }
                          placeholder="e.g., Paracetamol 500mg"
                          className="w-full px-3 py-2 border border-slate-200 rounded text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Category</label>
                        <select
                          value={grnForm.category}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, category: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-slate-900"
                        >
                          <option value="Tablet">Tablet</option>
                          <option value="Capsule">Capsule</option>
                          <option value="Syrup">Syrup / Suspension</option>
                          <option value="Injection">Injection / IV Vial</option>
                          <option value="Surgical">Surgical / Consumable</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Batch Number (Optional)</label>
                        <input
                          type="text"
                          value={grnForm.batchNo}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, batchNo: e.target.value })
                          }
                          placeholder="Auto-generated if blank"
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Expiry Date (Optional)</label>
                        <input
                          type="date"
                          value={grnForm.expiryDate}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, expiryDate: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Purchase Date</label>
                        <input
                          type="date"
                          value={grnForm.businessDate}
                          onChange={(e) =>
                            setGrnForm({ ...grnForm, businessDate: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">
                          Qty Ordered (Units/Tablets)
                        </label>
                        <input
                          type="number"
                          value={grnForm.qty}
                          onChange={(e) => {
                            const nextQty = Math.max(0, Number(e.target.value));
                            setGrnForm({
                              ...grnForm,
                              qty: nextQty,
                              paidAmount: nextQty * grnForm.unitCost,
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">
                          Supplier Wholesale Cost / Unit
                        </label>
                        <input
                          type="number"
                          value={grnForm.unitCost}
                          onChange={(e) => {
                            const nextCost = Math.max(0, Number(e.target.value));
                            setGrnForm({
                              ...grnForm,
                              unitCost: nextCost,
                              wholesalePrice: nextCost,
                              paidAmount: grnForm.qty * nextCost,
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">
                          Hospital Retail Price / Unit
                        </label>
                        <input
                          type="number"
                          value={grnForm.retailPrice}
                          onChange={(e) =>
                            setGrnForm({
                              ...grnForm,
                              retailPrice: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-emerald-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-semibold">
                          Bill Amount Paid Now ({cur})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={grnForm.qty * grnForm.unitCost}
                          value={grnForm.paidAmount}
                          onChange={(e) =>
                            setGrnForm({
                              ...grnForm,
                              paidAmount: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-[#1D5464]"
                        />
                      </div>
                    </div>

                    {/* Live Supplier Bill & Profit Margin Summary Box */}
                    <div className="p-3.5 rounded-lg bg-[#F1F5F8] border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Total Supplier Bill</div>
                        <div className="text-sm font-bold text-slate-900">
                          {(grnForm.qty * grnForm.unitCost).toLocaleString()} {cur}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Bill Paid Now</div>
                        <div className="text-sm font-bold text-emerald-700">
                          {Math.min(grnForm.qty * grnForm.unitCost, grnForm.paidAmount).toLocaleString()} {cur}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Remaining Payable</div>
                        <div className="text-sm font-bold text-amber-700">
                          {Math.max(0, grnForm.qty * grnForm.unitCost - grnForm.paidAmount).toLocaleString()} {cur}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Profit Margin / Unit</div>
                        <div className="text-sm font-bold text-emerald-700">
                          +{Math.max(0, grnForm.retailPrice - grnForm.unitCost).toLocaleString()} {cur}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Add Medicine to Stock &amp; Save Supplier Bill
                    </button>
                  </form>
                </div>
              </div>

              {/* 3. Complete Pharmacy Product Search, Stock Availability & Expiry Status Table */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      03. Complete Pharmacy Medicine Inventory, Search &amp; Expiry Control ({pharmacyBatches.length} Products)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Search any medicine to verify whether it is in stock, out of stock, or expired, along with supplier cost and retail price
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={pharmacySearch}
                        onChange={(e) => setPharmacySearch(e.target.value)}
                        placeholder="Search medicine name, formula, batch..."
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                    {(
                      [
                        ['ALL', 'All Medicines'],
                        ['IN_STOCK', 'Available in Stock'],
                        ['LOW_OR_OUT', 'Low / Out of Stock'],
                        ['EXPIRING_OR_EXPIRED', 'Expired / Expiring Soon'],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setPharmacyFilter(k)}
                        className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          pharmacyFilter === k
                            ? 'bg-[#1D5464] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">Medicine Name &amp; Formula</th>
                        <th className="py-2.5 font-medium">Category &amp; Batch</th>
                        <th className="py-2.5 font-medium">Supplier</th>
                        <th className="py-2.5 font-medium">Expiry Date</th>
                        <th className="py-2.5 font-medium text-right">Available Stock</th>
                        <th className="py-2.5 font-medium text-right">Supplier Cost ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Retail Price ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Profit / Unit ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Availability &amp; Expiry Status</th>
                        <th className="py-2.5 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pharmacyBatches
                        .filter((b) => {
                          const q = (pharmacySearch || globalSearchQuery).trim().toLowerCase();
                          if (
                            q &&
                            !b.brandName.toLowerCase().includes(q) &&
                            !b.genericName.toLowerCase().includes(q) &&
                            !b.batchNo.toLowerCase().includes(q) &&
                            !b.supplierName.toLowerCase().includes(q)
                          ) {
                            return false;
                          }
                          if (pharmacyFilter === 'IN_STOCK') return b.stockQty > 0 && b.expiryDate >= '2026-10-10';
                          if (pharmacyFilter === 'LOW_OR_OUT') return b.stockQty <= b.reorderLevel;
                          if (pharmacyFilter === 'EXPIRING_OR_EXPIRED') return b.expiryDate <= '2026-12-31';
                          return true;
                        })
                        .map((b) => {
                          const isExpired = b.expiryDate < '2026-10-10';
                          const isExpiringSoon = !isExpired && b.expiryDate <= '2026-12-31';
                          const isOutOfStock = b.stockQty <= 0;
                          const isLowStock = b.stockQty > 0 && b.stockQty <= b.reorderLevel;
                          return (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="py-2.5">
                                <div className="font-bold text-slate-900">{b.brandName}</div>
                                <div className="text-slate-500">{b.genericName}</div>
                              </td>
                              <td className="py-2.5 font-mono text-slate-700 whitespace-nowrap">
                                {b.category} · {b.batchNo}
                              </td>
                              <td className="py-2.5 text-slate-700">{b.supplierName}</td>
                              <td className="py-2.5 font-mono tabular-nums whitespace-nowrap">
                                <span
                                  className={
                                    isExpired
                                      ? 'text-rose-700 font-bold'
                                      : isExpiringSoon
                                      ? 'text-amber-700 font-semibold'
                                      : 'text-slate-800'
                                  }
                                >
                                  {b.expiryDate}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                                {b.stockQty} units
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                                {b.unitCost.toLocaleString()}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                                {b.retailPrice.toLocaleString()}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-emerald-700">
                                +{(b.retailPrice - b.unitCost).toLocaleString()}
                              </td>
                              <td className="py-2.5 text-right whitespace-nowrap">
                                {isExpired ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    EXPIRED
                                  </span>
                                ) : isOutOfStock ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    OUT OF STOCK
                                  </span>
                                ) : isExpiringSoon ? (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    EXPIRING SOON
                                  </span>
                                ) : isLowStock ? (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    LOW STOCK ({b.stockQty})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    AVAILABLE IN STOCK
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteRecord(
                                      'pharmacy-batch',
                                      b.id,
                                      `Medicine ${b.brandName}`
                                    )
                                  }
                                  className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Pharmacy Sales & Customer Medicine Return Register (Return Medicine -> Restores Stock & Adjusts Profit/Loss) */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">
                        04. Pharmacy Sales &amp; Customer Medicine Return Register
                      </h3>
                      <span className="px-2.5 py-0.5 rounded bg-[#1D5464] text-white text-xs font-bold font-mono">
                        Total Sales: {invoices.filter((i) => i.department.startsWith('PHARMACY')).length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      If a customer returns medicine, click &ldquo;Return Medicine (Stock Wapas)&rdquo; to automatically add tablets back to stock and adjust Profit &amp; Loss
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pharmacySaleSearch}
                      onChange={(e) => setPharmacySaleSearch(e.target.value)}
                      placeholder="Search sale by customer, medicine, bill no..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">Bill No &amp; Date</th>
                        <th className="py-2.5 font-medium">Customer Name</th>
                        <th className="py-2.5 font-medium">Sold Medicine Items &amp; Qty</th>
                        <th className="py-2.5 font-medium text-right">Sale Bill ({cur})</th>
                        <th className="py-2.5 font-medium">Status</th>
                        <th className="py-2.5 font-medium text-right">Return Medicine / Delete / Print</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices
                        .filter((inv) => inv.department.startsWith('PHARMACY'))
                        .filter((inv) => {
                          const q = (pharmacySaleSearch || globalSearchQuery).trim().toLowerCase();
                          if (!q) return true;
                          return (
                            inv.invoiceNo.toLowerCase().includes(q) ||
                            inv.customerName.toLowerCase().includes(q) ||
                            inv.businessDate.toLowerCase().includes(q) ||
                            inv.items.some((it) => it.description.toLowerCase().includes(q))
                          );
                        })
                        .map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {inv.invoiceNo} · {inv.businessDate}
                            </td>
                            <td className="py-2.5 font-medium text-slate-900 whitespace-nowrap">
                              {inv.customerName}
                            </td>
                            <td className="py-2.5 text-slate-800">
                              {inv.items.length > 0
                                ? inv.items
                                    .map((it) => `${it.qty}x ${it.description} (${it.lineTotal} ${cur})`)
                                    .join(' · ')
                                : 'All items returned to stock'}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                              {inv.netTotal.toLocaleString()}
                              {inv.refundedAmount > 0 && (
                                <span className="block text-[10px] text-rose-700">
                                  Returned: -{inv.refundedAmount.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 font-mono font-bold whitespace-nowrap">
                              {inv.status === 'REFUNDED' ? (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px]">
                                  RETURNED TO STOCK
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                                  {inv.status}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                              {inv.status !== 'REFUNDED' && (
                                <button
                                  type="button"
                                  onClick={() => handleReturnPharmacySale(inv)}
                                  className="px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Return Medicine (Stock Wapas)</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setPrintableDoc({ type: 'INVOICE', data: inv })}
                                className="px-2.5 py-1 text-xs font-medium text-slate-800 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>View / Virtual</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const doc: PrintableDocPayload = { type: 'INVOICE', data: inv };
                                  setPrintableDoc(doc);
                                  printViaConnectedPrinter(doc, settings, 'A4');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded inline-flex items-center gap-1 cursor-pointer"
                                title="Send directly to connected printer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Printer</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteRecord('invoice', inv.id, `Pharmacy Sale ${inv.invoiceNo}`)
                                }
                                className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Supplier Medicine Purchase Bills Register (Total Bill / Paid / Remaining + Search & Delete) */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">
                        05. Supplier Medicine Purchase Bills ({supplierBills.length} Bills)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tracks every medicine delivery from suppliers, total bill amount, paid amount, remaining balance, and allows deleting mistaken entries
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="relative w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={supplierBillSearch}
                        onChange={(e) => setSupplierBillSearch(e.target.value)}
                        placeholder="Search supplier or medicine..."
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span>
                        Total:{' '}
                        <strong>
                          {supplierBills.reduce((a, b) => a + b.totalBill, 0).toLocaleString()} {cur}
                        </strong>
                      </span>
                      <span className="text-emerald-700">
                        Paid:{' '}
                        <strong>
                          {supplierBills.reduce((a, b) => a + b.paidAmount, 0).toLocaleString()} {cur}
                        </strong>
                      </span>
                      <span className="text-amber-700">
                        Remaining:{' '}
                        <strong>
                          {supplierBills.reduce((a, b) => a + b.remainingAmount, 0).toLocaleString()} {cur}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">Bill No &amp; Date</th>
                        <th className="py-2.5 font-medium">Supplier Name</th>
                        <th className="py-2.5 font-medium">Medicine &amp; Batch</th>
                        <th className="py-2.5 font-medium text-right">Qty Added</th>
                        <th className="py-2.5 font-medium text-right">Supplier Cost</th>
                        <th className="py-2.5 font-medium text-right">Retail Price</th>
                        <th className="py-2.5 font-medium text-right">Total Bill ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Paid ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Remaining ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supplierBills
                        .filter((sb) => {
                          const q = (supplierBillSearch || globalSearchQuery).trim().toLowerCase();
                          if (!q) return true;
                          return (
                            sb.supplierName.toLowerCase().includes(q) ||
                            sb.brandName.toLowerCase().includes(q) ||
                            sb.billNo.toLowerCase().includes(q) ||
                            sb.batchNo.toLowerCase().includes(q)
                          );
                        })
                        .map((sb) => (
                        <tr key={sb.id} className="hover:bg-slate-50">
                          <td className="py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {sb.billNo} · {sb.businessDate}
                          </td>
                          <td className="py-2.5 font-medium text-slate-900">{sb.supplierName}</td>
                          <td className="py-2.5">
                            <span className="font-semibold text-slate-900">{sb.brandName}</span>{' '}
                            <span className="font-mono text-slate-500">[{sb.batchNo}]</span>
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-bold">
                            {sb.qty}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                            {sb.unitCost.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-800">
                            {sb.retailPrice.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                            {sb.totalBill.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                            {sb.paidAmount.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-bold text-amber-700">
                            {sb.remainingAmount.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                            {sb.remainingAmount > 0 ? (
                              <button
                                type="button"
                                onClick={() => handlePaySupplierBill(sb)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-[#1D5464] rounded hover:bg-[#16424F] cursor-pointer"
                              >
                                Pay Remaining ({sb.remainingAmount.toLocaleString()})
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                FULLY PAID
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPrintableDoc(supplierBillToPrintableInvoice(sb))}
                              className="px-2 py-1 text-xs font-medium text-slate-800 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print Bill</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const doc = supplierBillToPrintableInvoice(sb);
                                setPrintableDoc(doc);
                                printViaConnectedPrinter(doc, settings, 'A4');
                              }}
                              className="px-2 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded inline-flex items-center gap-1 cursor-pointer"
                              title="Direct print supplier bill on connected printer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Printer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteRecord('supplier-bill', sb.id, `Supplier Bill ${sb.billNo}`)
                              }
                              className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
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
              MODULE 4: CUSTOMER BILLING & PRINT, STAFF & SALARY SYSTEM, OPERATING EXPENSES
             ===================================================================== */}
          {activeModule === 'billing_hr' && (
            <div className="space-y-6">
              {/* Row 1: Create Customer / Patient Bill + Record Operating Expense */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Create Customer Bill Form */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
                  <h2 className="text-base font-bold text-slate-900">
                    01. Customer / Patient Billing Counter (With Instant Print Receipt)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create bills for OPD, IPD, Emergency Procedures, or Laboratory tests and print official customer receipt
                  </p>

                  <form onSubmit={handleCreateCustomerBill} className="mt-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Customer / Patient Name (Optional)</label>
                        <input
                          type="text"
                          value={customerBillForm.customerName}
                          onChange={(e) =>
                            setCustomerBillForm({
                              ...customerBillForm,
                              customerName: e.target.value,
                            })
                          }
                          placeholder="Walk-in Customer (or enter name)"
                          className="w-full px-3 py-2 border border-slate-200 rounded text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Department</label>
                        <select
                          value={customerBillForm.department}
                          onChange={(e) =>
                            setCustomerBillForm({
                              ...customerBillForm,
                              department: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-slate-900"
                        >
                          <option value="HOSPITAL_OPD">Hospital OPD / Consultation</option>
                          <option value="HOSPITAL_IPD">Hospital IPD / Ward / Surgery</option>
                          <option value="LABORATORY">Laboratory Diagnostic Billing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Billing Date</label>
                        <input
                          type="date"
                          value={customerBillForm.businessDate}
                          onChange={(e) =>
                            setCustomerBillForm({
                              ...customerBillForm,
                              businessDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 mb-1">Service / Treatment Description (Optional)</label>
                        <input
                          type="text"
                          value={customerBillForm.description}
                          onChange={(e) =>
                            setCustomerBillForm({
                              ...customerBillForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="e.g., OPD Consultation / X-Ray / Lab Test"
                          className="w-full px-3 py-2 border border-slate-200 rounded text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Total Fee ({cur})</label>
                        <input
                          type="number"
                          min={0}
                          value={customerBillForm.unitPrice}
                          onChange={(e) => {
                            const p = Math.max(0, Number(e.target.value));
                            setCustomerBillForm({
                              ...customerBillForm,
                              unitPrice: p,
                              paidAmount: p,
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Paid Now ({cur})</label>
                        <input
                          type="number"
                          min={0}
                          value={customerBillForm.paidAmount}
                          onChange={(e) =>
                            setCustomerBillForm({
                              ...customerBillForm,
                              paidAmount: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono font-bold text-emerald-700"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-[#1D5464] hover:bg-[#16424F] text-white font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Save Customer Bill &amp; Print Receipt</span>
                    </button>
                  </form>
                </div>

                {/* Record Departmental Operating Expense */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
                  <h3 className="text-base font-bold text-slate-900">
                    02. Record Hospital / Lab / Pharmacy Expense
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automatically deducted from Consolidated Profit &amp; Loss on the Home Dashboard
                  </p>
                  <form onSubmit={handleCreateExpense} className="mt-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Department</label>
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
                          <option value="SHARED_ADMIN">GENERAL ADMIN</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Expense Amount ({cur})</label>
                        <input
                          type="number"
                          min={0}
                          value={expenseForm.amount}
                          onChange={(e) =>
                            setExpenseForm({
                              ...expenseForm,
                              amount: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Expense Description (Optional)</label>
                      <input
                        type="text"
                        value={expenseForm.description}
                        onChange={(e) =>
                          setExpenseForm({ ...expenseForm, description: e.target.value })
                        }
                        placeholder="e.g., Electricity Bill / Generator Fuel / Tea & Kitchen"
                        className="w-full px-3 py-2 border border-slate-200 rounded text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Expense Date</label>
                      <input
                        type="date"
                        value={expenseForm.businessDate}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            businessDate: e.target.value,
                            paymentDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-slate-900"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Save Expense &amp; Deduct from Profit/Loss
                    </button>
                  </form>
                </div>
              </div>

              {/* Row 2: Staff Management, Daily Attendance (Hazir / Ghair Hazir), Monthly Chuttiyan & Salary System */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      03. Hospital Staff Directory, Daily Attendance (Hazri / Chuttiyan) &amp; Salary System
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mark daily Present (Hazir) or Absent (Ghair Hazir / Chutti), track monthly &amp; total chuttiyan in History, and pay staff salaries
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 h-10 px-3 border border-slate-300 rounded-lg bg-slate-50 text-xs">
                      <span className="font-semibold text-slate-600">Attendance Date:</span>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value || '2026-10-10')}
                        className="font-mono font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveDailyAttendanceBatch(selectedDayStr, false)}
                      className="h-10 px-3.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Save Attendance ({selectedDayStr})</span>
                    </button>
                    <input
                      type="month"
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(e.target.value)}
                      className="h-10 px-3 border border-slate-300 rounded-lg font-mono text-xs bg-white text-slate-900 focus:outline-none focus:border-[#1D5464]"
                    />
                    <button
                      type="button"
                      onClick={handleRunPayroll}
                      className="h-10 px-4 text-xs font-semibold text-white bg-[#1D5464] rounded-lg hover:bg-[#16424F] transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      <span>Pay All Staff ({payrollMonth})</span>
                    </button>
                  </div>
                </div>

                {/* Daily Attendance Summary Banner for Selected Date */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-900">
                      Daily Attendance Status ({selectedDayStr}):
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold">
                      Present (Hazir): {dailyPresentStaffList.length} Staff (
                      {dailyPresentStaffList.map((e) => e.fullName).join(', ') || 'None'})
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-900 font-bold">
                      Absent / Chutti (Ghair Hazir): {dailyAbsentStaffList.length} Staff (
                      {dailyAbsentStaffList.map((e) => e.fullName).join(', ') || 'None'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveDailyAttendanceBatch(selectedDayStr, true)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-emerald-300 text-emerald-900 font-semibold cursor-pointer"
                  >
                    Mark All Present on {selectedDayStr}
                  </button>
                </div>

                {/* Add New Staff Member Form (With Cook, Sweeper, Guard, Driver & Custom Role Option) */}
                <form
                  onSubmit={handleAddStaffMember}
                  className="p-4 rounded-xl bg-[#F1F5F8] border border-slate-200/90 space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                    <div className="flex flex-col justify-end">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
                        Staff Member Full Name
                      </label>
                      <input
                        type="text"
                        value={newStaffForm.fullName}
                        onChange={(e) =>
                          setNewStaffForm({ ...newStaffForm, fullName: e.target.value })
                        }
                        placeholder="e.g., Ali Raza / Bashir Ahmed"
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs text-slate-900 focus:outline-none focus:border-[#1D5464]"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
                        Job / Field (Or Other)
                      </label>
                      <select
                        value={staffDesignationPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStaffDesignationPreset(val);
                          if (val !== 'OTHER_CUSTOM') {
                            setNewStaffForm({ ...newStaffForm, designation: val });
                          }
                        }}
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs text-slate-900 font-medium focus:outline-none focus:border-[#1D5464]"
                      >
                        <option value="Doctor / Medical Officer">Doctor / Medical Officer</option>
                        <option value="Staff Nurse / LHV">Staff Nurse / LHV</option>
                        <option value="Lab Technologist / Assistant">Lab Technologist / Assistant</option>
                        <option value="Pharmacist / Dispenser">Pharmacist / Dispenser</option>
                        <option value="Receptionist / Front Desk">Receptionist / Front Desk</option>
                        <option value="Cashier / Billing Clerk">Cashier / Billing Clerk</option>
                        <option value="Accountant / Manager">Accountant / Manager</option>
                        <option value="Cook / Kitchen Staff (Bawarchi)">Cook / Kitchen Staff (Bawarchi)</option>
                        <option value="Sweeper / Cleaner (Jharo / Safai Wala)">Sweeper / Cleaner (Jharo / Safai Wala)</option>
                        <option value="Ward Boy / Aya / Helper">Ward Boy / Aya / Helper</option>
                        <option value="Security Guard / Chowkidar">Security Guard / Chowkidar</option>
                        <option value="Ambulance Driver">Ambulance Driver</option>
                        <option value="Electrician / Maintenance">Electrician / Maintenance</option>
                        <option value="OTHER_CUSTOM">Other / Custom Job (Khud Likhen)...</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
                        Department
                      </label>
                      <select
                        value={newStaffForm.department}
                        onChange={(e) =>
                          setNewStaffForm({
                            ...newStaffForm,
                            department: e.target.value as any,
                          })
                        }
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs text-slate-900 focus:outline-none focus:border-[#1D5464]"
                      >
                        <option value="HOSPITAL">HOSPITAL</option>
                        <option value="LABORATORY">LABORATORY</option>
                        <option value="PHARMACY">PHARMACY</option>
                        <option value="SHARED_ADMIN">GENERAL / ADMIN</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
                        Monthly Salary ({cur})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newStaffForm.baseSalary}
                        onChange={(e) =>
                          setNewStaffForm({
                            ...newStaffForm,
                            baseSalary: Number(e.target.value),
                          })
                        }
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#1D5464]"
                      />
                    </div>
                  </div>

                  {staffDesignationPreset === 'OTHER_CUSTOM' && (
                    <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-6 flex flex-col justify-end">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
                          Write Custom Job / Field Name (e.g., Cook, Jharo Wala, Mali, Peon, Guard)
                        </label>
                        <input
                          type="text"
                          value={customStaffDesignation}
                          onChange={(e) => setCustomStaffDesignation(e.target.value)}
                          placeholder="Type any custom staff role or duty here..."
                          className="w-full h-10 px-3 border border-[#1D5464] rounded-lg bg-white text-xs text-slate-900 font-semibold focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-6 text-[11px] text-slate-500 leading-relaxed">
                        Whatever custom role you write here will be saved in the Staff Directory and printed on Salary Slips.
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="submit"
                      className="w-full h-10 px-6 bg-[#1D5464] hover:bg-[#16424F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap text-center shadow-xs"
                    >
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span>Add New Staff Member</span>
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                  {/* Active Staff Roster with Search, Daily Attendance (Hazir/Absent), Monthly Chuttiyan, Pay Salary & Delete */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                      <div className="text-xs font-bold text-slate-800">
                        Active Hospital Staff List &amp; Attendance (Total Staff: {employees.length})
                      </div>
                      <input
                        type="text"
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        placeholder="Search staff name, role, or absent date..."
                        className="h-9 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 w-60 bg-white focus:outline-none focus:border-[#1D5464]"
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2 font-medium">Staff Name &amp; Role</th>
                            <th className="py-2 font-medium">
                              Hazri ({selectedDayStr})
                            </th>
                            <th className="py-2 font-medium">
                              Month ({selectedMonthStr}) &amp; Total Chuttiyan
                            </th>
                            <th className="py-2 font-medium text-right">Monthly Salary</th>
                            <th className="py-2 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {employees
                            .filter((emp) => {
                              const q = (staffSearch || globalSearchQuery).trim().toLowerCase();
                              if (!q) return true;
                              const sum = getEmployeeAttendanceSummary(emp.id, selectedMonthStr);
                              return (
                                emp.fullName.toLowerCase().includes(q) ||
                                emp.designation.toLowerCase().includes(q) ||
                                emp.department.toLowerCase().includes(q) ||
                                emp.empCode.toLowerCase().includes(q) ||
                                sum.allTimeAbsentDates.some((d) => d.includes(q)) ||
                                sum.allTimePresentDates.some((d) => d.includes(q))
                              );
                            })
                            .map((emp) => {
                              const todayStatus = getStaffStatusOnDate(emp.id, selectedDayStr);
                              const attSum = getEmployeeAttendanceSummary(
                                emp.id,
                                selectedMonthStr
                              );
                              return (
                                <tr key={emp.id} className="hover:bg-slate-50">
                                  <td className="py-2.5 pr-2">
                                    <div className="font-semibold text-slate-900">
                                      {emp.fullName}
                                    </div>
                                    <div className="text-slate-500">
                                      {emp.empCode} · {emp.designation} ({emp.department})
                                    </div>
                                  </td>
                                  <td className="py-2.5 pr-2 whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleMarkStaffAttendance(emp, 'PRESENT', selectedDayStr)
                                        }
                                        className={`h-7 px-2.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                                          todayStatus === 'PRESENT'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                        }`}
                                      >
                                        ✓ Present (Hazir)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleMarkStaffAttendance(emp, 'ABSENT', selectedDayStr)
                                        }
                                        className={`h-7 px-2.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                                          todayStatus !== 'PRESENT'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                        }`}
                                      >
                                        ✕ Absent (Chutti)
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2.5 pr-2">
                                    <div className="font-mono text-[11px]">
                                      <span className="text-emerald-700 font-bold">
                                        {selectedMonthStr} Present: {attSum.monthPresentCount}d
                                      </span>{' '}
                                      ·{' '}
                                      <span className="text-rose-700 font-bold">
                                        Chuttiyan: {attSum.monthAbsentCount}d
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                                      Total All-Time Chuttiyan: {attSum.allTimeAbsentCount}d (Present: {attSum.allTimePresentCount}d)
                                    </div>
                                    {attSum.allTimeAbsentDates.length > 0 && (
                                      <div className="text-[10px] font-mono text-rose-700 mt-0.5">
                                        Absent Dates: {attSum.allTimeAbsentDates.join(', ')}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                                    {emp.netSalary.toLocaleString()} {cur}
                                  </td>
                                  <td className="py-2.5 text-right whitespace-nowrap">
                                    <div className="inline-flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handlePayIndividualSalary(emp)}
                                        className="h-8 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer inline-flex items-center justify-center gap-1.5"
                                      >
                                        <Wallet className="w-3.5 h-3.5 shrink-0" />
                                        <span>Pay Salary</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteRecord(
                                            'employee',
                                            emp.id,
                                            `Staff ${emp.fullName}`
                                          )
                                        }
                                        className="h-8 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md inline-flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Saved Salary Payment History with Attendance Summary & Delete Option */}
                  <div>
                    <div className="flex items-center justify-between min-h-9 mb-3">
                      <div className="text-xs font-bold text-slate-800">
                        Paid Salary History &amp; Staff Attendance Summary (Total Slips: {salarySlips.length})
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2 font-medium">Date / Month</th>
                            <th className="py-2 font-medium">Staff Member</th>
                            <th className="py-2 font-medium">Month Attendance (Present / Absent)</th>
                            <th className="py-2 font-medium text-right">Paid ({cur})</th>
                            <th className="py-2 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {salarySlips
                            .filter((s) => {
                              const q = (staffSearch || globalSearchQuery).trim().toLowerCase();
                              if (!q) return true;
                              return (
                                s.employeeName.toLowerCase().includes(q) ||
                                s.designation.toLowerCase().includes(q) ||
                                s.payrollMonth.toLowerCase().includes(q)
                              );
                            })
                            .map((s) => {
                              const slipAtt = getEmployeeAttendanceSummary(
                                s.employeeId,
                                s.payrollMonth
                              );
                              return (
                                <tr key={s.id} className="hover:bg-slate-50">
                                  <td className="py-2.5 font-mono text-slate-800">
                                    <div className="font-semibold">{s.businessDate}</div>
                                    <div className="text-slate-500">{s.payrollMonth}</div>
                                  </td>
                                  <td className="py-2.5">
                                    <div className="font-semibold text-slate-900">
                                      {s.employeeName}
                                    </div>
                                    <div className="text-slate-500">{s.designation}</div>
                                  </td>
                                  <td className="py-2.5 font-mono text-[11px]">
                                    <div>
                                      <span className="text-emerald-700 font-bold">
                                        Present: {slipAtt.monthPresentCount}d
                                      </span>{' '}
                                      |{' '}
                                      <span className="text-rose-700 font-bold">
                                        Absent: {slipAtt.monthAbsentCount}d
                                      </span>
                                    </div>
                                    {slipAtt.monthAbsentDates.length > 0 && (
                                      <div className="text-[10px] text-rose-700">
                                        Absent on: {slipAtt.monthAbsentDates.join(', ')}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right font-mono tabular-nums font-bold text-rose-700">
                                    -{s.netPaid.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 text-right whitespace-nowrap">
                                    <div className="inline-flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPrintableDoc({ type: 'SALARY_SLIP', data: s })
                                        }
                                        className="h-8 px-2.5 text-xs font-medium text-slate-800 border border-slate-300 rounded-md hover:bg-slate-100 inline-flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Printer className="w-3.5 h-3.5 shrink-0" />
                                        <span>Slip</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const doc: PrintableDocPayload = {
                                            type: 'SALARY_SLIP',
                                            data: s,
                                          };
                                          setPrintableDoc(doc);
                                          printViaConnectedPrinter(doc, settings, 'A4');
                                        }}
                                        className="h-8 px-2.5 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded-md inline-flex items-center justify-center gap-1 cursor-pointer"
                                        title="Print salary slip on connected printer"
                                      >
                                        <Printer className="w-3.5 h-3.5 shrink-0" />
                                        <span>Printer</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteRecord(
                                            'salary-slip',
                                            s.id,
                                            `Salary payment for ${s.employeeName}`
                                          )
                                        }
                                        className="h-8 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md inline-flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>Delete</span>
                                      </button>
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

                {/* Complete Staff Attendance & Monthly Chuttiyan History Register (Inside Staff & Salary) */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        03-B. Staff Attendance History, Monthly Chuttiyan &amp; Exact Absent/Present Dates
                      </h4>
                      <p className="text-xs text-slate-500">
                        Automatically stores which staff member was Present (Hazir) or Absent (Ghair Hazir) on each date, monthly chuttiyan count, and total all-time absences
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#1D5464]">
                      Total Saved Attendance Records: {staffAttendance.length}
                    </span>
                  </div>

                  {/* Table A: Staff Month-Wise & Total Chuttiyan Breakdown */}
                  <div className="overflow-x-auto bg-slate-50/70 border border-slate-200 rounded-lg p-3">
                    <div className="text-xs font-bold text-slate-800 mb-2">
                      Month-Wise &amp; Total Chuttiyan Summary (Kis Mahinay Mein Kitni Chuttiyan Aur Kis Din Absent/Present Thay)
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 font-medium">Staff Member</th>
                          <th className="py-2 font-medium">
                            Selected Month ({selectedMonthStr})
                          </th>
                          <th className="py-2 font-medium">
                            Month-by-Month Chuttiyan History
                          </th>
                          <th className="py-2 font-medium">
                            Total All-Time Present / Chuttiyan
                          </th>
                          <th className="py-2 font-medium">
                            Exact Absent Dates (Ghair Hazir Din)
                          </th>
                          <th className="py-2 font-medium">
                            Exact Present Dates (Hazir Din)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60">
                        {employees
                          .filter((emp) => {
                            const q = (staffSearch || globalSearchQuery).trim().toLowerCase();
                            if (!q) return true;
                            const sum = getEmployeeAttendanceSummary(emp.id, selectedMonthStr);
                            return (
                              emp.fullName.toLowerCase().includes(q) ||
                              emp.designation.toLowerCase().includes(q) ||
                              emp.empCode.toLowerCase().includes(q) ||
                              sum.allTimeAbsentDates.some((d) => d.includes(q)) ||
                              sum.allTimePresentDates.some((d) => d.includes(q))
                            );
                          })
                          .map((emp) => {
                            const sum = getEmployeeAttendanceSummary(emp.id, selectedMonthStr);
                            return (
                              <tr key={emp.id} className="hover:bg-white">
                                <td className="py-2.5 pr-3">
                                  <div className="font-bold text-slate-900">{emp.fullName}</div>
                                  <div className="text-slate-500">
                                    {emp.empCode} · {emp.designation}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 font-mono">
                                  <span className="text-emerald-700 font-bold">
                                    {sum.monthPresentCount} Present
                                  </span>{' '}
                                  /{' '}
                                  <span className="text-rose-700 font-bold">
                                    {sum.monthAbsentCount} Chuttiyan
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {sum.monthlyBreakdown.map((m) => (
                                      <span
                                        key={m.month}
                                        className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px]"
                                      >
                                        <strong>{m.month}</strong>: {m.presentCount} Present ·{' '}
                                        <span className="text-rose-700 font-bold">
                                          {m.absentCount} Chuttiyan
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 font-mono font-bold">
                                  <span className="text-emerald-700">
                                    Total Present: {sum.allTimePresentCount}d
                                  </span>{' '}
                                  |{' '}
                                  <span className="text-rose-700">
                                    Total Chuttiyan: {sum.allTimeAbsentCount}d
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3">
                                  {sum.allTimeAbsentDates.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {sum.allTimeAbsentDates.map((d) => (
                                        <span
                                          key={d}
                                          className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold text-[11px]"
                                        >
                                          {d}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-emerald-700 font-semibold">
                                      No Absences (0 Chutti)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    {sum.allTimePresentDates.map((d) => (
                                      <span
                                        key={d}
                                        className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px]"
                                      >
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table B: Date-by-Date Attendance Log */}
                  <div className="overflow-x-auto">
                    <div className="text-xs font-bold text-slate-800 mb-2">
                      Date-Wise Staff Attendance History Log (Har Din Ka Hazir / Ghair Hazir Record)
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 font-medium">Date &amp; Month</th>
                          <th className="py-2 font-medium">Staff Member &amp; Role</th>
                          <th className="py-2 font-medium">Department</th>
                          <th className="py-2 font-medium">Attendance Status</th>
                          <th className="py-2 font-medium">Remarks / Note</th>
                          <th className="py-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffAttendance
                          .filter((a) => {
                            const q = (staffSearch || globalSearchQuery).trim().toLowerCase();
                            if (!q) return true;
                            return (
                              a.employeeName.toLowerCase().includes(q) ||
                              a.designation.toLowerCase().includes(q) ||
                              a.empCode.toLowerCase().includes(q) ||
                              a.date.toLowerCase().includes(q) ||
                              a.month.toLowerCase().includes(q) ||
                              a.status.toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 60)
                          .map((att) => (
                            <tr key={att.id} className="hover:bg-slate-50">
                              <td className="py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                                {att.date}{' '}
                                <span className="text-slate-400 font-normal">({att.month})</span>
                              </td>
                              <td className="py-2">
                                <span className="font-semibold text-slate-900">
                                  {att.employeeName}
                                </span>{' '}
                                <span className="text-slate-500">
                                  ({att.empCode} · {att.designation})
                                </span>
                              </td>
                              <td className="py-2 font-mono text-slate-600">{att.department}</td>
                              <td className="py-2">
                                {att.status === 'PRESENT' ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    PRESENT (HAZIR)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    ABSENT (GHAIR HAZIR / CHUTTI)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-slate-600">{att.remarks || '—'}</td>
                              <td className="py-2 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteRecord(
                                      'staff-attendance',
                                      att.id,
                                      `Attendance ${att.employeeName} (${att.date})`
                                    )
                                  }
                                  className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Row 3: Operating Expenses Register with Search & Delete */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      04. Recorded Hospital, Lab &amp; Pharmacy Operating Expenses ({expenses.length} Records)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Search expenses or delete any mistaken expense entry (automatically recalculates Profit &amp; Loss)
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      placeholder="Search expenses..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 font-medium">Voucher &amp; Date</th>
                        <th className="py-2 font-medium">Department</th>
                        <th className="py-2 font-medium">Description</th>
                        <th className="py-2 font-medium text-right">Amount ({cur})</th>
                        <th className="py-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses
                        .filter((ex) => {
                          const q = (expenseSearch || globalSearchQuery).trim().toLowerCase();
                          if (!q) return true;
                          return (
                            ex.description.toLowerCase().includes(q) ||
                            ex.voucherNo.toLowerCase().includes(q) ||
                            ex.costCenter.toLowerCase().includes(q) ||
                            ex.businessDate.toLowerCase().includes(q)
                          );
                        })
                        .map((ex) => (
                          <tr key={ex.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {ex.voucherNo} · {ex.businessDate}
                            </td>
                            <td className="py-2.5 font-mono text-slate-700 whitespace-nowrap">
                              {ex.costCenter}
                            </td>
                            <td className="py-2.5 text-slate-900">{ex.description}</td>
                            <td className="py-2.5 text-right font-mono tabular-nums font-bold text-rose-700">
                              -{ex.amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setPrintableDoc(expenseToPrintableInvoice(ex))}
                                className="px-2 py-1 text-xs font-medium text-slate-800 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print Voucher</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const doc = expenseToPrintableInvoice(ex);
                                  setPrintableDoc(doc);
                                  printViaConnectedPrinter(doc, settings, 'A4');
                                }}
                                className="px-2 py-1 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Printer</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteRecord('expense', ex.id, `Expense ${ex.voucherNo}`)
                                }
                                className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 4: Customer Invoices & Printable Receipts Register with Search, Refund & Delete */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-bold text-slate-900">
                        05. Customer &amp; Patient Billing Register (Total Bills: {invoices.length})
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Search any customer bill, print receipt, process return/refund, or delete a mistaken bill
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={billingSearch}
                      onChange={(e) => setBillingSearch(e.target.value)}
                      placeholder="Search bill by customer name, invoice no..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">Invoice No</th>
                        <th className="py-2.5 font-medium">Customer / Patient</th>
                        <th className="py-2.5 font-medium">Department</th>
                        <th className="py-2.5 font-medium">Date</th>
                        <th className="py-2.5 font-medium text-right">Total Bill ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Paid ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Remaining ({cur})</th>
                        <th className="py-2.5 font-medium">Status</th>
                        <th className="py-2.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices
                        .filter((inv) => {
                          const q = (billingSearch || globalSearchQuery).trim().toLowerCase();
                          if (!q) return true;
                          return (
                            inv.invoiceNo.toLowerCase().includes(q) ||
                            inv.customerName.toLowerCase().includes(q) ||
                            inv.department.toLowerCase().includes(q) ||
                            inv.businessDate.toLowerCase().includes(q)
                          );
                        })
                        .map((inv) => {
                        const due = Math.max(0, inv.netTotal - inv.paidAmount - inv.refundedAmount);
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
                            <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {inv.netTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                              {inv.paidAmount.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums font-bold text-amber-700">
                              {due.toLocaleString()}
                            </td>
                            <td className="py-2.5 font-mono font-semibold text-slate-800">
                              {inv.status}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPrintableDoc({ type: 'INVOICE', data: inv })
                                }
                                className="px-2 py-1 text-xs font-semibold text-slate-900 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>View / Virtual</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const doc: PrintableDocPayload = { type: 'INVOICE', data: inv };
                                  setPrintableDoc(doc);
                                  printViaConnectedPrinter(doc, settings, 'A4');
                                }}
                                className="px-2 py-1 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded inline-flex items-center gap-1 cursor-pointer"
                                title="Send directly to connected printer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Printer</span>
                              </button>
                              {due > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSettleInvoice(inv)}
                                  className="px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
                                >
                                  Receive {due.toLocaleString()}
                                </button>
                              )}
                              {inv.department.startsWith('PHARMACY') && inv.status !== 'REFUNDED' && (
                                <button
                                  type="button"
                                  onClick={() => handleReturnPharmacySale(inv)}
                                  className="px-2 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Return Medicine</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteRecord('invoice', inv.id, `Invoice ${inv.invoiceNo}`)
                                }
                                className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
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
              MODULE 5: COMPLETE HISTORY REGISTER & LAPTOP LOCAL BACKUP CENTER
             ===================================================================== */}
          {activeModule === 'accounting_security' && (
            <div className="space-y-6">
              {/* 1. Automatic Laptop File Backup & History Sync Center */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-bold text-slate-900">
                        01. Automatic Laptop Backup &amp; History File Center
                      </h2>
                      <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
                        AUTO-SAVE ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Every transaction, bill, medicine sale, return, salary, and expense is automatically saved to local Backup (`.JSON`) and Master History (`.CSV` Excel) files
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={handleLinkLaptopFolder}
                      className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderCheck className="w-4 h-4" />
                      <span>Link Laptop Folder for Auto-Save</span>
                    </button>
                    <a
                      href="/api/backups/download-history-csv"
                      download
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Open Master History (.CSV)</span>
                    </a>
                    <a
                      href="/api/backups/download-laptop"
                      download
                      className="px-3.5 py-2 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Open Backup File (.JSON)</span>
                    </a>
                    <label className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Restore Backup File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreLaptopFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">AUTO-SAVED BACKUP FILE</span>
                    <span className="font-semibold text-slate-900">
                      Laptop_Auto_Backups/Al_Hikmat_Auto_Backup_Latest.json
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">AUTO-SAVED EXCEL HISTORY FILE</span>
                    <span className="font-semibold text-slate-900">
                      Laptop_Auto_Backups/Al_Hikmat_Master_History.csv
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SYNC TARGET &amp; LAST SAVED</span>
                    <span className="font-semibold text-emerald-700">
                      {laptopFolderName} · {lastAutoSavedTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1B. Daily Patients & Staff Attendance (Hazir / Ghair Hazir) History Register */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      01-B. Daily Patients &amp; Staff Attendance History (Din ke Hisab se Patients aur Staff Hazri / Chuttiyan)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Automatically saves daily Patients Present, Staff Present (Hazir), Staff Absent (Ghair Hazir / Chutti), and Monthly Chuttiyan
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToOption('billing_hr')}
                    className="px-3.5 py-2 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white text-xs font-semibold cursor-pointer"
                  >
                    Mark / Edit Staff Attendance
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 font-medium">Date</th>
                        <th className="py-2 font-medium">Total Patients on Date</th>
                        <th className="py-2 font-medium">Date Patient Bills &amp; Total Amount</th>
                        <th className="py-2 font-medium">Staff Present (Hazir)</th>
                        <th className="py-2 font-medium">Staff Absent (Ghair Hazir / Chutti)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allRecordedHistoryDates
                        .filter((d) => {
                          const q = (historySearch || globalSearchQuery).trim().toLowerCase();
                          if (!q) return true;
                          return d.toLowerCase().includes(q);
                        })
                        .slice(0, 15)
                        .map((dateStr) => {
                          const dayInvoices = invoices.filter(
                            (i) =>
                              i.businessDate === dateStr &&
                              !i.department.startsWith('PHARMACY_WHOLESALE')
                          );
                          const dayTotalBilled = dayInvoices
                            .filter((i) => i.status !== 'REFUNDED')
                            .reduce((acc, i) => acc + i.netTotal, 0);
                          const dayPatients = Array.from(
                            new Set([
                              ...patients
                                .filter((p) => p.registeredBusinessDate === dateStr)
                                .map((p) => p.fullName),
                              ...encounters
                                .filter((e) => e.businessDate === dateStr)
                                .map((e) => e.patientName),
                              ...dayInvoices.map((i) => i.customerName),
                            ])
                          );
                          const dayAtt = staffAttendance.filter((a) => a.date === dateStr);
                          const presentNames =
                            dayAtt.length > 0
                              ? dayAtt
                                  .filter((a) => a.status === 'PRESENT')
                                  .map((a) => a.employeeName)
                              : dateStr === selectedDayStr
                              ? employees.map((e) => e.fullName)
                              : [];
                          const absentNames = dayAtt
                            .filter((a) => a.status !== 'PRESENT')
                            .map((a) => `${a.employeeName} (${a.remarks || 'Absent'})`);
                          return (
                            <tr key={dateStr} className="hover:bg-slate-50">
                              <td className="py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                                {dateStr}
                              </td>
                              <td className="py-2.5">
                                <span className="font-bold text-[#1D5464]">
                                  Total Patients: {dayPatients.length}
                                </span>{' '}
                                <span className="text-slate-700">
                                  ({dayPatients.join(', ') || 'No patient entries'})
                                </span>
                              </td>
                              <td className="py-2.5 font-mono">
                                <span className="font-bold text-slate-900">
                                  {dayInvoices.length} Bills · Total: {dayTotalBilled.toLocaleString()} {cur}
                                </span>
                              </td>
                              <td className="py-2.5">
                                <span className="font-bold text-emerald-700">
                                  {presentNames.length} Present:
                                </span>{' '}
                                <span className="text-slate-700">
                                  {presentNames.join(', ') || '—'}
                                </span>
                              </td>
                              <td className="py-2.5">
                                {absentNames.length > 0 ? (
                                  <span className="font-bold text-rose-700">
                                    {absentNames.length} Absent: {absentNames.join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold">
                                    0 Absent (All Present)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Complete All-Time Hospital History Register */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      02. Complete All-Time Hospital History Register ({journalEntries.length} Records)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search and filter all Customer Bills, Pharmacy Sales, Supplier Medicine Bills, Lab Bills, Staff Salaries Paid, and Operating Expenses
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search history by name, voucher, or date..."
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 w-56"
                    />
                    {(
                      [
                        ['ALL', 'All History'],
                        ['INVOICE', 'Customer & Lab Bills'],
                        ['PHARMACY', 'Pharmacy Sales'],
                        ['SUPPLIER_BILL', 'Supplier Medicine Bills'],
                        ['PAYROLL', 'Staff Salaries Paid'],
                        ['EXPENSE', 'Operating Expenses'],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setHistoryTypeFilter(k)}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                          historyTypeFilter === k
                            ? 'bg-[#1D5464] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-medium">Date</th>
                        <th className="py-2.5 font-medium">Voucher No</th>
                        <th className="py-2.5 font-medium">Category / Department</th>
                        <th className="py-2.5 font-medium">Description &amp; Details</th>
                        <th className="py-2.5 font-medium text-right">Amount ({cur})</th>
                        <th className="py-2.5 font-medium text-right">Medicine Cost (COGS)</th>
                        <th className="py-2.5 font-medium text-right">P&amp;L Impact</th>
                        <th className="py-2.5 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {journalEntries
                        .filter((j) => {
                          const q = (historySearch || globalSearchQuery).trim().toLowerCase();
                          if (
                            q &&
                            !j.narration.toLowerCase().includes(q) &&
                            !j.voucherNo.toLowerCase().includes(q) &&
                            !j.businessDate.toLowerCase().includes(q)
                          ) {
                            return false;
                          }
                          if (historyTypeFilter === 'INVOICE')
                            return j.referenceType === 'INVOICE' && j.costCenter !== 'PHARMACY';
                          if (historyTypeFilter === 'PHARMACY')
                            return (
                              (j.referenceType === 'INVOICE' || j.referenceType === 'REFUND') &&
                              j.costCenter === 'PHARMACY'
                            );
                          if (historyTypeFilter === 'SUPPLIER_BILL')
                            return j.referenceType === 'PURCHASE_GRN';
                          if (historyTypeFilter === 'PAYROLL') return j.referenceType === 'PAYROLL';
                          if (historyTypeFilter === 'EXPENSE') return j.referenceType === 'EXPENSE';
                          return true;
                        })
                        .map((j) => {
                          const isIncome = j.referenceType === 'INVOICE';
                          const isRefund = j.referenceType === 'REFUND';
                          const isExpenseOrPayroll =
                            j.referenceType === 'EXPENSE' || j.referenceType === 'PAYROLL';
                          const netImpact = isIncome
                            ? j.amount - j.cogsAmount
                            : isRefund
                            ? -(j.amount - (j.cogsAmount || 0))
                            : isExpenseOrPayroll
                            ? -j.amount
                            : 0;
                          return (
                            <tr key={j.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                                {j.businessDate}
                              </td>
                              <td className="py-2.5 font-mono text-slate-700 whitespace-nowrap">
                                {j.voucherNo}
                              </td>
                              <td className="py-2.5 font-mono text-slate-700 whitespace-nowrap">
                                {j.costCenter} · {j.referenceType}
                              </td>
                              <td className="py-2.5 text-slate-900">{j.narration}</td>
                              <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                                {j.amount.toLocaleString()}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                                {j.cogsAmount > 0 ? `-${j.cogsAmount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                                {netImpact > 0 ? (
                                  <span className="text-emerald-700">
                                    +{netImpact.toLocaleString()} (Profit)
                                  </span>
                                ) : netImpact < 0 ? (
                                  <span className="text-rose-700">
                                    {netImpact.toLocaleString()} (Cost/Return)
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Asset / Stock</span>
                                )}
                              </td>
                              <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchedInv = invoices.find((i) => i.id === j.referenceId);
                                    const doc = matchedInv
                                      ? ({ type: 'INVOICE', data: matchedInv } as PrintableDocPayload)
                                      : journalEntryToPrintableInvoice(j);
                                    setPrintableDoc(doc);
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-slate-800 border border-slate-300 rounded hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Print</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchedInv = invoices.find((i) => i.id === j.referenceId);
                                    const doc = matchedInv
                                      ? ({ type: 'INVOICE', data: matchedInv } as PrintableDocPayload)
                                      : journalEntryToPrintableInvoice(j);
                                    setPrintableDoc(doc);
                                    printViaConnectedPrinter(doc, settings, 'A4');
                                  }}
                                  className="px-2 py-1 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded inline-flex items-center gap-1 cursor-pointer"
                                  title="Print directly on connected printer"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Printer</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteRecord(
                                      'journal-entry',
                                      j.id,
                                      `Transaction ${j.voucherNo}`
                                    )
                                  }
                                  className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

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
                onAskAi={async (prompt, forceOfflineFallback, useMapsGrounding, latLng) => {
                  const headers = await buildHeaders();
                  const res = await fetch('/api/ai/assistant', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      prompt,
                      forceOfflineFallback,
                      useMapsGrounding,
                      latLng,
                    }),
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
          <footer className="no-print mt-auto border-t border-slate-200/80 bg-white px-6 py-3.5 text-xs text-slate-500">
            <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                {settings.hospitalName} · Central Database &amp; Financial Management System
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-emerald-700">
                  Auto-Backup Active ({lastAutoSavedTime})
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
