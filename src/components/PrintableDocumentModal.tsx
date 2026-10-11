/**
 * Protected Printable Clinical & Financial Document Viewer (Connected Printer + Virtual Bill Mode)
 */
import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  X,
  Minus,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import type { HospitalSettings } from '../types/erp.ts';
import {
  sanitizePrintablePayload,
  printViaConnectedPrinter,
  downloadVirtualDocumentFile,
  type PrintableDocPayload,
  type PrinterPaperLayout,
} from '../utils/printerEngine.ts';

export type { PrintableDocPayload };

interface PrintableDocumentModalProps {
  docPayload: PrintableDocPayload | null;
  settings: HospitalSettings;
  onClose: () => void;
}

export const PrintableDocumentModal: React.FC<PrintableDocumentModalProps> = ({
  docPayload: rawDocPayload,
  settings,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [receiptLayout, setReceiptLayout] = useState<PrinterPaperLayout>('A4');
  const [virtualSavedToast, setVirtualSavedToast] = useState<string>('');

  const docPayload = sanitizePrintablePayload(rawDocPayload);

  useEffect(() => {
    setIsMinimized(false);
    setVirtualSavedToast('');
  }, [rawDocPayload]);

  if (!docPayload) return null;

  const handlePrint = () => {
    const ok = printViaConnectedPrinter(docPayload, settings, receiptLayout);
    if (ok) {
      setVirtualSavedToast(
        `Sent to Connected Printer (${receiptLayout === 'THERMAL_80MM' ? '80mm Thermal POS' : 'A4 Printer'}). Virtual copy is also saved in History.`
      );
    }
  };

  const handleDownloadVirtualBill = () => {
    const fileName = downloadVirtualDocumentFile(docPayload, settings, receiptLayout);
    if (fileName) {
      setVirtualSavedToast(
        `Virtual Document (${fileName}) downloaded & saved in History (no printer needed).`
      );
    }
    return;
  };

  const _unusedLegacyVirtual = () => {
    if (docPayload.type !== 'INVOICE') {
      window.print();
      return;
    }
    const inv = docPayload.data;
    const balanceDue = Math.max(0, inv.netTotal - inv.paidAmount - inv.refundedAmount);
    const rowsHtml = inv.items
      .map(
        (it, idx) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${idx + 1}. ${it.description} ${
          it.category ? `<span style="color:#64748b;font-size:11px;">[${it.category}]</span>` : ''
        }</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${it.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${it.unitPrice.toLocaleString()}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:bold;">${it.lineTotal.toLocaleString()}</td>
        </tr>`
      )
      .join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Virtual Bill ${inv.invoiceNo} - ${settings.hospitalName}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; background: #f8fafc; }
    .sheet { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 28px; }
    .hdr { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
    th { text-align: left; border-bottom: 2px solid #cbd5e1; padding: 8px; color: #475569; }
    .tot { margin-top: 16px; margin-left: auto; width: 280px; font-family: monospace; font-size: 13px; }
    .tot-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { font-size: 16px; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 8px 0; margin: 6px 0; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hdr">
      <div>
        <h2 style="margin:0;">${settings.hospitalName}</h2>
        <div style="font-size:12px;color:#475569;margin-top:4px;">Official Hospital Virtual &amp; Printable Patient Bill</div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:12px;">
        <div><strong>BILL NO: ${inv.invoiceNo}</strong></div>
        <div>Date: ${inv.businessDate}</div>
        <div>Status: ${inv.status} (${inv.paymentMethod})</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:14px;background:#f1f5f9;padding:10px 12px;border-radius:6px;">
      <div>
        <div><strong>Patient / Customer:</strong> ${inv.customerName}</div>
        ${inv.patientMrn ? `<div><strong>MRN:</strong> ${inv.patientMrn}</div>` : ''}
        ${inv.patientAge ? `<div><strong>Age / Gender:</strong> ${inv.patientAge} yrs / ${inv.patientGender || 'N/A'}</div>` : ''}
        ${inv.patientPhone ? `<div><strong>Phone:</strong> ${inv.patientPhone}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div><strong>Department:</strong> ${inv.department}</div>
        ${inv.doctorName ? `<div><strong>Consultant Doctor:</strong> ${inv.doctorName}</div>` : ''}
        <div><strong>Bill Mode:</strong> Virtual Bill + Printer Ready</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item Description (Doctor / Test / Medicine / Extra)</th>
          <th style="text-align:right;">Qty</th>
          <th style="text-align:right;">Price (${settings.currency})</th>
          <th style="text-align:right;">Total (${settings.currency})</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="tot">
      <div class="tot-row"><span>Subtotal:</span><span>${inv.subtotal.toLocaleString()} ${settings.currency}</span></div>
      <div class="tot-row"><span>Discount:</span><span>-${inv.discount.toLocaleString()} ${settings.currency}</span></div>
      <div class="tot-row grand"><span>TOTAL BILL:</span><span>${inv.netTotal.toLocaleString()} ${settings.currency}</span></div>
      <div class="tot-row"><span>Paid Amount:</span><span>${inv.paidAmount.toLocaleString()} ${settings.currency}</span></div>
      <div class="tot-row"><span>Balance Due:</span><span>${balanceDue.toLocaleString()} ${settings.currency}</span></div>
    </div>
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;font-size:11px;color:#64748b;">
      <span>${settings.hospitalName} · Official Computerized Virtual &amp; Printable Bill</span>
      <span>Authorized Hospital Signature / Stamp</span>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Virtual-Bill-${inv.invoiceNo}-${inv.businessDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setVirtualSavedToast(
      `Virtual Bill ${inv.invoiceNo} downloaded & saved in History (no printer needed).`
    );
  };

  const docTitle =
    docPayload.type === 'INVOICE'
      ? `Bill / Receipt #${docPayload.data.invoiceNo}`
      : docPayload.type === 'LAB_REPORT'
      ? `Lab Report #${docPayload.data.orderNo}`
      : `Salary Slip (${docPayload.data.employeeName})`;

  const handleToggleModalFullScreen = async () => {
    const next = !isFullScreen;
    setIsFullScreen(next);
    try {
      const docEl: any = document.documentElement;
      const docAny: any = document;
      if (next && !docAny.fullscreenElement && !docAny.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      } else if (!next && (docAny.fullscreenElement || docAny.webkitFullscreenElement)) {
        if (docAny.exitFullscreen) {
          await docAny.exitFullscreen();
        } else if (docAny.webkitExitFullscreen) {
          await docAny.webkitExitFullscreen();
        }
      }
    } catch {
      // Visual full-screen modal works even when browser blocks native fullscreen
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-[#1D5464] text-white rounded-xl shadow-xl border border-white/20 px-3.5 py-2 flex items-center gap-2.5 text-xs no-print">
        <FileText className="w-4 h-4 text-teal-200 shrink-0" />
        <span className="font-semibold whitespace-nowrap">{docTitle}</span>
        <button
          type="button"
          onClick={() => {
            setIsMinimized(false);
          }}
          className="h-7 w-7 rounded bg-white/15 hover:bg-white/25 text-white inline-flex items-center justify-center cursor-pointer"
          title="Restore Window"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer"
          aria-label="Close document"
          title="Close (✕)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`printable-document-overlay fixed inset-0 z-50 flex justify-center overflow-y-auto ${
        isFullScreen
          ? 'items-start bg-white p-0 w-screen h-screen'
          : 'items-start sm:items-center bg-slate-900/60 p-4'
      }`}
    >
      <div
        className={`printable-document-sheet bg-white border border-slate-200 shadow-sm ${
          isFullScreen
            ? 'w-screen min-h-screen max-w-none rounded-none border-0 p-4 sm:p-8 m-0'
            : receiptLayout === 'THERMAL_80MM' && docPayload.type === 'INVOICE'
            ? 'rounded-lg max-w-md w-full p-5 my-6'
            : 'rounded-lg max-w-3xl w-full p-6 md:p-8 my-6'
        }`}
      >
        {/* Clean Laptop Window Title Bar: ← Back on left, Virtual Bill + Print + — □ ✕ icons on right */}
        <div
          onDoubleClick={handleToggleModalFullScreen}
          className={`flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200 no-print select-none ${
            isFullScreen ? 'sticky top-0 z-20 bg-white pt-1' : ''
          }`}
          title="Double-click title bar or click □ to toggle Full Screen"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors"
              title="Back (←)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <FileText className="w-4 h-4 text-slate-900" />
            <span className="font-bold text-slate-900">{docTitle}</span>
            <span className="text-[11px] text-emerald-700 font-semibold hidden sm:inline">
              · Virtual Bill Saved in History
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[11px]">
              <button
                type="button"
                onClick={() => setReceiptLayout('A4')}
                className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                  receiptLayout === 'A4'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Printer
              </button>
              <button
                type="button"
                onClick={() => setReceiptLayout('THERMAL_80MM')}
                className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                  receiptLayout === 'THERMAL_80MM'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm Thermal Slip
              </button>
            </div>
            <button
              type="button"
              onClick={handleDownloadVirtualBill}
              className="h-8 px-3 text-xs font-semibold text-emerald-900 bg-emerald-100 border border-emerald-300 rounded-md hover:bg-emerald-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title="Save / Download Virtual Bill if printer is not connected"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Virtual Bill</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 text-xs font-semibold text-white bg-[#1D5464] rounded-md hover:bg-[#16424F] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer mr-1"
              title="Print on Connected Printer (or Save as PDF)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print on Printer</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 inline-flex items-center justify-center cursor-pointer transition-colors"
              title="Minimize (—)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleModalFullScreen}
              className={`h-8 px-2.5 rounded-md border inline-flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs font-semibold ${
                isFullScreen
                  ? 'bg-[#1D5464] text-white border-[#1D5464]'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title={isFullScreen ? 'Restore Down (Exit Full Screen)' : 'Maximize / Full Screen'}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Restore</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Full Screen</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close document"
              title="Close (✕)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {virtualSavedToast && (
          <div className="no-print mb-4 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <span>{virtualSavedToast}</span>
            <button
              type="button"
              onClick={() => setVirtualSavedToast('')}
              className="underline text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Official Document Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{settings.hospitalName}</h2>
            <p className="text-xs text-slate-600 mt-1">
              Official Hospital Patient Bill &amp; Receipt · ({settings.lanSubnet})
            </p>
          </div>
          <div className="text-left md:text-right font-mono text-xs text-slate-600">
            {docPayload.type === 'INVOICE' && (
              <>
                <div className="font-bold text-slate-900 text-sm">
                  BILL / RECEIPT #{docPayload.data.invoiceNo}
                </div>
                <div>Bill Date: {docPayload.data.businessDate}</div>
                <div>Payment Date: {docPayload.data.paymentDate || 'Unsettled (Credit)'}</div>
                <div>
                  Mode:{' '}
                  {docPayload.data.isVirtualBill
                    ? 'Virtual Bill + Printer Ready'
                    : 'Official Hospital Receipt'}
                </div>
              </>
            )}
            {docPayload.type === 'LAB_REPORT' && (
              <>
                <div className="font-semibold text-slate-900">
                  DIAGNOSTIC REPORT #{docPayload.data.orderNo}
                </div>
                <div>Sample Barcode: {docPayload.data.sampleBarcode}</div>
                <div>Service Date: {docPayload.data.businessDate}</div>
                <div>
                  Verified At:{' '}
                  {docPayload.data.verifiedAt
                    ? docPayload.data.verifiedAt.slice(0, 19).replace('T', ' ')
                    : 'Pending'}
                </div>
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
          <div className="py-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 pb-4 border-b border-slate-100">
              <div>
                <div className="text-slate-400">Patient / Customer Details</div>
                <div className="font-bold text-slate-900 mt-0.5 text-sm">
                  {docPayload.data.customerName || 'Walk-in Patient / Customer'}
                </div>
                {(docPayload.data.patientMrn ||
                  (docPayload.data.patientAge && docPayload.data.patientAge > 0) ||
                  docPayload.data.patientGender) && (
                  <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                    {docPayload.data.patientMrn ? `${docPayload.data.patientMrn}` : ''}
                    {docPayload.data.patientAge && docPayload.data.patientAge > 0
                      ? `${docPayload.data.patientMrn ? ' · ' : ''}${docPayload.data.patientAge} yrs`
                      : ''}
                    {docPayload.data.patientGender
                      ? ` (${docPayload.data.patientGender})`
                      : ''}
                  </div>
                )}
                {docPayload.data.patientPhone &&
                  docPayload.data.patientPhone !== 'N/A' &&
                  docPayload.data.patientPhone !== '+92-300-' && (
                    <div className="font-mono text-[11px] text-slate-500">
                      Phone: {docPayload.data.patientPhone}
                    </div>
                  )}
                {docPayload.data.patientAddress &&
                  docPayload.data.patientAddress !== 'N/A' &&
                  docPayload.data.patientAddress !== 'Local Area' && (
                    <div className="text-[11px] text-slate-500">
                      Note/Address: {docPayload.data.patientAddress}
                    </div>
                  )}
              </div>
              <div>
                <div className="text-slate-400">Department &amp; Consultant</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.department}
                </div>
                {docPayload.data.doctorName && (
                  <div className="text-slate-700 mt-0.5">
                    Doctor: <strong>{docPayload.data.doctorName}</strong>
                  </div>
                )}
              </div>
              <div>
                <div className="text-slate-400">Payment Method &amp; Status</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {docPayload.data.paymentMethod} · {docPayload.data.status}
                </div>
                <div className="text-emerald-700 text-[11px] font-medium mt-0.5">
                  Saved in Date-Wise Patient &amp; Bill History
                </div>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500">
                  <th className="py-2 font-semibold"># · Item Description (Doctor / Test / Medicine / Extra)</th>
                  <th className="py-2 font-semibold text-right">Qty</th>
                  <th className="py-2 font-semibold text-right">Unit Price ({settings.currency})</th>
                  <th className="py-2 font-semibold text-right">Line Total ({settings.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docPayload.data.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 text-slate-900 font-medium">
                      <span>
                        {idx + 1}. {item.description}
                      </span>
                      {item.category && (
                        <span className="ml-2 text-[10px] font-mono text-slate-500">
                          [
                          {item.category === 'DOCTOR_FEE'
                            ? 'Doctor Fee'
                            : item.category === 'LAB_TEST'
                            ? 'Lab Test'
                            : item.category === 'MEDICINE'
                            ? 'Medicine · Stock Deducted'
                            : item.category === 'EXTRA_CUSTOM'
                            ? 'Extra / Custom Item'
                            : 'Service'}
                          ]
                        </span>
                      )}
                    </td>
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

            <div className="flex justify-end pt-4 border-t-2 border-slate-200">
              <div className="w-full sm:w-80 space-y-1.5 text-xs font-mono tabular-nums">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal ({docPayload.data.items.length} items):</span>
                  <span>
                    {docPayload.data.subtotal.toLocaleString()} {settings.currency}
                  </span>
                </div>
                {docPayload.data.discount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Discount / Concession:</span>
                    <span>
                      -{docPayload.data.discount.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm py-1.5 border-y-2 border-slate-900">
                  <span>TOTAL BILL (GRAND TOTAL):</span>
                  <span>
                    {docPayload.data.netTotal.toLocaleString()} {settings.currency}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                  <span>Paid Amount:</span>
                  <span>
                    {docPayload.data.paidAmount.toLocaleString()} {settings.currency}
                  </span>
                </div>
                {docPayload.data.refundedAmount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Refunded / Returned:</span>
                    <span>
                      {docPayload.data.refundedAmount.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                  <span>Remaining Balance Due:</span>
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
            <span>{settings.hospitalName} · Verified Official Computerized Record</span>
          </div>
          <div className="font-semibold text-slate-700">
            Authorized Hospital Stamp / Signature
          </div>
        </div>
      </div>
    </div>
  );
};
