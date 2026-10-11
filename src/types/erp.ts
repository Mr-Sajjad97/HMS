/**
 * Shared Domain Types for Hospital ERP — Developed by Sajjad Qaiser Shah
 */

export type StaffRole =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'LAB_TECH'
  | 'PHARMACIST'
  | 'CASHIER'
  | 'ACCOUNTANT'
  | 'HR_MANAGER'
  | 'RECEPTIONIST'
  | 'COOK'
  | 'SWEEPER'
  | 'WARD_BOY'
  | 'SECURITY'
  | 'DRIVER'
  | 'OTHER';

export type ClientFormFactor = 'LAN_WEB' | 'WINDOWS_DESKTOP' | 'MOBILE_LAN';

export interface HospitalSettings {
  hospitalName: string;
  currency: string;
  timezone: string;
  auditRetentionDays: number;
  lanSubnet: string;
  dbBindAddress: string;
  walArchivingEnabled: boolean;
  simulatedInternetOffline: boolean;
  adminFullName?: string;
  adminEmail?: string;
  adminUsername?: string;
  adminPassword?: string;
  securityPin?: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  fullName: string;
  specialization: string;
  department: string;
  consultationFee: number;
  roomNo: string;
  onDuty: boolean;
}

export interface Patient {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  cnic: string;
  bloodGroup: string;
  address: string;
  allergies: string;
  registeredBusinessDate: string;
  createdAt: string;
}

export interface VitalSignEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  encounterId?: string;
  encounterToken?: string;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  spo2: number;
  temperatureC: number;
  clinicalNotes: string;
  recordedBy: string;
  businessDate: string;
  recordedAt: string;
}

export interface Encounter {
  id: string;
  tokenNo: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  department: string;
  encounterType: 'OPD' | 'IPD' | 'EMERGENCY';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'ADMITTED' | 'DISCHARGED' | 'COMPLETED';
  wardBed: string;
  chiefComplaint: string;
  diagnosis: string;
  vitals: string;
  fee: number;
  invoiceId: string;
  businessDate: string;
  admittedAt?: string;
  dischargedAt?: string;
  createdAt: string;
}

export interface LabOrder {
  id: string;
  orderNo: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  testCode: string;
  testName: string;
  category: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Serology' | 'Pathology';
  sampleBarcode: string;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'VERIFIED';
  resultValue: string;
  unit: string;
  referenceRange: string;
  abnormalFlag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
  verifiedBy?: string;
  verifiedAt?: string;
  price: number;
  invoiceId: string;
  businessDate: string;
  createdAt: string;
}

export interface PharmacyBatch {
  id: string;
  sku: string;
  genericName: string;
  brandName: string;
  batchNo: string;
  category: string;
  expiryDate: string; // YYYY-MM-DD
  stockQty: number;
  wardStockQty: number; // Internal transferred stock at IPD wards
  reorderLevel: number;
  unitCost: number;
  retailPrice: number;
  wholesalePrice: number;
  supplierId: string;
  supplierName: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
  batchId?: string;
  category?: 'DOCTOR_FEE' | 'LAB_TEST' | 'MEDICINE' | 'EXTRA_CUSTOM' | 'SERVICE';
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  patientId?: string;
  patientMrn?: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other';
  patientPhone?: string;
  patientAddress?: string;
  doctorName?: string;
  customerName: string;
  department: 'HOSPITAL_OPD' | 'HOSPITAL_IPD' | 'LABORATORY' | 'PHARMACY_RETAIL' | 'PHARMACY_WHOLESALE';
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  netTotal: number;
  paidAmount: number;
  refundedAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT_LEDGER';
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'REFUNDED';
  businessDate: string;
  paymentDate: string | null;
  createdAt: string;
  finalized: boolean;
  isCombinedPatientBill?: boolean;
  isVirtualBill?: boolean;
  homeCalculationMode?: 'DEDUCT_BILL_FROM_HOME' | 'STANDARD_REVENUE_AND_DEDUCT_COST';
  totalCogsDeducted?: number;
  homeDeductionAmount?: number;
}

export interface JournalEntry {
  id: string;
  voucherNo: string;
  businessDate: string;
  paymentDate: string | null;
  createdAt: string;
  costCenter: 'HOSPITAL' | 'LABORATORY' | 'PHARMACY' | 'INTERNAL_TRANSFER' | 'SHARED_ADMIN';
  isInternalTransfer: boolean;
  referenceType: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'PURCHASE_GRN' | 'INTERNAL_TRANSFER' | 'EXPENSE' | 'PAYROLL';
  referenceId: string;
  narration: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  cogsAmount: number;
  createdBy: string;
}

export interface LedgerParty {
  id: string;
  name: string;
  partyType: 'SUPPLIER' | 'WHOLESALE_CUSTOMER';
  phone: string;
  openingBalance: number;
  totalBilledOrPurchased: number;
  totalPaidOrReceived: number;
  currentBalance: number; // Positive = payable (for supplier) or receivable (for customer)
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  voucherNo: string;
  category: string;
  costCenter: 'HOSPITAL' | 'LABORATORY' | 'PHARMACY' | 'SHARED_ADMIN';
  description: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  businessDate: string;
  paymentDate: string;
  recordedBy: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  empCode: string;
  fullName: string;
  designation: string;
  department: 'HOSPITAL' | 'LABORATORY' | 'PHARMACY' | 'SHARED_ADMIN';
  role: StaffRole;
  baseSalary: number;
  allowance: number;
  deduction: number;
  netSalary: number;
  bankAccount: string;
  status: 'ACTIVE' | 'ON_LEAVE';
}

export interface SalarySlip {
  id: string;
  payrollMonth: string; // YYYY-MM
  employeeId: string;
  empCode: string;
  employeeName: string;
  designation: string;
  department: 'HOSPITAL' | 'LABORATORY' | 'PHARMACY' | 'SHARED_ADMIN';
  baseSalary: number;
  allowance: number;
  deduction: number;
  netPaid: number;
  businessDate: string;
  paymentDate: string;
  createdAt: string;
}

export interface StaffAttendanceRecord {
  id: string;
  employeeId: string;
  empCode: string;
  employeeName: string;
  designation: string;
  department: 'HOSPITAL' | 'LABORATORY' | 'PHARMACY' | 'SHARED_ADMIN';
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  remarks?: string;
  recordedBy: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: StaffRole;
  module: string;
  action: string;
  entityId: string;
  summary: string;
  ipAddress: string;
  createdAt: string;
}

export interface BackupRecord {
  id: string;
  filename: string;
  cipherAlgorithm: 'AES-256-GCM';
  sha256Checksum: string;
  sizeBytes: number;
  walSequenceLsn: string;
  primaryServerPath: string;
  secondaryNasPath: string;
  disconnectedCopyStatus: 'VERIFIED_EXPORTED' | 'READY_FOR_OFFLINE_MEDIA';
  restorationTested: boolean;
  lastRestoreVerifiedAt: string | null;
  createdAt: string;
  createdBy: string;
  encryptedPayloadHex?: string;
  ivHex?: string;
  authTagHex?: string;
}

export interface SupplierBill {
  id: string;
  billNo: string;
  supplierId: string;
  supplierName: string;
  batchId: string;
  brandName: string;
  genericName: string;
  batchNo: string;
  qty: number;
  unitCost: number;
  retailPrice: number;
  totalBill: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  businessDate: string;
  createdAt: string;
}

export interface AcceptanceTestItem {
  id: string;
  title: string;
  category: string;
  passed: boolean;
  evidence: string;
  measuredAt: string;
}
