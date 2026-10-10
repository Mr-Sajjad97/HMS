/**
 * Protected Printable Clinical & Financial Document Viewer
 * Branded with: Developed by Sajjad Qaiser Shah
 */
import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
import type { Invoice, LabOrder, SalarySlip, HospitalSettings } from '../types/erp.ts';

export type PrintableDocPayload =
  | { type: 'INVOICE'; data: Invoice }
  | { type: 'LAB_REPORT'; data: LabOrder }
  | { type: 'SALARY_SLIP'; data: SalarySlip };

interface PrintableDocumentModalProps {
  docPayload: PrintableDocPayload | null;
  settings: HospitalSettings;
  onClose: () => void;
}

export const PrintableDocumentModal: React.FC<PrintableDocumentModalProps> = ({
  docPayload,
  settings,
  onClose,
}) => {
  if (!docPayload) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full p-6 md:p-8 shadow-sm my-8">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileText className="w-4 h-4 text-slate-900" />
            <span>Protected Hospital Document · Audit-Locked Record</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Copy</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
              aria-label="Close document"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Official Document Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{settings.hospitalName}</h2>
            <p className="text-xs text-slate-600 mt-1">
              Central On-Premises Hospital ERP · Local LAN Server ({settings.lanSubnet})
            </p>
            <p className="text-xs font-semibold text-slate-900 mt-1">
              Developed by Sajjad Qaiser Shah
            </p>
          </div>
          <div className="text-left md:text-right font-mono text-xs text-slate-600">
            {docPayload.type === 'INVOICE' && (
              <>
                <div className="font-semibold text-slate-900">
                  OFFICIAL RECEIPT #{docPayload.data.invoiceNo}
                </div>
                <div>Business Date: {docPayload.data.businessDate}</div>
                <div>Payment Date: {docPayload.data.paymentDate || 'Unsettled (Credit)'}</div>
                <div>Entry Timestamp: {docPayload.data.createdAt.slice(0, 19).replace('T', ' ')} UTC</div>
              </>
            )}
            {docPayload.type === 'LAB_REPORT' && (
              <>
                <div className="font-semibold text-slate-900">
                  DIAGNOSTIC REPORT #{docPayload.data.orderNo}
                </div>
                <div>Sample Barcode: {docPayload.data.sampleBarcode}</div>
                <div>Service Date: {docPayload.data.businessDate}</div>
                <div>Verified At: {docPayload.data.verifiedAt ? docPayload.data.verifiedAt.slice(0, 19).replace('T', ' ') : 'Pending'}</div>
              </>
            )}
            {docPayload.type === 'SALARY_SLIP' && (
              <>
                <div className="font-semibold text-slate-900">
                  PAYROLL SLIP · {docPayload.data.payrollMonth}
                </div>
                <div>Employee Code: {docPayload.data.empCode}</div>
                <div>Business Date: {docPayload.data.businessDate}</div>
                <div>Disbursement Date: {docPayload.data.paymentDate}</div>
              </>
            )}
          </div>
        </div>

        {/* Document Body */}
        {docPayload.type === 'INVOICE' && (
          <div className="py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 pb-4 border-b border-slate-100">
              <div>
                <div className="text-slate-400">Patient / Customer</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.customerName}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Cost Center / Department</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.department}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Settlement Method & Status</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.paymentMethod} · {docPayload.data.status}
                </div>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 font-medium text-right">Qty</th>
                  <th className="py-2 font-medium text-right">Unit Price ({settings.currency})</th>
                  <th className="py-2 font-medium text-right">Line Total ({settings.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docPayload.data.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 text-slate-900 font-medium">{item.description}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{item.qty}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold">
                      {item.lineTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <div className="w-full sm:w-72 space-y-1.5 text-xs font-mono tabular-nums">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{docPayload.data.subtotal.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span>-{docPayload.data.discount.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-semibold pt-1 border-t border-slate-200">
                  <span>Net Invoice Total:</span>
                  <span>{docPayload.data.netTotal.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Paid Amount:</span>
                  <span>{docPayload.data.paidAmount.toLocaleString()} {settings.currency}</span>
                </div>
                {docPayload.data.refundedAmount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Refunded Amount:</span>
                    <span>{docPayload.data.refundedAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                  <span>Balance Due:</span>
                  <span>
                    {Math.max(
                      0,
                      docPayload.data.netTotal -
                        docPayload.data.paidAmount -
                        docPayload.data.refundedAmount
                    ).toLocaleString()}{' '}
                    {settings.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {docPayload.type === 'LAB_REPORT' && (
          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600 pb-4 border-b border-slate-100">
              <div>
                <div className="text-slate-400">Patient Name</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.patientName}
                </div>
              </div>
              <div>
                <div className="text-slate-400">MRN</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.patientMrn}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Referring Physician</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.doctorName}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Sample Barcode</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.sampleBarcode}
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{docPayload.data.category} · Code: {docPayload.data.testCode}</span>
                <span className="font-mono">Flag: {docPayload.data.abnormalFlag}</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {docPayload.data.testName}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">Observed Result:</span>
                  <div className="font-mono font-semibold text-slate-900 mt-1">
                    {docPayload.data.resultValue || 'Sample under laboratory processing'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Biological Reference Interval:</span>
                  <div className="font-mono text-slate-700 mt-1">
                    {docPayload.data.referenceRange} ({docPayload.data.unit})
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  Verification Status: <strong>{docPayload.data.status}</strong> ·{' '}
                  {docPayload.data.verifiedBy || 'Awaiting Pathologist Sign-off'}
                </span>
              </div>
            </div>
          </div>
        )}

        {docPayload.type === 'SALARY_SLIP' && (
          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600 pb-4 border-b border-slate-100">
              <div>
                <div className="text-slate-400">Employee Name</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.employeeName}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Designation</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.designation}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Cost Center</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.department}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Payroll Period</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.payrollMonth}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Basic Monthly Salary:</span>
                <span className="text-slate-900 font-semibold">
                  {docPayload.data.baseSalary.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Clinical / Duty Allowances:</span>
                <span className="text-emerald-700">
                  +{docPayload.data.allowance.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Tax & Provident Deductions:</span>
                <span className="text-red-700">
                  -{docPayload.data.deduction.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-slate-900">
                <span>Net Disbursed Salary:</span>
                <span>
                  {docPayload.data.netPaid.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Official Footer Signature */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span>Authoritative Central PostgreSQL Ledger Record · Immutable Audit History</span>
          </div>
          <div className="font-semibold text-slate-900">
            Developed by Sajjad Qaiser Shah
          </div>
        </div>
      </div>
    </div>
  );
};
