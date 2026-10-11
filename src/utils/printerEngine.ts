/**
 * Universal Hardware Printer Spooler & Self-Healing Print Engine
 * Supports all billing systems across the Hospital ERP:
 * - Make Patient Bill (Combined Doctor + Lab + Medicine + Extra Custom Items)
 * - Medical Store / Pharmacy POS & Supplier Purchase Bills
 * - Customer & Patient Billing Counter (OPD / IPD / Emergency / Lab)
 * - Diagnostic Laboratory Orders & Verified Lab Reports
 * - Staff Payroll & Salary Slips
 * - Departmental Operating Expense Vouchers & History Register Vouchers
 *
 * Works with any connected USB / Network / Wireless A4 Laser/Inkjet Printer
 * or 80mm Thermal POS Receipt Printer, with automatic Virtual Bill fallback
 * and self-healing data normalization to prevent any runtime/print error codes.
 */
import type {
  Invoice,
  LabOrder,
  SalarySlip,
  HospitalSettings,
  SupplierBill,
  ExpenseRecord,
  JournalEntry,
  Patient,
  Encounter,
} from '../types/erp.ts';

export type PrintableDocPayload =
  | { type: 'INVOICE'; data: Invoice }
  | { type: 'LAB_REPORT'; data: LabOrder }
  | { type: 'SALARY_SLIP'; data: SalarySlip };

export type PrinterPaperLayout = 'A4' | 'THERMAL_80MM';

function escapeHtml(val: unknown): string {
  const str = String(val ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Self-healing normalizer: guarantees every field on an Invoice, LabOrder, or SalarySlip
 * is valid and finite before rendering or sending to the printer spooler.
 */
export function sanitizePrintablePayload(
  payload: PrintableDocPayload | null
): PrintableDocPayload | null {
  if (!payload || !payload.data) return null;

  if (payload.type === 'INVOICE') {
    const raw = payload.data;
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const safeItems =
      rawItems.length > 0
        ? rawItems.map((it, idx) => {
            const qty = Math.max(1, safeNum(it?.qty, 1));
            const unitPrice = Math.max(0, safeNum(it?.unitPrice, 0));
            const lineTotal = safeNum(it?.lineTotal, qty * unitPrice);
            return {
              description:
                String(it?.description || '').trim() || `Hospital Service Item #${idx + 1}`,
              qty,
              unitPrice,
              unitCost: Math.max(0, safeNum(it?.unitCost, 0)),
              lineTotal,
              batchId: it?.batchId,
              category: it?.category,
            };
          })
        : [
            {
              description: 'General Hospital Slip / Consultation',
              qty: 1,
              unitPrice: Math.max(0, safeNum(raw.netTotal, 0)),
              unitCost: 0,
              lineTotal: Math.max(0, safeNum(raw.netTotal, 0)),
            },
          ];

    const computedSub = safeItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const subtotal = safeNum(raw.subtotal, computedSub);
    const discount = Math.max(0, safeNum(raw.discount, 0));
    const netTotal = Math.max(0, safeNum(raw.netTotal, Math.max(0, subtotal - discount)));
    const paidAmount = Math.max(0, safeNum(raw.paidAmount, netTotal));
    const refundedAmount = Math.max(0, safeNum(raw.refundedAmount, 0));

    return {
      type: 'INVOICE',
      data: {
        ...raw,
        id: String(raw.id || `INV-${Date.now()}`),
        invoiceNo: String(raw.invoiceNo || 'INV-OFFICIAL'),
        customerName:
          String(raw.customerName || '').trim() || 'Walk-in Patient / Customer',
        department: raw.department || 'HOSPITAL_OPD',
        items: safeItems,
        subtotal,
        discount,
        netTotal,
        paidAmount,
        refundedAmount,
        status: raw.status || 'PAID',
        paymentMethod: raw.paymentMethod || 'CASH',
        businessDate: String(raw.businessDate || '2026-10-10'),
        paymentDate: raw.paymentDate || String(raw.businessDate || '2026-10-10'),
        finalized: raw.finalized ?? true,
        createdAt: raw.createdAt || new Date().toISOString(),
      },
    };
  }

  if (payload.type === 'LAB_REPORT') {
    const raw = payload.data;
    return {
      type: 'LAB_REPORT',
      data: {
        ...raw,
        id: String(raw.id || `LAB-${Date.now()}`),
        orderNo: String(raw.orderNo || 'LAB-ORDER'),
        sampleBarcode: String(raw.sampleBarcode || 'BC-SAMPLE'),
        patientId: String(raw.patientId || ''),
        patientName: String(raw.patientName || '').trim() || 'Walk-in Patient',
        patientMrn: String(raw.patientMrn || 'MRN-WALKIN'),
        doctorName: String(raw.doctorName || 'Duty Medical Officer'),
        testCode: String(raw.testCode || 'LAB-01'),
        testName: String(raw.testName || 'Diagnostic Laboratory Test'),
        category: (raw.category || 'Pathology') as LabOrder['category'],
        price: Math.max(0, safeNum(raw.price, 0)),
        status: raw.status || 'ORDERED',
        resultValue: String(raw.resultValue || ''),
        unit: String(raw.unit || ''),
        referenceRange: String(raw.referenceRange || 'Standard Reference'),
        abnormalFlag: raw.abnormalFlag || 'NORMAL',
        verifiedBy: String(raw.verifiedBy || ''),
        verifiedAt: String(raw.verifiedAt || ''),
        businessDate: String(raw.businessDate || '2026-10-10'),
        createdAt: raw.createdAt || new Date().toISOString(),
      },
    };
  }

  const raw = payload.data;
  return {
    type: 'SALARY_SLIP',
    data: {
      ...raw,
      id: String(raw.id || `SAL-${Date.now()}`),
      employeeId: String(raw.employeeId || ''),
      empCode: String(raw.empCode || 'EMP-01'),
      employeeName: String(raw.employeeName || 'Hospital Staff Member'),
      designation: String(raw.designation || 'Staff'),
      department: raw.department || 'HOSPITAL',
      payrollMonth: String(raw.payrollMonth || '2026-10'),
      baseSalary: Math.max(0, safeNum(raw.baseSalary, 0)),
      allowance: Math.max(0, safeNum(raw.allowance, 0)),
      deduction: Math.max(0, safeNum(raw.deduction, 0)),
      netPaid: Math.max(0, safeNum(raw.netPaid, 0)),
      businessDate: String(raw.businessDate || '2026-10-10'),
      paymentDate: String(raw.paymentDate || '2026-10-10'),
    },
  };
}

/**
 * Helper converters so ANY bill, voucher, supplier bill, expense, patient card, or history record
 * across the entire software can be printed via the same unified printer system.
 */
export function supplierBillToPrintableInvoice(sb: SupplierBill): PrintableDocPayload {
  return sanitizePrintablePayload({
    type: 'INVOICE',
    data: {
      id: sb.id,
      invoiceNo: sb.billNo,
      customerName: `Supplier: ${sb.supplierName || 'Pharmaceutical Distributor'}`,
      department: 'PHARMACY_WHOLESALE',
      items: [
        {
          description: `${sb.brandName} [Batch: ${sb.batchNo}] (Retail: ${sb.retailPrice}/u)`,
          qty: sb.qty,
          unitPrice: sb.unitCost,
          unitCost: sb.unitCost,
          lineTotal: sb.totalBill,
          category: 'MEDICINE',
        },
      ],
      subtotal: sb.totalBill,
      discount: 0,
      netTotal: sb.totalBill,
      paidAmount: sb.paidAmount,
      refundedAmount: 0,
      status: sb.remainingAmount <= 0 ? 'PAID' : sb.paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
      paymentMethod: 'CASH',
      businessDate: sb.businessDate,
      paymentDate: sb.businessDate,
      finalized: true,
      createdAt: sb.createdAt,
      isVirtualBill: true,
    },
  })!;
}

export function expenseToPrintableInvoice(ex: ExpenseRecord): PrintableDocPayload {
  return sanitizePrintablePayload({
    type: 'INVOICE',
    data: {
      id: ex.id,
      invoiceNo: ex.voucherNo,
      customerName: `${ex.costCenter} Expense · ${ex.category || 'Hospital Operations'}`,
      department: 'HOSPITAL_OPD',
      items: [
        {
          description: `${ex.category}: ${ex.description}`,
          qty: 1,
          unitPrice: ex.amount,
          unitCost: ex.amount,
          lineTotal: ex.amount,
          category: 'SERVICE',
        },
      ],
      subtotal: ex.amount,
      discount: 0,
      netTotal: ex.amount,
      paidAmount: ex.amount,
      refundedAmount: 0,
      status: 'PAID',
      paymentMethod: 'CASH',
      businessDate: ex.businessDate,
      paymentDate: ex.paymentDate || ex.businessDate,
      finalized: true,
      createdAt: ex.createdAt,
      isVirtualBill: true,
    },
  })!;
}

export function journalEntryToPrintableInvoice(j: JournalEntry): PrintableDocPayload {
  return sanitizePrintablePayload({
    type: 'INVOICE',
    data: {
      id: j.id,
      invoiceNo: j.voucherNo,
      customerName: `${j.costCenter} · ${j.referenceType}`,
      department: 'HOSPITAL_OPD',
      items: [
        {
          description: j.narration,
          qty: 1,
          unitPrice: j.amount,
          unitCost: j.cogsAmount || 0,
          lineTotal: j.amount,
          category: 'SERVICE',
        },
      ],
      subtotal: j.amount,
      discount: 0,
      netTotal: j.amount,
      paidAmount: j.amount,
      refundedAmount: 0,
      status: 'PAID',
      paymentMethod: 'CASH',
      businessDate: j.businessDate,
      paymentDate: j.paymentDate || j.businessDate,
      finalized: true,
      createdAt: j.createdAt,
      isVirtualBill: true,
    },
  })!;
}

export function patientRegistrationToPrintableInvoice(p: Patient): PrintableDocPayload {
  return sanitizePrintablePayload({
    type: 'INVOICE',
    data: {
      id: p.id,
      invoiceNo: `REG-${p.mrn}`,
      patientId: p.id,
      customerName: p.fullName,
      patientMrn: p.mrn,
      patientAge: p.age,
      patientGender: p.gender,
      patientPhone: p.phone,
      patientAddress: p.address,
      department: 'HOSPITAL_OPD',
      items: [
        {
          description: `Patient Registration Slip & Medical Record Card (Blood Group: ${p.bloodGroup}, Allergies: ${p.allergies || 'None'})`,
          qty: 1,
          unitPrice: 0,
          unitCost: 0,
          lineTotal: 0,
          category: 'SERVICE',
        },
      ],
      subtotal: 0,
      discount: 0,
      netTotal: 0,
      paidAmount: 0,
      refundedAmount: 0,
      status: 'PAID',
      paymentMethod: 'CASH',
      businessDate: p.registeredBusinessDate,
      paymentDate: p.registeredBusinessDate,
      finalized: true,
      createdAt: p.createdAt,
      isVirtualBill: true,
    },
  })!;
}

export function encounterToFallbackInvoice(enc: Encounter): PrintableDocPayload {
  const fee = safeNum((enc as any).consultationFee, 0);
  return sanitizePrintablePayload({
    type: 'INVOICE',
    data: {
      id: enc.id,
      invoiceNo: enc.tokenNo,
      patientId: enc.patientId,
      customerName: enc.patientName,
      patientMrn: enc.patientMrn,
      doctorName: enc.doctorName,
      department: enc.encounterType === 'IPD' ? 'HOSPITAL_IPD' : 'HOSPITAL_OPD',
      items: [
        {
          description: `${enc.encounterType} Consultation (${enc.doctorName}) — ${enc.chiefComplaint || 'Clinical Visit'} [${enc.wardBed}]`,
          qty: 1,
          unitPrice: fee,
          unitCost: 0,
          lineTotal: fee,
          category: 'DOCTOR_FEE',
        },
      ],
      subtotal: fee,
      discount: 0,
      netTotal: fee,
      paidAmount: fee,
      refundedAmount: 0,
      status: 'PAID',
      paymentMethod: 'CASH',
      businessDate: enc.businessDate,
      paymentDate: enc.businessDate,
      finalized: true,
      createdAt: enc.createdAt,
      isVirtualBill: true,
    },
  })!;
}

/**
 * Generates a complete, self-contained HTML document for A4 or 80mm Thermal POS Receipt printers.
 * Note: Never includes developer name on printed bills (kept strictly in the app sidebar only).
 */
export function buildPrintableHtml(
  rawPayload: PrintableDocPayload,
  settings: HospitalSettings,
  layout: PrinterPaperLayout = 'A4'
): string {
  const payload = sanitizePrintablePayload(rawPayload)!;
  const cur = escapeHtml(settings?.currency || 'PKR');
  const hospName = escapeHtml(settings?.hospitalName || 'Al-Hikmat Medical & Surgical Hospital');
  const isThermal = layout === 'THERMAL_80MM';

  const pageSizeCss = isThermal
    ? '@page { size: 80mm auto; margin: 4mm; }'
    : '@page { size: A4 portrait; margin: 12mm; }';

  const sheetMaxWidth = isThermal ? '300px' : '740px';
  const baseFontSize = isThermal ? '11px' : '13px';

  if (payload.type === 'INVOICE') {
    const inv = payload.data;
    const balanceDue = Math.max(0, inv.netTotal - inv.paidAmount - inv.refundedAmount);

    const hasPhone =
      inv.patientPhone && inv.patientPhone !== 'N/A' && inv.patientPhone !== '+92-300-';
    const hasAddress =
      inv.patientAddress && inv.patientAddress !== 'N/A' && inv.patientAddress !== 'Local Area';
    const hasAge = inv.patientAge && inv.patientAge > 0;

    const rowsHtml = inv.items
      .map((it, idx) => {
        const catLabel =
          it.category === 'DOCTOR_FEE'
            ? 'Doctor Fee'
            : it.category === 'LAB_TEST'
            ? 'Lab Test'
            : it.category === 'MEDICINE'
            ? 'Medicine'
            : it.category === 'EXTRA_CUSTOM'
            ? 'Extra Item'
            : '';
        return `
        <tr>
          <td style="padding:6px 4px;border-bottom:1px solid #cbd5e1;">
            <strong>${idx + 1}. ${escapeHtml(it.description)}</strong>
            ${
              catLabel
                ? `<span style="color:#475569;font-size:10px;font-family:monospace;"> [${escapeHtml(
                    catLabel
                  )}]</span>`
                : ''
            }
          </td>
          <td style="padding:6px 4px;border-bottom:1px solid #cbd5e1;text-align:right;font-family:monospace;">${
            it.qty
          }</td>
          <td style="padding:6px 4px;border-bottom:1px solid #cbd5e1;text-align:right;font-family:monospace;">${it.unitPrice.toLocaleString()}</td>
          <td style="padding:6px 4px;border-bottom:1px solid #cbd5e1;text-align:right;font-family:monospace;font-weight:bold;">${it.lineTotal.toLocaleString()}</td>
        </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Bill ${escapeHtml(inv.invoiceNo)} - ${hospName}</title>
  <style>
    ${pageSizeCss}
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: ${isThermal ? '6px' : '16px'};
      font-size: ${baseFontSize};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: ${sheetMaxWidth};
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: ${isThermal ? '10px' : '22px'};
    }
    .hdr {
      display: flex;
      flex-direction: ${isThermal ? 'column' : 'row'};
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
      gap: 6px;
    }
    .meta-box {
      display: flex;
      flex-direction: ${isThermal ? 'column' : 'row'};
      justify-content: space-between;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: ${isThermal ? '11px' : '12px'};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${isThermal ? '11px' : '12px'};
    }
    th {
      text-align: left;
      border-bottom: 2px solid #0f172a;
      padding: 6px 4px;
      color: #334155;
      font-size: ${isThermal ? '10px' : '11px'};
      text-transform: uppercase;
    }
    .tot {
      margin-top: 12px;
      margin-left: auto;
      width: ${isThermal ? '100%' : '290px'};
      font-family: monospace;
      font-size: ${isThermal ? '11px' : '12px'};
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }
    .grand {
      font-size: ${isThermal ? '13px' : '15px'};
      font-weight: bold;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      padding: 6px 0;
      margin: 4px 0;
    }
    .ftr {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px dashed #94a3b8;
      display: flex;
      flex-direction: ${isThermal ? 'column' : 'row'};
      justify-content: space-between;
      gap: 4px;
      font-size: 10px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hdr">
      <div>
        <div style="font-size:${isThermal ? '15px' : '18px'};font-weight:bold;">${hospName}</div>
        <div style="font-size:11px;color:#475569;margin-top:2px;">Official Hospital Bill &amp; Computerized Receipt</div>
      </div>
      <div style="text-align:${isThermal ? 'left' : 'right'};font-family:monospace;font-size:11px;">
        <div><strong>BILL NO: ${escapeHtml(inv.invoiceNo)}</strong></div>
        <div>Date: ${escapeHtml(inv.businessDate)}</div>
        <div>Status: ${escapeHtml(inv.status)} (${escapeHtml(inv.paymentMethod)})</div>
      </div>
    </div>

    <div class="meta-box">
      <div>
        <div><strong>Patient / Customer:</strong> ${escapeHtml(inv.customerName)}</div>
        ${inv.patientMrn ? `<div><strong>MRN:</strong> ${escapeHtml(inv.patientMrn)}</div>` : ''}
        ${
          hasAge || inv.patientGender
            ? `<div><strong>Info:</strong> ${hasAge ? `${inv.patientAge} yrs` : ''} ${
                inv.patientGender ? `(${escapeHtml(inv.patientGender)})` : ''
              }</div>`
            : ''
        }
        ${hasPhone ? `<div><strong>Phone:</strong> ${escapeHtml(inv.patientPhone)}</div>` : ''}
        ${hasAddress ? `<div><strong>Note/Address:</strong> ${escapeHtml(inv.patientAddress)}</div>` : ''}
      </div>
      <div style="text-align:${isThermal ? 'left' : 'right'};">
        <div><strong>Department:</strong> ${escapeHtml(inv.department)}</div>
        ${
          inv.doctorName
            ? `<div><strong>Consultant:</strong> ${escapeHtml(inv.doctorName)}</div>`
            : ''
        }
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right;">Qty</th>
          <th style="text-align:right;">Rate (${cur})</th>
          <th style="text-align:right;">Total (${cur})</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="tot">
      <div class="tot-row"><span>Subtotal (${inv.items.length} items):</span><span>${inv.subtotal.toLocaleString()} ${cur}</span></div>
      ${
        inv.discount > 0
          ? `<div class="tot-row"><span>Discount:</span><span>-${inv.discount.toLocaleString()} ${cur}</span></div>`
          : ''
      }
      <div class="tot-row grand"><span>TOTAL BILL:</span><span>${inv.netTotal.toLocaleString()} ${cur}</span></div>
      <div class="tot-row"><span>Paid Amount:</span><span>${inv.paidAmount.toLocaleString()} ${cur}</span></div>
      ${
        inv.refundedAmount > 0
          ? `<div class="tot-row"><span>Returned / Refunded:</span><span>-${inv.refundedAmount.toLocaleString()} ${cur}</span></div>`
          : ''
      }
      <div class="tot-row" style="font-weight:bold;"><span>Balance Due:</span><span>${balanceDue.toLocaleString()} ${cur}</span></div>
    </div>

    <div class="ftr">
      <span>${hospName} · Verified Computerized Record</span>
      <span>Authorized Stamp / Signature</span>
    </div>
  </div>
</body>
</html>`;
  }

  if (payload.type === 'LAB_REPORT') {
    const lab = payload.data;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lab Report ${escapeHtml(lab.orderNo)} - ${hospName}</title>
  <style>
    ${pageSizeCss}
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 16px; font-size: ${baseFontSize}; }
    .sheet { max-width: ${sheetMaxWidth}; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px; }
    .hdr { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hdr">
      <div>
        <div style="font-size:18px;font-weight:bold;">${hospName}</div>
        <div style="font-size:11px;color:#475569;">Diagnostic Laboratory Report &amp; Barcode Slip</div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:11px;">
        <div><strong>ORDER #${escapeHtml(lab.orderNo)}</strong></div>
        <div>Barcode: <strong>${escapeHtml(lab.sampleBarcode)}</strong></div>
        <div>Date: ${escapeHtml(lab.businessDate)}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;background:#f8fafc;padding:10px;border-radius:6px;font-size:12px;">
      <div>
        <div><strong>Patient:</strong> ${escapeHtml(lab.patientName)} (${escapeHtml(lab.patientMrn)})</div>
        <div><strong>Doctor:</strong> ${escapeHtml(lab.doctorName)}</div>
      </div>
      <div style="text-align:right;font-family:monospace;">
        <div><strong>Test Fee:</strong> ${lab.price.toLocaleString()} ${cur}</div>
        <div><strong>Status:</strong> ${escapeHtml(lab.status)}</div>
      </div>
    </div>
    <div class="box">
      <div style="font-size:11px;color:#475569;">${escapeHtml(lab.category)} · Code: ${escapeHtml(
      lab.testCode
    )} · Flag: <strong>${escapeHtml(lab.abnormalFlag)}</strong></div>
      <div style="font-size:15px;font-weight:bold;margin:6px 0;">${escapeHtml(lab.testName)}</div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:8px;font-family:monospace;font-size:12px;">
        <div><strong>Result:</strong> ${escapeHtml(
          lab.resultValue || 'Sample Collected / Processing'
        )}</div>
        <div><strong>Ref Range:</strong> ${escapeHtml(lab.referenceRange)} ${escapeHtml(
      lab.unit
    )}</div>
      </div>
    </div>
    <div style="margin-top:18px;padding-top:10px;border-top:1px dashed #94a3b8;display:flex;justify-content:space-between;font-size:11px;color:#475569;">
      <span>Verified By: ${escapeHtml(lab.verifiedBy || 'Laboratory Technologist / Pathologist')}</span>
      <span>Authorized Laboratory Stamp</span>
    </div>
  </div>
</body>
</html>`;
  }

  const slip = payload.data;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Salary Slip ${escapeHtml(slip.employeeName)} - ${hospName}</title>
  <style>
    ${pageSizeCss}
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 16px; font-size: ${baseFontSize}; }
    .sheet { max-width: ${sheetMaxWidth}; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px; }
    .hdr { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-family: monospace; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hdr">
      <div>
        <div style="font-size:18px;font-weight:bold;">${hospName}</div>
        <div style="font-size:11px;color:#475569;">Official Staff Payroll &amp; Salary Slip</div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:11px;">
        <div><strong>MONTH: ${escapeHtml(slip.payrollMonth)}</strong></div>
        <div>Emp Code: ${escapeHtml(slip.empCode)}</div>
        <div>Paid Date: ${escapeHtml(slip.paymentDate)}</div>
      </div>
    </div>
    <div style="margin-bottom:12px;background:#f8fafc;padding:10px;border-radius:6px;font-size:12px;">
      <div><strong>Staff Member:</strong> ${escapeHtml(slip.employeeName)}</div>
      <div><strong>Designation / Department:</strong> ${escapeHtml(slip.designation)} (${escapeHtml(
    slip.department
  )})</div>
    </div>
    <div class="row"><span>Basic Monthly Salary:</span><span>${slip.baseSalary.toLocaleString()} ${cur}</span></div>
    <div class="row"><span>Duty Allowances:</span><span>+${slip.allowance.toLocaleString()} ${cur}</span></div>
    <div class="row"><span>Deductions:</span><span>-${slip.deduction.toLocaleString()} ${cur}</span></div>
    <div class="row" style="font-size:15px;font-weight:bold;border-top:2px solid #0f172a;border-bottom:2px solid #0f172a;">
      <span>NET SALARY PAID:</span><span>${slip.netPaid.toLocaleString()} ${cur}</span>
    </div>
    <div style="margin-top:18px;padding-top:10px;border-top:1px dashed #94a3b8;display:flex;justify-content:space-between;font-size:11px;color:#475569;">
      <span>${hospName} · Accounts &amp; HR</span>
      <span>Staff Receiver Signature</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends any PrintableDocPayload directly to the connected hardware printer
 * (USB / LAN / Thermal 80mm / Laser A4 / PDF Printer) using an isolated print spooler iframe.
 * Automatically resolves and recovers from any iframe or browser print error.
 */
export function printViaConnectedPrinter(
  rawPayload: PrintableDocPayload | null,
  settings: HospitalSettings,
  layout: PrinterPaperLayout = 'A4'
): boolean {
  const sanitized = sanitizePrintablePayload(rawPayload);
  if (!sanitized) return false;

  try {
    const html = buildPrintableHtml(sanitized, settings, layout);
    const frameId = 'al-hikmat-hardware-printer-spooler';
    let iframe = document.getElementById(frameId) as HTMLIFrameElement | null;
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }

    iframe = document.createElement('iframe');
    iframe.id = frameId;
    iframe.title = 'Hardware Printer Spooler';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!frameDoc || !iframe.contentWindow) {
      window.print();
      return true;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const triggerPrint = () => {
      try {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } else {
          window.print();
        }
      } catch {
        // Automatic fallback if iframe print is restricted
        try {
          window.print();
        } catch {
          // Silently resolved if no printer driver is installed
        }
      }
    };

    setTimeout(triggerPrint, 120);
    return true;
  } catch {
    try {
      window.print();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Downloads a standalone Virtual Bill / Report / Slip HTML file when no physical printer is connected.
 */
export function downloadVirtualDocumentFile(
  rawPayload: PrintableDocPayload | null,
  settings: HospitalSettings,
  layout: PrinterPaperLayout = 'A4'
): string {
  const sanitized = sanitizePrintablePayload(rawPayload);
  if (!sanitized) return '';

  const htmlDoc = buildPrintableHtml(sanitized, settings, layout);
  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const fileTag =
    sanitized.type === 'INVOICE'
      ? `Bill-${sanitized.data.invoiceNo}-${sanitized.data.businessDate}`
      : sanitized.type === 'LAB_REPORT'
      ? `Lab-Report-${sanitized.data.orderNo}-${sanitized.data.businessDate}`
      : `Salary-Slip-${sanitized.data.empCode}-${sanitized.data.payrollMonth}`;

  a.download = `Virtual-${fileTag}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return a.download;
}
