/**
 * Comprehensive Patient Bill Builder, Customizer, Virtual Bill Generator & Date-Wise Patient Billing History
 * - Captures Customer/Patient Details (auto-registers patient on the selected date so Date-Wise Total Patients updates)
 * - Includes Doctor Consultation Fee, Laboratory Tests & Fees, Pharmacy Medicines (atomically deducted from Stock),
 *   and Customizable Extra Items (Drip, Injection, Cannula, Bed, Dressing, Oxygen, etc. with custom prices)
 * - Keeps Walk-in Medical Store POS (Medicines Only) separate in the Pharmacy & Stock module
 * - Supports Connected Printer printing AND automatic Virtual Bill generation when no printer is connected
 * - Saves all bills and Date-Wise Total Patients in History & Auto-Backup
 */
import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Printer,
  Plus,
  Trash2,
  Stethoscope,
  FlaskConical,
  Pill,
  Syringe,
  Users,
  Calendar,
  Search,
  CheckCircle2,
  FileText,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import type {
  Doctor,
  Patient,
  Encounter,
  LabOrder,
  PharmacyBatch,
  Invoice,
} from '../types/erp.ts';

interface PatientBillBuilderViewProps {
  currency: string;
  defaultDate: string;
  doctors: Doctor[];
  patients: Patient[];
  encounters: Encounter[];
  labOrders: LabOrder[];
  pharmacyBatches: PharmacyBatch[];
  invoices: Invoice[];
  globalSearchQuery: string;
  onSubmitCombinedBill: (
    payload: any,
    printAction: 'OPEN_VIRTUAL_AND_PRINT_MODAL' | 'DIRECT_HARDWARE_PRINT' | 'VIRTUAL_ONLY'
  ) => Promise<Invoice | null>;
  onOpenPrintableInvoice: (invoice: Invoice) => void;
  onDirectHardwarePrint?: (invoice: Invoice, layout?: 'A4' | 'THERMAL_80MM') => void;
  onReturnMedicineSale: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onNavigateToPharmacyStore: () => void;
}

interface LabTestRow {
  preset: string;
  testName: string;
  testCode: string;
  category: string;
  qty: number;
  price: number;
  unitCost: number;
}

interface MedicineBillRow {
  batchId: string;
  qty: number;
  unitPrice: number;
}

interface ExtraCustomRow {
  description: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

const LAB_TEST_PRESETS = [
  { label: 'CBC (Complete Blood Count) — 1,200', testName: 'CBC (Complete Blood Count)', testCode: 'HEM-CBC', category: 'Hematology', price: 1200 },
  { label: 'Blood Sugar (RBS / FBS) — 500', testName: 'Blood Sugar (RBS / FBS)', testCode: 'BIO-BSR', category: 'Biochemistry', price: 500 },
  { label: 'Lipid Profile — 2,200', testName: 'Fasting Lipid Profile', testCode: 'BIO-LIP', category: 'Biochemistry', price: 2200 },
  { label: 'LFT (Liver Function Test) — 1,800', testName: 'Liver Function Test (LFT)', testCode: 'BIO-LFT', category: 'Biochemistry', price: 1800 },
  { label: 'RFT (Renal Function Test) — 1,800', testName: 'Renal Function Test (RFT)', testCode: 'BIO-RFT', category: 'Biochemistry', price: 1800 },
  { label: 'HbA1c (Diabetes 3-Month) — 2,000', testName: 'HbA1c Glycated Hemoglobin', testCode: 'BIO-HBA', category: 'Biochemistry', price: 2000 },
  { label: 'Urine Complete (Urine R/E) — 600', testName: 'Urine Complete Examination', testCode: 'PAT-URE', category: 'Pathology', price: 600 },
  { label: 'Typhoid / Malaria Rapid Test — 1,000', testName: 'Typhoid & Malaria ICT Panel', testCode: 'SER-TYM', category: 'Serology', price: 1000 },
  { label: 'Digital X-Ray (Chest / Limb) — 1,500', testName: 'Digital X-Ray Diagnostic', testCode: 'RAD-XRY', category: 'Pathology', price: 1500 },
  { label: 'Ultrasound (Abdomen / Pelvis) — 2,500', testName: 'Ultrasound Scan', testCode: 'RAD-USG', category: 'Pathology', price: 2500 },
  { label: 'ECG (12-Lead Heart Trace) — 1,000', testName: '12-Lead Digital ECG', testCode: 'CRD-ECG', category: 'Pathology', price: 1000 },
  { label: 'Custom Test (Write Name & Fee)...', testName: '', testCode: 'LAB-CUS', category: 'Biochemistry', price: 1000 },
];

const EXTRA_ITEM_PRESETS = [
  { label: '+ IV Drip (Normal Saline / Ringer)', description: 'IV Drip Set (Normal Saline / Ringer Lactate)', unitPrice: 800, unitCost: 200 },
  { label: '+ Injection Administration', description: 'IM / IV Injection Administration', unitPrice: 500, unitCost: 120 },
  { label: '+ IV Cannula + Drip Set', description: 'IV Cannula & Infusion Set', unitPrice: 450, unitCost: 100 },
  { label: '+ Emergency Bed / Observation', description: 'Emergency Observation Bed & Nursing Care', unitPrice: 1500, unitCost: 0 },
  { label: '+ Wound Dressing / Stitching', description: 'Sterile Wound Dressing / Minor Procedure', unitPrice: 1000, unitCost: 200 },
  { label: '+ Nebulization / Oxygen', description: 'Nebulization & Oxygen Therapy Session', unitPrice: 700, unitCost: 100 },
];

export const PatientBillBuilderView: React.FC<PatientBillBuilderViewProps> = ({
  currency,
  defaultDate,
  doctors,
  patients,
  encounters,
  labOrders,
  pharmacyBatches,
  invoices,
  globalSearchQuery,
  onSubmitCombinedBill,
  onOpenPrintableInvoice,
  onDirectHardwarePrint,
  onReturnMedicineSale,
  onDeleteInvoice,
  onNavigateToPharmacyStore,
}) => {
  // 1. Patient / Customer Details State (All Optional — Bill prints cleanly even if left blank)
  const [patientMode, setPatientMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [customerName, setCustomerName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('');
  const [patientGender, setPatientGender] = useState<'' | 'Male' | 'Female' | 'Other'>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientCnic, setPatientCnic] = useState<string>('');
  const [patientAddress, setPatientAddress] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [businessDate, setBusinessDate] = useState<string>(defaultDate || '2026-10-10');
  const [department, setDepartment] = useState<'HOSPITAL_OPD' | 'HOSPITAL_IPD'>('HOSPITAL_OPD');

  // 2. Doctor Fee State
  const [includeDoctorFee, setIncludeDoctorFee] = useState<boolean>(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || 'DOC-01');
  const [customDoctorName, setCustomDoctorName] = useState<string>('');
  const [doctorFee, setDoctorFee] = useState<number>(doctors[0]?.consultationFee || 2000);

  // 3. Laboratory Tests State
  const [labRows, setLabRows] = useState<LabTestRow[]>([]);

  // 4. Pharmacy Medicines from Stock State
  const [medicineRows, setMedicineRows] = useState<MedicineBillRow[]>([]);

  // 5. Extra Customizable Clinical Items (Drip, Injection, Bed, Dressing, etc.)
  const [extraRows, setExtraRows] = useState<ExtraCustomRow[]>([
    {
      description: 'IV Drip & Injection Administration',
      qty: 1,
      unitPrice: 800,
      unitCost: 150,
    },
  ]);

  // 6. Payment, Discount, Home Calculation Mode & Printer/Virtual Mode
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmountOverride, setPaidAmountOverride] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT_LEDGER'>('CASH');
  const [homeCalculationMode, setHomeCalculationMode] = useState<
    'DEDUCT_BILL_FROM_HOME' | 'STANDARD_REVENUE_AND_DEDUCT_COST'
  >('DEDUCT_BILL_FROM_HOME');
  const [printerConnectionMode, setPrinterConnectionMode] = useState<'AUTO_VIRTUAL' | 'CONNECTED_PRINTER'>('AUTO_VIRTUAL');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // History Search & Date Filter
  const [billHistorySearch, setBillHistorySearch] = useState<string>('');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>('');

  // Live Subtotals & Stock Deduction Math
  const doctorFeeSubtotal = includeDoctorFee ? Math.max(0, Number(doctorFee) || 0) : 0;

  const labSubtotal = useMemo(
    () =>
      labRows.reduce(
        (acc, r) => acc + Math.max(1, Number(r.qty) || 1) * Math.max(0, Number(r.price) || 0),
        0
      ),
    [labRows]
  );

  const labCostTotal = useMemo(
    () =>
      labRows.reduce(
        (acc, r) => acc + Math.max(1, Number(r.qty) || 1) * Math.max(0, Number(r.unitCost) || 0),
        0
      ),
    [labRows]
  );

  const medicineSummary = useMemo(() => {
    let subtotal = 0;
    let cogsTotal = 0;
    let totalUnits = 0;
    for (const row of medicineRows) {
      const batch = pharmacyBatches.find((b) => b.id === row.batchId);
      const qty = Math.max(1, Number(row.qty) || 1);
      const price =
        row.unitPrice !== undefined && row.unitPrice >= 0
          ? Number(row.unitPrice)
          : batch?.retailPrice || 0;
      const cost = batch?.unitCost || 0;
      subtotal += price * qty;
      cogsTotal += cost * qty;
      totalUnits += qty;
    }
    return { subtotal, cogsTotal, totalUnits };
  }, [medicineRows, pharmacyBatches]);

  const extraSummary = useMemo(() => {
    let subtotal = 0;
    let costTotal = 0;
    for (const r of extraRows) {
      if (!r.description.trim() && Number(r.unitPrice) <= 0) continue;
      const qty = Math.max(1, Number(r.qty) || 1);
      subtotal += qty * Math.max(0, Number(r.unitPrice) || 0);
      costTotal += qty * Math.max(0, Number(r.unitCost) || 0);
    }
    return { subtotal, costTotal };
  }, [extraRows]);

  const grossSubtotal =
    doctorFeeSubtotal + labSubtotal + medicineSummary.subtotal + extraSummary.subtotal;
  const safeDiscount = Math.min(grossSubtotal, Math.max(0, Number(discount) || 0));
  const netGrandTotal = Math.max(0, grossSubtotal - safeDiscount);
  const totalCostOfBill =
    medicineSummary.cogsTotal + labCostTotal + extraSummary.costTotal;
  const effectivePaidAmount =
    paidAmountOverride.trim() !== ''
      ? Math.min(netGrandTotal, Math.max(0, Number(paidAmountOverride) || 0))
      : paymentMethod === 'CREDIT_LEDGER'
      ? 0
      : netGrandTotal;
  const remainingBalance = Math.max(0, netGrandTotal - effectivePaidAmount);

  // Handlers for adding/removing rows
  const handleAddLabRow = () => {
    const first = LAB_TEST_PRESETS[0];
    setLabRows([
      ...labRows,
      {
        preset: first.label,
        testName: first.testName,
        testCode: first.testCode,
        category: first.category,
        qty: 1,
        price: first.price,
        unitCost: 0,
      },
    ]);
  };

  const handleAddMedicineRow = () => {
    const firstAvailable =
      pharmacyBatches.find((b) => b.stockQty > 0) || pharmacyBatches[0];
    if (!firstAvailable) return;
    setMedicineRows([
      ...medicineRows,
      {
        batchId: firstAvailable.id,
        qty: 1,
        unitPrice: firstAvailable.retailPrice,
      },
    ]);
  };

  const handleAddExtraPreset = (preset: {
    description: string;
    unitPrice: number;
    unitCost: number;
  }) => {
    setExtraRows([
      ...extraRows,
      {
        description: preset.description,
        qty: 1,
        unitPrice: preset.unitPrice,
        unitCost: preset.unitCost,
      },
    ]);
  };

  const handleSubmitForm = async (
    printAction: 'OPEN_VIRTUAL_AND_PRINT_MODAL' | 'DIRECT_HARDWARE_PRINT' | 'VIRTUAL_ONLY'
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedDoc = doctors.find((d) => d.id === selectedDoctorId);
      const resolvedDoctorName =
        customDoctorName.trim() || selectedDoc?.fullName || 'Duty Medical Officer';

      const existingPat =
        patientMode === 'EXISTING'
          ? patients.find((p) => p.id === selectedPatientId)
          : undefined;

      const parsedAge =
        patientMode === 'EXISTING' && existingPat
          ? existingPat.age
          : Number(patientAge) > 0
          ? Number(patientAge)
          : undefined;

      const payload = {
        patientMode,
        patientId: existingPat?.id,
        customerName:
          patientMode === 'EXISTING' && existingPat
            ? existingPat.fullName
            : customerName.trim() || 'Walk-in Patient / Customer',
        patientAge: parsedAge,
        patientGender:
          patientMode === 'EXISTING' && existingPat
            ? existingPat.gender
            : patientGender || undefined,
        patientPhone:
          patientMode === 'EXISTING' && existingPat
            ? existingPat.phone
            : patientPhone.trim() || undefined,
        patientCnic:
          patientMode === 'EXISTING' && existingPat
            ? existingPat.cnic
            : patientCnic.trim() || undefined,
        patientAddress:
          patientMode === 'EXISTING' && existingPat
            ? existingPat.address
            : patientAddress.trim() || undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,
        businessDate: businessDate || defaultDate || '2026-10-10',
        department,
        includeDoctorFee,
        doctorId: selectedDoctorId,
        doctorName: resolvedDoctorName,
        doctorFee: doctorFeeSubtotal,
        labItems: labRows.filter((r) => r.testName.trim() || r.price > 0),
        medicineItems: medicineRows.filter((m) => m.batchId && m.qty > 0),
        extraItems: extraRows.filter(
          (e) => e.description.trim() !== '' || Number(e.unitPrice) > 0
        ),
        discount: safeDiscount,
        paidAmount: effectivePaidAmount,
        paymentMethod,
        homeCalculationMode,
        isVirtualBill: true,
      };

      const createdInvoice = await onSubmitCombinedBill(payload, printAction);
      if (createdInvoice) {
        // Reset form for next patient while preserving convenient defaults
        setCustomerName('');
        setChiefComplaint('');
        setPaidAmountOverride('');
        if (printAction === 'DIRECT_HARDWARE_PRINT') {
          if (onDirectHardwarePrint) {
            onDirectHardwarePrint(createdInvoice, 'A4');
          } else {
            setTimeout(() => {
              window.print();
            }, 250);
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build an instant draft Invoice object from current form (even if details or items are omitted)
  const buildDraftInvoiceFromForm = (): Invoice => {
    const selectedDoc = doctors.find((d) => d.id === selectedDoctorId);
    const resolvedDoctorName = includeDoctorFee
      ? customDoctorName.trim() || selectedDoc?.fullName || 'Duty Medical Officer'
      : undefined;
    const existingPat =
      patientMode === 'EXISTING'
        ? patients.find((p) => p.id === selectedPatientId)
        : undefined;

    const draftItems: Invoice['items'] = [];
    if (includeDoctorFee && doctorFeeSubtotal > 0) {
      draftItems.push({
        description: `Doctor Consultation Fee (${resolvedDoctorName || 'Duty Doctor'})`,
        qty: 1,
        unitPrice: doctorFeeSubtotal,
        unitCost: 0,
        lineTotal: doctorFeeSubtotal,
        category: 'DOCTOR_FEE',
      });
    }
    for (const l of labRows) {
      if (l.testName.trim() || l.price > 0) {
        const q = Math.max(1, Number(l.qty) || 1);
        const p = Math.max(0, Number(l.price) || 0);
        draftItems.push({
          description: `Lab Test: ${l.testName.trim() || 'Diagnostic Test'}`,
          qty: q,
          unitPrice: p,
          unitCost: 0,
          lineTotal: q * p,
          category: 'LAB_TEST',
        });
      }
    }
    for (const m of medicineRows) {
      const b = pharmacyBatches.find((x) => x.id === m.batchId);
      if (b && m.qty > 0) {
        const q = Math.max(1, Number(m.qty) || 1);
        const p = Math.max(0, Number(m.unitPrice ?? b.retailPrice) || 0);
        draftItems.push({
          description: `Medicine: ${b.brandName} [${b.batchNo}]`,
          qty: q,
          unitPrice: p,
          unitCost: b.unitCost,
          lineTotal: q * p,
          batchId: b.id,
          category: 'MEDICINE',
        });
      }
    }
    for (const ex of extraRows) {
      if (ex.description.trim() || Number(ex.unitPrice) > 0) {
        const q = Math.max(1, Number(ex.qty) || 1);
        const p = Math.max(0, Number(ex.unitPrice) || 0);
        draftItems.push({
          description: ex.description.trim() || 'Hospital Treatment / Procedure',
          qty: q,
          unitPrice: p,
          unitCost: 0,
          lineTotal: q * p,
          category: 'EXTRA_CUSTOM',
        });
      }
    }
    if (draftItems.length === 0) {
      draftItems.push({
        description: chiefComplaint.trim() || 'General Hospital Slip / Consultation',
        qty: 1,
        unitPrice: 0,
        unitCost: 0,
        lineTotal: 0,
        category: 'SERVICE',
      });
    }

    return {
      id: `DRAFT-${Date.now()}`,
      invoiceNo: `BILL-${String(invoices.length + 1).padStart(4, '0')}`,
      patientId: existingPat?.id,
      customerName:
        patientMode === 'EXISTING' && existingPat
          ? existingPat.fullName
          : customerName.trim() || 'Walk-in Patient / Customer',
      patientMrn: existingPat?.mrn,
      patientAge:
        patientMode === 'EXISTING' && existingPat
          ? existingPat.age
          : Number(patientAge) > 0
          ? Number(patientAge)
          : undefined,
      patientGender:
        patientMode === 'EXISTING' && existingPat
          ? existingPat.gender
          : (patientGender as 'Male' | 'Female' | 'Other' | undefined) || undefined,
      patientPhone:
        patientMode === 'EXISTING' && existingPat
          ? existingPat.phone
          : patientPhone.trim() || undefined,
      patientAddress:
        patientMode === 'EXISTING' && existingPat
          ? existingPat.address
          : patientAddress.trim() || undefined,
      doctorName: resolvedDoctorName,
      department,
      items: draftItems,
      subtotal: grossSubtotal,
      discount: safeDiscount,
      netTotal: netGrandTotal,
      paidAmount: effectivePaidAmount,
      refundedAmount: 0,
      status:
        effectivePaidAmount >= netGrandTotal
          ? 'PAID'
          : effectivePaidAmount > 0
          ? 'PARTIAL'
          : 'UNPAID',
      paymentMethod,
      businessDate: businessDate || defaultDate || '2026-10-10',
      paymentDate: businessDate || defaultDate || '2026-10-10',
      finalized: true,
      createdAt: new Date().toISOString(),
      isVirtualBill: true,
      homeCalculationMode,
    };
  };

  // Date-Wise Total Patients & Total Billing History Calculation
  const dateWisePatientBillingSummary = useMemo(() => {
    const allDates = Array.from(
      new Set([
        businessDate,
        defaultDate,
        ...patients.map((p) => p.registeredBusinessDate),
        ...encounters.map((e) => e.businessDate),
        ...labOrders.map((l) => l.businessDate),
        ...invoices.map((i) => i.businessDate),
      ])
    )
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return allDates.map((d) => {
      // Unique patient names on date d (excluding wholesale pharmacy)
      const patientNamesSet = new Set<string>();
      for (const p of patients) {
        if (p.registeredBusinessDate === d && p.fullName) {
          patientNamesSet.add(p.fullName);
        }
      }
      for (const e of encounters) {
        if (e.businessDate === d && e.patientName) {
          patientNamesSet.add(e.patientName);
        }
      }
      for (const l of labOrders) {
        if (l.businessDate === d && l.patientName) {
          patientNamesSet.add(l.patientName);
        }
      }
      const dayInvoices = invoices.filter(
        (i) => i.businessDate === d && i.department !== 'PHARMACY_WHOLESALE'
      );
      for (const inv of dayInvoices) {
        if (inv.customerName) {
          patientNamesSet.add(inv.customerName);
        }
      }

      let doctorFeeTotal = 0;
      let labTotal = 0;
      let medicineTotal = 0;
      let extraCustomTotal = 0;
      let stockUnitsDeducted = 0;
      let grandTotalBilled = 0;
      let totalPaid = 0;

      for (const inv of dayInvoices) {
        if (inv.status === 'REFUNDED') continue;
        grandTotalBilled += inv.netTotal;
        totalPaid += inv.paidAmount;
        for (const it of inv.items) {
          if (it.category === 'DOCTOR_FEE') {
            doctorFeeTotal += it.lineTotal;
          } else if (it.category === 'LAB_TEST' || inv.department === 'LABORATORY') {
            labTotal += it.lineTotal;
          } else if (
            it.category === 'MEDICINE' ||
            it.batchId ||
            inv.department.startsWith('PHARMACY')
          ) {
            medicineTotal += it.lineTotal;
            stockUnitsDeducted += it.qty;
          } else if (it.category === 'EXTRA_CUSTOM') {
            extraCustomTotal += it.lineTotal;
          } else {
            doctorFeeTotal += it.lineTotal;
          }
        }
      }

      return {
        date: d,
        patientNames: Array.from(patientNamesSet),
        totalPatientsCount: patientNamesSet.size,
        billsCount: dayInvoices.length,
        doctorFeeTotal,
        labTotal,
        medicineTotal,
        extraCustomTotal,
        stockUnitsDeducted,
        grandTotalBilled,
        totalPaid,
      };
    });
  }, [patients, encounters, labOrders, invoices, businessDate, defaultDate]);

  // Filtered Patient Bills (Excludes Medical Store Walk-in Pharmacy-Only sales if user wants to see Patient Bills, or shows all with clear badge)
  const patientBillsHistory = useMemo(() => {
    const q = (billHistorySearch || globalSearchQuery).trim().toLowerCase();
    return invoices.filter((inv) => {
      if (selectedHistoryDate && inv.businessDate !== selectedHistoryDate) {
        return false;
      }
      if (!q) return true;
      return (
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.businessDate.toLowerCase().includes(q) ||
        (inv.patientMrn && inv.patientMrn.toLowerCase().includes(q)) ||
        (inv.doctorName && inv.doctorName.toLowerCase().includes(q)) ||
        inv.items.some((it) => it.description.toLowerCase().includes(q))
      );
    });
  }, [invoices, billHistorySearch, globalSearchQuery, selectedHistoryDate]);

  return (
    <div className="space-y-6">
      {/* Top Info Banner Separating Full Patient Bill Builder vs Medical Store Pharmacy Counter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Receipt className="w-5 h-5 text-[#1D5464]" />
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Complete Patient Bill Builder (Doctor Fee + Lab Tests + Medicines + Extra Drip / Injection)
            </h1>
          </div>
          <p className="text-xs text-slate-600">
            Create a complete customized patient bill with Patient Details, Doctor Fee, Lab Tests, Medicines (auto-deducted from Stock), and Extra Items (Drip, Injection, Bed, etc.). Automatically deducts from Home Calculation &amp; Stock, prints on Connected Printer, or generates a Virtual Bill if no printer is connected.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateToPharmacyStore}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Switch to separate Medical Store Counter for customers who only buy medicines"
          >
            <Pill className="w-3.5 h-3.5 text-[#1D5464]" />
            <span>Medical Store Only (Separate Pharmacy POS)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Patient Bill Builder Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT 8 COLUMNS: CUSTOMIZABLE PATIENT BILL FORM */}
        <div className="xl:col-span-8 space-y-5">
          {/* STEP 1: CUSTOMER / PATIENT DETAILS & BILL DATE */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1D5464]" />
                <h2 className="text-sm font-bold text-slate-900">
                  1. Customer / Patient Details &amp; Visit Date (Saved in Date-Wise Patient History)
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setPatientMode('NEW')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                    patientMode === 'NEW'
                      ? 'bg-[#1D5464] text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  New / Walk-in Patient
                </button>
                <button
                  type="button"
                  onClick={() => setPatientMode('EXISTING')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                    patientMode === 'EXISTING'
                      ? 'bg-[#1D5464] text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Select Registered Patient ({patients.length})
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/90 border border-emerald-200 text-[11px] text-emerald-900 font-medium">
              ✓ <strong>Optional Details Support:</strong> If any patient detail (Name, Age, Phone, Address) or any section (Doctor Fee, Lab Test, Medicine, or Extra Item) is missing or left blank, <strong>the bill will still print cleanly</strong> showing only the filled details!
            </div>

            {patientMode === 'EXISTING' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">
                    Select Registered Patient
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.mrn} · {p.fullName} ({p.age}y / {p.gender} · {p.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Bill Date (Business Date)
                  </label>
                  <input
                    type="date"
                    value={businessDate}
                    onChange={(e) => setBusinessDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">
                      Patient / Customer Full Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g., Muhammad Bilal / Walk-in Patient"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Age (Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Gender (Optional)
                    </label>
                    <select
                      value={patientGender}
                      onChange={(e) =>
                        setPatientGender(
                          e.target.value as '' | 'Male' | 'Female' | 'Other'
                        )
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                    >
                      <option value="">Not Specified (Optional)</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="Optional (+92-300-...)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      CNIC / ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={patientCnic}
                      onChange={(e) => setPatientCnic(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Symptoms / Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="Optional (e.g., Fever, Drip)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Bill Date (Saved by Date)
                    </label>
                    <input
                      type="date"
                      value={businessDate}
                      onChange={(e) => setBusinessDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: DOCTOR CONSULTATION & FEE */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#1D5464]" />
                <h2 className="text-sm font-bold text-slate-900">
                  2. Doctor Consultation &amp; Doctor Fee
                </h2>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={includeDoctorFee}
                  onChange={(e) => setIncludeDoctorFee(e.target.checked)}
                  className="w-4 h-4 accent-[#1D5464] cursor-pointer"
                />
                <span>Include Doctor Fee in Bill</span>
              </label>
            </div>

            {includeDoctorFee ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">
                    Select Consultant Doctor
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      const doc = doctors.find((d) => d.id === e.target.value);
                      setSelectedDoctorId(e.target.value);
                      if (doc) setDoctorFee(doc.consultationFee);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.department}) — Default Fee: {d.consultationFee} {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Or Custom Doctor Name
                  </label>
                  <input
                    type="text"
                    value={customDoctorName}
                    onChange={(e) => setCustomDoctorName(e.target.value)}
                    placeholder="Optional custom doctor"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Doctor Fee ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={doctorFee}
                    onChange={(e) => setDoctorFee(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">
                Doctor fee is currently unchecked (0 {currency}). Check the box above if the patient consulted a doctor.
              </div>
            )}
          </div>

          {/* STEP 3: LABORATORY / DIAGNOSTIC TESTS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-[#1D5464]" />
                  <h2 className="text-sm font-bold text-slate-900">
                    3. Laboratory / Diagnostic Tests &amp; Test Fees (If Patient Had Tests)
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Add any blood test, X-Ray, Ultrasound, ECG, or custom test and customize its fee
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLabRow}
                className="px-3 py-1.5 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lab Test</span>
              </button>
            </div>

            {labRows.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-500 flex items-center justify-between">
                <span>No laboratory test added to this bill yet.</span>
                <button
                  type="button"
                  onClick={handleAddLabRow}
                  className="text-[#1D5464] font-semibold underline cursor-pointer"
                >
                  + Click to Add Test &amp; Fee
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {labRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Quick Select Test
                      </label>
                      <select
                        value={row.preset}
                        onChange={(e) => {
                          const found = LAB_TEST_PRESETS.find((p) => p.label === e.target.value);
                          const next = [...labRows];
                          next[idx] = {
                            ...next[idx],
                            preset: e.target.value,
                            testName: found ? found.testName : next[idx].testName,
                            testCode: found ? found.testCode : 'LAB-CUS',
                            category: found ? found.category : 'Biochemistry',
                            price: found ? found.price : next[idx].price,
                          };
                          setLabRows(next);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
                      >
                        {LAB_TEST_PRESETS.map((p) => (
                          <option key={p.label} value={p.label}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Test Name (Customizable)
                      </label>
                      <input
                        type="text"
                        value={row.testName}
                        onChange={(e) => {
                          const next = [...labRows];
                          next[idx].testName = e.target.value;
                          setLabRows(next);
                        }}
                        placeholder="Write test name..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-medium"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) => {
                          const next = [...labRows];
                          next[idx].qty = Math.max(1, Number(e.target.value));
                          setLabRows(next);
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono text-right text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Test Fee ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={row.price}
                        onChange={(e) => {
                          const next = [...labRows];
                          next[idx].price = Math.max(0, Number(e.target.value));
                          setLabRows(next);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setLabRows(labRows.filter((_, i) => i !== idx))}
                        className="h-8 w-8 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 inline-flex items-center justify-center cursor-pointer"
                        title="Remove Test"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 4: MEDICINES FROM PHARMACY STOCK (AUTO-DEDUCTS FROM STOCK) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#1D5464]" />
                  <h2 className="text-sm font-bold text-slate-900">
                    4. Medicines Prescribed to Patient (Automatically Deducts from Pharmacy Stock)
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select medicines given to this patient — quantities are automatically deducted from Pharmacy Stock &amp; wholesale cost is deducted
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMedicineRow}
                className="px-3 py-1.5 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine from Stock</span>
              </button>
            </div>

            {medicineRows.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-500 flex items-center justify-between">
                <span>No medicine added to this patient bill yet.</span>
                <button
                  type="button"
                  onClick={handleAddMedicineRow}
                  className="text-[#1D5464] font-semibold underline cursor-pointer"
                >
                  + Click to Add Medicine from Stock
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {medicineRows.map((row, idx) => {
                  const batch = pharmacyBatches.find((b) => b.id === row.batchId);
                  const remainingStock = batch ? Math.max(0, batch.stockQty - row.qty) : 0;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-6">
                          <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                            Select Medicine from Pharmacy Stock
                          </label>
                          <select
                            value={row.batchId}
                            onChange={(e) => {
                              const nextBatch = pharmacyBatches.find(
                                (b) => b.id === e.target.value
                              );
                              const next = [...medicineRows];
                              next[idx] = {
                                ...next[idx],
                                batchId: e.target.value,
                                unitPrice: nextBatch ? nextBatch.retailPrice : 0,
                              };
                              setMedicineRows(next);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-medium"
                          >
                            {pharmacyBatches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.brandName} [{b.batchNo}] — In Stock: {b.stockQty} · Price: {b.retailPrice} {currency}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                            Qty (Units)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={batch?.stockQty || 9999}
                            value={row.qty}
                            onChange={(e) => {
                              const next = [...medicineRows];
                              next[idx].qty = Math.max(1, Number(e.target.value));
                              setMedicineRows(next);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-right text-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                            Unit Price ({currency})
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={row.unitPrice}
                            onChange={(e) => {
                              const next = [...medicineRows];
                              next[idx].unitPrice = Math.max(0, Number(e.target.value));
                              setMedicineRows(next);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setMedicineRows(medicineRows.filter((_, i) => i !== idx))
                            }
                            className="h-8 w-8 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 inline-flex items-center justify-center cursor-pointer"
                            title="Remove Medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {batch && (
                        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-600 pt-1">
                          <span>
                            Current Stock: <strong>{batch.stockQty}</strong> → Stock After Bill:{' '}
                            <strong className="text-emerald-700">{remainingStock} units</strong> (Deducted: -{row.qty})
                          </span>
                          <span>
                            Line Total:{' '}
                            <strong className="text-slate-900">
                              {(row.qty * row.unitPrice).toLocaleString()} {currency}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 5: CUSTOMIZE BILL — EXTRA ITEMS (DRIP, INJECTION, BED, DRESSING, CANNULA, ETC.) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <Syringe className="w-4 h-4 text-[#1D5464]" />
                  <h2 className="text-sm font-bold text-slate-900">
                    5. Customize Bill — Extra Items (Drip, Injection, Cannula, Bed, Dressing, etc.)
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click any quick preset button below or add custom items (e.g., Drip, Injection, Stitching, Oxygen) and set your own price
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExtraRows([
                    ...extraRows,
                    { description: '', qty: 1, unitPrice: 500, unitCost: 0 },
                  ])
                }
                className="px-3 py-1.5 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Item Row</span>
              </button>
            </div>

            {/* Quick-Add Extra Item Buttons (Drip, Injection, Cannula, Bed, Dressing, Nebulizer) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {EXTRA_ITEM_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAddExtraPreset(preset)}
                  className="px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-slate-800 font-semibold text-[11px] cursor-pointer transition-colors"
                >
                  {preset.label} ({preset.unitPrice} {currency})
                </button>
              ))}
            </div>

            {extraRows.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-500">
                No extra items added. Use the buttons above to add Drip, Injection, Bed, or Custom Charges.
              </div>
            ) : (
              <div className="space-y-2">
                {extraRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Extra Item / Service Name (Drip, Injection, Dressing, etc.)
                      </label>
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => {
                          const next = [...extraRows];
                          next[idx].description = e.target.value;
                          setExtraRows(next);
                        }}
                        placeholder="e.g., IV Drip + Injection / Dressing / Bed Charge"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-medium"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) => {
                          const next = [...extraRows];
                          next[idx].qty = Math.max(1, Number(e.target.value));
                          setExtraRows(next);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-right text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Price ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={row.unitPrice}
                        onChange={(e) => {
                          const next = [...extraRows];
                          next[idx].unitPrice = Math.max(0, Number(e.target.value));
                          setExtraRows(next);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setExtraRows(extraRows.filter((_, i) => i !== idx))}
                        className="h-8 w-8 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 inline-flex items-center justify-center cursor-pointer"
                        title="Remove Extra Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 4 COLUMNS: LIVE TOTAL BILL CALCULATION, HOME DEDUCTION & PRINTER / VIRTUAL BILL PANEL */}
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-white border-2 border-[#1D5464]/30 rounded-xl p-5 space-y-4 text-xs sticky top-4">
            <div className="pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Patient Bill Total, Stock &amp; Home Calculation Summary
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Live breakdown of all items, stock deduction, Home P&amp;L deduction, and Printer / Virtual Bill options
              </p>
            </div>

            {/* Category Subtotals Breakdown */}
            <div className="space-y-2 font-mono text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex justify-between text-slate-700">
                <span>1. Doctor Consultation Fee:</span>
                <span className="font-bold">
                  {doctorFeeSubtotal.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>2. Lab Tests ({labRows.length} tests):</span>
                <span className="font-bold">
                  {labSubtotal.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>
                  3. Medicines ({medicineSummary.totalUnits} units from Stock):
                </span>
                <span className="font-bold">
                  {medicineSummary.subtotal.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>4. Extra Items (Drip/Injection):</span>
                <span className="font-bold">
                  {extraSummary.subtotal.toLocaleString()} {currency}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-800 font-semibold">
                <span>Gross Bill Subtotal:</span>
                <span>
                  {grossSubtotal.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Less Discount:</span>
                <span>
                  -{safeDiscount.toLocaleString()} {currency}
                </span>
              </div>
              <div className="pt-2 border-t-2 border-slate-900 flex justify-between text-base font-bold text-slate-900">
                <span>TOTAL BILL:</span>
                <span>
                  {netGrandTotal.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                <span>Amount Paid Now:</span>
                <span>
                  {effectivePaidAmount.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold">
                <span>Remaining Balance:</span>
                <span>
                  {remainingBalance.toLocaleString()} {currency}
                </span>
              </div>
            </div>

            {/* Discount, Paid Amount & Department Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Discount ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Paid Amount ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  value={
                    paidAmountOverride !== '' ? paidAmountOverride : netGrandTotal
                  }
                  onChange={(e) => setPaidAmountOverride(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  <option value="CASH">Cash Counter</option>
                  <option value="CARD">Card / POS</option>
                  <option value="BANK_TRANSFER">Bank / Online</option>
                  <option value="CREDIT_LEDGER">Credit (Unpaid)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Department Type
                </label>
                <select
                  value={department}
                  onChange={(e) =>
                    setDepartment(e.target.value as 'HOSPITAL_OPD' | 'HOSPITAL_IPD')
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  <option value="HOSPITAL_OPD">OPD / Emergency</option>
                  <option value="HOSPITAL_IPD">IPD / Ward Admission</option>
                </select>
              </div>
            </div>

            {/* Home Calculation & Stock Deduction Rule Selector */}
            <div className="p-3 rounded-lg bg-[#F1F5F8] border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-[11px]">
                Home Calculation &amp; Stock Deduction Mode:
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => setHomeCalculationMode('DEDUCT_BILL_FROM_HOME')}
                  className={`p-2 rounded-md text-left border text-[11px] cursor-pointer transition-colors ${
                    homeCalculationMode === 'DEDUCT_BILL_FROM_HOME'
                      ? 'bg-[#1D5464] text-white border-[#1D5464] font-semibold'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  ✓ Deduct Patient Bill ({netGrandTotal.toLocaleString()} {currency}) from Home Calculation &amp; Deduct Medicines ({medicineSummary.totalUnits} units) from Stock
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHomeCalculationMode('STANDARD_REVENUE_AND_DEDUCT_COST')
                  }
                  className={`p-2 rounded-md text-left border text-[11px] cursor-pointer transition-colors ${
                    homeCalculationMode === 'STANDARD_REVENUE_AND_DEDUCT_COST'
                      ? 'bg-[#1D5464] text-white border-[#1D5464] font-semibold'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  ✓ Add Bill to Hospital Revenue &amp; Deduct Stock/Item Cost ({totalCostOfBill.toLocaleString()} {currency}) from Home Calculation
                </button>
              </div>
            </div>

            {/* Printer Connection vs Virtual Bill Mode Selector */}
            <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-[11px]">
                  Printer Connection &amp; Virtual Bill Mode:
                </span>
                <span className="font-mono text-[10px] text-emerald-800 font-bold">
                  {printerConnectionMode === 'CONNECTED_PRINTER'
                    ? 'PRINTER CONNECTED'
                    : 'VIRTUAL BILL + PRINT READY'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPrinterConnectionMode('AUTO_VIRTUAL')}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold border cursor-pointer ${
                    printerConnectionMode === 'AUTO_VIRTUAL'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Virtual Bill (No Printer Needed)
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterConnectionMode('CONNECTED_PRINTER')}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold border cursor-pointer ${
                    printerConnectionMode === 'CONNECTED_PRINTER'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Connected Printer Mode
                </button>
              </div>
            </div>

            {/* Action Buttons: Generate Virtual Bill OR Print on Connected Printer */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  handleSubmitForm(
                    printerConnectionMode === 'CONNECTED_PRINTER'
                      ? 'DIRECT_HARDWARE_PRINT'
                      : 'OPEN_VIRTUAL_AND_PRINT_MODAL'
                  )
                }
                className="w-full py-3 px-4 rounded-lg bg-[#1D5464] hover:bg-[#16424F] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>
                  {printerConnectionMode === 'CONNECTED_PRINTER'
                    ? `Save Bill & Print on Connected Printer (${netGrandTotal.toLocaleString()} ${currency})`
                    : `Generate Virtual Bill & Save to History (${netGrandTotal.toLocaleString()} ${currency})`}
                </span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitForm('DIRECT_HARDWARE_PRINT')}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Direct Print on Connected Printer (Thermal / A4)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const draft = buildDraftInvoiceFromForm();
                  onOpenPrintableInvoice(draft);
                }}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 shrink-0 text-[#1D5464]" />
                <span>Instant Preview / Print Slip (Even Without Details)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 6: DATE-WISE TOTAL PATIENTS & TOTAL BILLING HISTORY
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1D5464]" />
              <h3 className="text-base font-bold text-slate-900">
                06. Date-Wise Total Patients &amp; Total Bills History (Date ke Hisab se Total Patients aur Total Bills)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically saves how many total patients visited/billed on each date, along with Doctor Fees, Lab Tests, Medicines, Extra Items, and Grand Total Bill
            </p>
          </div>
          {selectedHistoryDate && (
            <button
              type="button"
              onClick={() => setSelectedHistoryDate('')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Show All Dates ({dateWisePatientBillingSummary.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 font-semibold">Date</th>
                <th className="py-2.5 font-semibold">Total Patients on Date &amp; Names</th>
                <th className="py-2.5 font-semibold text-right">Bills Count</th>
                <th className="py-2.5 font-semibold text-right">Doctor Fee ({currency})</th>
                <th className="py-2.5 font-semibold text-right">Lab Tests ({currency})</th>
                <th className="py-2.5 font-semibold text-right">Medicines &amp; Stock Deducted</th>
                <th className="py-2.5 font-semibold text-right">Extra (Drip/Inj) ({currency})</th>
                <th className="py-2.5 font-semibold text-right">Date Total Bill ({currency})</th>
                <th className="py-2.5 font-semibold text-right">Filter Bills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dateWisePatientBillingSummary.map((row) => (
                <tr key={row.date} className="hover:bg-slate-50">
                  <td className="py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="font-bold text-[#1D5464]">
                      Total Patients: {row.totalPatientsCount} Patients
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {row.patientNames.join(', ') || 'No patients recorded'}
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                    {row.billsCount} Bills
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-800">
                    {row.doctorFeeTotal.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-800">
                    {row.labTotal.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-800">
                    <div>{row.medicineTotal.toLocaleString()}</div>
                    <div className="text-[10px] text-rose-700 font-semibold">
                      Stock Deducted: -{row.stockUnitsDeducted} units
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-800">
                    {row.extraCustomTotal.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                    {row.grandTotalBilled.toLocaleString()} {currency}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const summaryInv: Invoice = {
                          id: `DATE-SUM-${row.date}`,
                          invoiceNo: `DAILY-${row.date}`,
                          customerName: `Daily Summary: ${row.totalPatientsCount} Total Patients (${row.billsCount} Bills)`,
                          patientAddress: row.patientNames.join(', ') || 'Hospital Daily Register',
                          department: 'HOSPITAL_OPD',
                          items: [
                            {
                              description: `Doctor Consultation Fees Total (${row.date})`,
                              qty: 1,
                              unitPrice: row.doctorFeeTotal,
                              unitCost: 0,
                              lineTotal: row.doctorFeeTotal,
                              category: 'DOCTOR_FEE',
                            },
                            {
                              description: `Diagnostic Lab Tests Total (${row.date})`,
                              qty: 1,
                              unitPrice: row.labTotal,
                              unitCost: 0,
                              lineTotal: row.labTotal,
                              category: 'LAB_TEST',
                            },
                            {
                              description: `Pharmacy Medicines Total (Stock Deducted: ${row.stockUnitsDeducted} units)`,
                              qty: 1,
                              unitPrice: row.medicineTotal,
                              unitCost: 0,
                              lineTotal: row.medicineTotal,
                              category: 'MEDICINE',
                            },
                            {
                              description: `Extra Items Total (Drip / Injection / Bed / Procedure)`,
                              qty: 1,
                              unitPrice: row.extraCustomTotal,
                              unitCost: 0,
                              lineTotal: row.extraCustomTotal,
                              category: 'EXTRA_CUSTOM',
                            },
                          ],
                          subtotal: row.grandTotalBilled,
                          discount: 0,
                          netTotal: row.grandTotalBilled,
                          paidAmount: row.totalPaid,
                          refundedAmount: 0,
                          status: 'PAID',
                          paymentMethod: 'CASH',
                          businessDate: row.date,
                          paymentDate: row.date,
                          finalized: true,
                          createdAt: new Date().toISOString(),
                          isVirtualBill: true,
                        };
                        onOpenPrintableInvoice(summaryInv);
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print Date Summary</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedHistoryDate(
                          selectedHistoryDate === row.date ? '' : row.date
                        )
                      }
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        selectedHistoryDate === row.date
                          ? 'bg-[#1D5464] text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {selectedHistoryDate === row.date ? 'Showing Date' : 'View Date Bills'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          SECTION 7: COMPLETE SAVED PATIENT BILLS & VIRTUAL BILLS HISTORY
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">
                07. Saved Patient Bills &amp; Virtual Receipts History (Total Bills: {patientBillsHistory.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Every bill is saved here with its itemized total. Click &ldquo;Virtual Bill / Print&rdquo; anytime to view the Virtual Bill or print on a connected printer.
            </p>
          </div>
          <div className="relative w-full sm:w-80 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={billHistorySearch}
              onChange={(e) => setBillHistorySearch(e.target.value)}
              placeholder="Search by patient, bill no, date, drip, test..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 font-semibold">Bill No &amp; Date</th>
                <th className="py-2.5 font-semibold">Patient Details &amp; Doctor</th>
                <th className="py-2.5 font-semibold">
                  Itemized Breakdown (Doctor / Test / Medicine / Extra Drip &amp; Injection)
                </th>
                <th className="py-2.5 font-semibold text-right">Total Bill ({currency})</th>
                <th className="py-2.5 font-semibold text-right">Paid ({currency})</th>
                <th className="py-2.5 font-semibold">Mode &amp; Status</th>
                <th className="py-2.5 font-semibold text-right">Virtual Bill / Print / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patientBillsHistory.map((inv) => {
                const hasStockItems = inv.items.some((it) => Boolean(it.batchId));
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div>{inv.invoiceNo}</div>
                      <div className="text-slate-500 font-normal">{inv.businessDate}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="font-bold text-slate-900">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {inv.patientMrn ? `${inv.patientMrn} · ` : ''}
                        {inv.patientAge ? `${inv.patientAge}y ` : ''}
                        {inv.patientGender ? `(${inv.patientGender}) ` : ''}
                        {inv.patientPhone || ''}
                      </div>
                      {inv.doctorName && (
                        <div className="text-[11px] text-[#1D5464] font-semibold">
                          Dr: {inv.doctorName}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="space-y-0.5">
                        {inv.items.map((it, i) => (
                          <div key={i} className="text-slate-800">
                            • {it.qty}x {it.description} —{' '}
                            <strong className="font-mono">
                              {it.lineTotal.toLocaleString()} {currency}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      {inv.netTotal.toLocaleString()} {currency}
                      {inv.discount > 0 && (
                        <span className="block text-[10px] text-slate-500 font-normal">
                          Disc: -{inv.discount.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                      {inv.paidAmount.toLocaleString()} {currency}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">{inv.status}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold">
                        Virtual Bill + Print Ready
                      </div>
                      {inv.homeCalculationMode === 'DEDUCT_BILL_FROM_HOME' && (
                        <div className="text-[10px] text-rose-700 font-semibold">
                          Deducted from Home P&amp;L
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenPrintableInvoice(inv)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-[#1D5464] hover:bg-[#16424F] rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Virtual Bill / View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onDirectHardwarePrint) {
                            onDirectHardwarePrint(inv, 'A4');
                          } else {
                            onOpenPrintableInvoice(inv);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded inline-flex items-center gap-1 cursor-pointer"
                        title="Send directly to connected printer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Direct Printer</span>
                      </button>
                      {hasStockItems && inv.status !== 'REFUNDED' && (
                        <button
                          type="button"
                          onClick={() => onReturnMedicineSale(inv)}
                          className="px-2 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded inline-flex items-center gap-1 cursor-pointer"
                          title="Return medicines to Pharmacy Stock"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Return Stock</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteInvoice(inv)}
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
  );
};
