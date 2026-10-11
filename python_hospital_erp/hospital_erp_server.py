#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
Al-Hikmat General Hospital ERP (HMS) — Windows Offline Python Edition
Developed by Sajjad Qaiser Shah
--------------------------------------------------------------------------------
Features:
1. 100% Pure Python 3 (Uses built-in sqlite3 + http.server — Zero pip required!)
2. Fixed Left Sidebar Layout (Independent right-side scrolling)
3. Security Login & Logout with 4-Digit PIN (Default: 1234) or Admin Password
4. Consolidated Profit & Loss Dashboard (Date-Wise Graph across All Time,
   Daily Calculation Breakdown & Short-Form Date-Wise Record Table)
5. Hospital Pharmacy Retail POS + Add New Medicine (Supplier Cost Price,
   Retail Sale Price, Total Supplier Bill, Paid Amount & Remaining Balance) +
   Medicine Search & Expiry Status Checker
6. Hospital Staff Directory, Add New Staff, Pay Salary & Saved Salary History
   (Automatically deducted from Hospital Profit & Loss)
7. Customer Billing, Laboratory Billing & Operating Expenses with Print Receipts
8. Complete All-Time History Menu & Offline Laptop Backup Save / Restore
================================================================================
Run Command on Windows:
    python hospital_erp_server.py
"""

import os
import sys
import json
import sqlite3
import datetime
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hospital_erp_central.db")
PORT = int(os.environ.get("PORT", 5000))


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS pharmacy_batches (
        id TEXT PRIMARY KEY,
        brand_name TEXT NOT NULL,
        generic_name TEXT NOT NULL,
        category TEXT NOT NULL,
        batch_no TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        stock_qty INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        retail_price REAL NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS supplier_bills (
        id TEXT PRIMARY KEY,
        bill_no TEXT NOT NULL,
        business_date TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        batch_no TEXT NOT NULL,
        qty INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        retail_price REAL NOT NULL,
        total_bill REAL NOT NULL,
        paid_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        emp_code TEXT NOT NULL,
        full_name TEXT NOT NULL,
        designation TEXT NOT NULL,
        department TEXT NOT NULL,
        net_salary REAL NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS salary_slips (
        id TEXT PRIMARY KEY,
        payroll_month TEXT NOT NULL,
        business_date TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        designation TEXT NOT NULL,
        department TEXT NOT NULL,
        net_paid REAL NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS customer_bills (
        id TEXT PRIMARY KEY,
        invoice_no TEXT NOT NULL,
        business_date TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        department TEXT NOT NULL,
        description TEXT NOT NULL,
        total_amount REAL NOT NULL,
        paid_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        voucher_no TEXT NOT NULL,
        business_date TEXT NOT NULL,
        cost_center TEXT NOT NULL,
        ref_type TEXT NOT NULL,
        narration TEXT NOT NULL,
        amount REAL NOT NULL,
        cogs_amount REAL NOT NULL
    )
    """)

    cur.execute("SELECT COUNT(*) AS cnt FROM pharmacy_batches")
    if cur.fetchone()["cnt"] == 0:
        batches_seed = [
            ("BAT-501", "Norvasc 5mg Tablet", "Amlodipine 5mg", "Tablet", "B26-NV09", "AGP Pharma Distributors", "2027-08-31", 140, 420, 650),
            ("BAT-502", "Lipitor 20mg Tablet", "Atorvastatin 20mg", "Tablet", "B26-LP14", "AGP Pharma Distributors", "2027-05-31", 95, 780, 1200),
            ("BAT-503", "Rocephin 1g IV Injection", "Ceftriaxone 1g", "Injection", "B26-RC02", "Premier Medico Logistics", "2026-11-15", 62, 310, 480),
            ("BAT-504", "Panadol 500mg Tablet", "Paracetamol 500mg", "Tablet", "B26-PN88", "Premier Medico Logistics", "2028-02-28", 10, 35, 50),
        ]
        cur.executemany("INSERT INTO pharmacy_batches VALUES (?,?,?,?,?,?,?,?,?,?)", batches_seed)

        supplier_bills_seed = [
            ("SB-01", "SUP-BILL-01", "2026-10-05", "AGP Pharma Distributors", "Norvasc 5mg Tablet", "B26-NV09", 150, 420, 650, 63000, 45000, 18000),
            ("SB-02", "SUP-BILL-02", "2026-10-08", "Premier Medico Logistics", "Rocephin 1g IV Injection", "B26-RC02", 80, 310, 480, 24800, 24800, 0),
        ]
        cur.executemany("INSERT INTO supplier_bills VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", supplier_bills_seed)

        emp_seed = [
            ("EMP-01", "EMP-101", "Dr. Tariq Mehmood", "Senior Cardiologist", "HOSPITAL", 195000),
            ("EMP-02", "EMP-102", "Dr. Salman Qureshi", "Chief Pathologist", "LABORATORY", 155000),
            ("EMP-03", "EMP-103", "Hina Riaz", "Chief Pharmacist", "PHARMACY", 92000),
            ("EMP-04", "EMP-104", "Kashif Mehmood", "Senior Billing Cashier", "HOSPITAL", 68000),
        ]
        cur.executemany("INSERT INTO employees VALUES (?,?,?,?,?,?)", emp_seed)

        slips_seed = [
            ("SAL-01", "2026-09", "2026-09-30", "Hina Riaz", "Chief Pharmacist", "PHARMACY", 92000),
        ]
        cur.executemany("INSERT INTO salary_slips VALUES (?,?,?,?,?,?,?)", slips_seed)

        bills_seed = [
            ("INV-01", "INV-2026-0001", "2026-10-09", "Muhammad Zubair Khan", "HOSPITAL_OPD", "OPD Cardiology Consultation", 2500, 2500, 0),
            ("INV-02", "INV-2026-0002", "2026-10-09", "Fatima Bibi", "HOSPITAL_IPD", "IPD Surgical Ward Admission", 45000, 30000, 15000),
            ("INV-03", "INV-2026-0003", "2026-10-10", "Usman Ghani", "LABORATORY", "Complete Blood Count (CBC) & Lipid Profile", 5000, 5000, 0),
        ]
        cur.executemany("INSERT INTO customer_bills VALUES (?,?,?,?,?,?,?,?,?)", bills_seed)

        journal_seed = [
            ("JRN-01", "JV-2026-0001", "2026-10-01", "HOSPITAL", "INVOICE", "OPD & Emergency Customer Billing — Oct 01", 24500, 0),
            ("JRN-02", "JV-2026-0002", "2026-10-01", "PHARMACY", "INVOICE", "Pharmacy Retail Sales — Oct 01", 14200, 8400),
            ("JRN-03", "JV-2026-0003", "2026-10-01", "HOSPITAL", "EXPENSE", "Hospital Utility & Sanitization — Oct 01", 6200, 0),
            ("JRN-04", "JV-2026-0004", "2026-10-03", "HOSPITAL", "INVOICE", "IPD Surgical Ward Admissions — Oct 03", 38000, 0),
            ("JRN-05", "JV-2026-0005", "2026-10-03", "LABORATORY", "INVOICE", "Pathology Diagnostic Lab Billing — Oct 03", 11500, 0),
            ("JRN-06", "JV-2026-0006", "2026-10-03", "LABORATORY", "EXPENSE", "Biochemistry Reagents Refill — Oct 03", 7900, 0),
            ("JRN-07", "JV-2026-0007", "2026-10-05", "HOSPITAL", "INVOICE", "OPD Cardiology Clinic Billing — Oct 05", 29000, 0),
            ("JRN-08", "JV-2026-0008", "2026-10-05", "PHARMACY", "INVOICE", "Pharmacy Retail Sales — Oct 05", 16800, 9600),
            ("JRN-09", "JV-2026-0009", "2026-10-05", "HOSPITAL", "EXPENSE", "Generator Fuel & Sterilization — Oct 05", 8400, 0),
            ("JRN-10", "JV-2026-0010", "2026-10-06", "HOSPITAL", "INVOICE", "OPD Customer Billing — Oct 06", 14500, 0),
            ("JRN-11", "JV-2026-0011", "2026-10-06", "LABORATORY", "INVOICE", "Lab Hematology Billing — Oct 06", 5000, 0),
            ("JRN-12", "JV-2026-0012", "2026-10-06", "HOSPITAL", "EXPENSE", "Emergency ICU Ventilator & Autoclave Overhaul", 28000, 0),
            ("JRN-13", "JV-2026-0013", "2026-10-08", "HOSPITAL", "INVOICE", "OPD Specialist Clinics — Oct 08", 26500, 0),
            ("JRN-14", "JV-2026-0014", "2026-10-08", "LABORATORY", "INVOICE", "Pathology Lab Billing — Oct 08", 9400, 0),
            ("JRN-15", "JV-2026-0015", "2026-10-08", "PHARMACY", "INVOICE", "Pharmacy Retail Counter Sales — Oct 08", 11200, 6800),
            ("JRN-16", "JV-2026-0016", "2026-10-08", "HOSPITAL", "EXPENSE", "Hospital Electricity & Chiller — Oct 08", 7200, 0),
            ("JRN-17", "JV-2026-0017", "2026-10-09", "HOSPITAL", "INVOICE", "IPD Surgical Admission & OPD — Oct 09", 47500, 0),
            ("JRN-18", "JV-2026-0018", "2026-10-09", "LABORATORY", "INVOICE", "Fasting Lipid Profile — Oct 09", 3200, 0),
            ("JRN-19", "JV-2026-0019", "2026-10-09", "PHARMACY", "INVOICE", "Pharmacy Retail POS — Oct 09", 3700, 2400),
            ("JRN-20", "JV-2026-0020", "2026-10-09", "HOSPITAL", "EXPENSE", "Medical Oxygen Cylinders Refill — Oct 09", 6500, 0),
            ("JRN-21", "JV-2026-0021", "2026-10-10", "HOSPITAL", "INVOICE", "OPD Customer Billing — Oct 10", 18500, 0),
            ("JRN-22", "JV-2026-0022", "2026-10-10", "LABORATORY", "INVOICE", "CBC & Diagnostic Lab Billing — Oct 10", 6800, 0),
            ("JRN-23", "JV-2026-0023", "2026-10-10", "PHARMACY", "INVOICE", "Pharmacy Retail POS — Oct 10", 12100, 7100),
            ("JRN-24", "JV-2026-0024", "2026-10-10", "LABORATORY", "EXPENSE", "Hematology Analyzer Reagents — Oct 10", 3400, 0),
        ]
        cur.executemany("INSERT INTO journal_entries VALUES (?,?,?,?,?,?,?,?)", journal_seed)

    conn.commit()
    conn.close()


def compute_state():
    conn = get_db()
    cur = conn.cursor()

    batches = [dict(r) for r in cur.execute("SELECT * FROM pharmacy_batches ORDER BY id DESC").fetchall()]
    supplier_bills = [dict(r) for r in cur.execute("SELECT * FROM supplier_bills ORDER BY id DESC").fetchall()]
    employees = [dict(r) for r in cur.execute("SELECT * FROM employees ORDER BY id DESC").fetchall()]
    salary_slips = [dict(r) for r in cur.execute("SELECT * FROM salary_slips ORDER BY id DESC").fetchall()]
    customer_bills = [dict(r) for r in cur.execute("SELECT * FROM customer_bills ORDER BY id DESC").fetchall()]
    journals = [dict(r) for r in cur.execute("SELECT * FROM journal_entries ORDER BY business_date DESC, id DESC").fetchall()]

    daily_map = {}
    for j in journals:
        d = j["business_date"]
        if d not in daily_map:
            daily_map[d] = {
                "date": d,
                "hospitalRev": 0.0,
                "labRev": 0.0,
                "pharmacyRev": 0.0,
                "pharmacyCogs": 0.0,
                "expenses": 0.0,
                "totalRevenue": 0.0,
                "totalCostAndLoss": 0.0,
                "netProfit": 0.0,
            }
        amt = float(j["amount"])
        cogs = float(j["cogs_amount"])
        cc = j["cost_center"]
        rt = j["ref_type"]

        if rt == "INVOICE":
            if cc == "HOSPITAL":
                daily_map[d]["hospitalRev"] += amt
            elif cc == "LABORATORY":
                daily_map[d]["labRev"] += amt
            elif cc == "PHARMACY":
                daily_map[d]["pharmacyRev"] += amt
                daily_map[d]["pharmacyCogs"] += cogs
        elif rt in ("EXPENSE", "PAYROLL"):
            daily_map[d]["expenses"] += amt

    for d_obj in daily_map.values():
        d_obj["totalRevenue"] = d_obj["hospitalRev"] + d_obj["labRev"] + d_obj["pharmacyRev"]
        d_obj["totalCostAndLoss"] = d_obj["pharmacyCogs"] + d_obj["expenses"]
        d_obj["netProfit"] = d_obj["totalRevenue"] - d_obj["totalCostAndLoss"]

    daily_list = sorted(daily_map.values(), key=lambda x: x["date"])
    conn.close()

    state_obj = {
        "hospitalName": "Al-Hikmat General Hospital",
        "currency": "PKR",
        "batches": batches,
        "supplierBills": supplier_bills,
        "employees": employees,
        "salarySlips": salary_slips,
        "customerBills": customer_bills,
        "journals": journals,
        "dailyBreakdown": daily_list,
    }
    auto_save_files_to_laptop(state_obj)
    return state_obj


def auto_save_files_to_laptop(state_obj):
    try:
        backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Laptop_Auto_Backups")
        os.makedirs(backup_dir, exist_ok=True)
        latest_json = os.path.join(backup_dir, "Al_Hikmat_Auto_Backup_Latest.json")
        with open(latest_json, "w", encoding="utf-8") as f:
            json.dump(state_obj, f, indent=2)

        csv_path = os.path.join(backup_dir, "Al_Hikmat_Master_History.csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("Date,Voucher,Department,Type,Description,Amount_PKR,Medicine_Cost_PKR\n")
            for j in state_obj.get("journals", []):
                desc = str(j.get("narration", "")).replace('"', '""')
                f.write(
                    f'"{j.get("business_date")}","{j.get("voucher_no")}","{j.get("cost_center")}","{j.get("ref_type")}","{desc}",{j.get("amount")},{j.get("cogs_amount")}\n'
                )
    except Exception:
        pass


HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Al-Hikmat General Hospital Management System</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-[#EEF3F6] text-slate-900 h-screen overflow-hidden font-sans flex">

  <!-- LOGIN / LOGOUT MODAL (WITH LAPTOP ←, —, □, ✕ AT THE TOP) -->
  <div id="login-minimized-bar" class="hidden fixed bottom-4 right-4 z-50 bg-[#1D5464] text-white rounded-xl shadow-2xl border border-white/20 px-3.5 py-2 flex items-center gap-2.5 text-xs">
    <span class="font-semibold">Login / Logout (PIN)</span>
    <button onclick="document.getElementById('login-minimized-bar').classList.add('hidden');document.getElementById('login-modal').classList.remove('hidden');" class="h-7 w-7 rounded bg-white/15 hover:bg-white/25 text-white font-bold cursor-pointer" title="Restore">□</button>
    <button onclick="document.getElementById('login-minimized-bar').classList.add('hidden');" class="h-7 w-7 rounded bg-rose-600 text-white font-bold cursor-pointer" title="Close">✕</button>
  </div>

  <div id="login-modal" class="hidden fixed inset-0 z-50 bg-[#0F2937]/95 flex flex-col overflow-hidden">
    <div class="bg-slate-100 border-b border-slate-300 px-6 py-2 shrink-0 flex items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2.5">
        <button onclick="document.getElementById('login-modal').classList.add('hidden');" class="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold cursor-pointer" title="Back (←)">←</button>
        <span class="font-bold text-slate-900">Login / Logout — Al-Hikmat General Hospital</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button onclick="document.getElementById('login-modal').classList.add('hidden');document.getElementById('login-minimized-bar').classList.remove('hidden');" class="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold cursor-pointer" title="Minimize (—)">—</button>
        <button onclick="toggleModalFullScreen('login-card')" class="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold cursor-pointer" title="Maximize / Full Screen (□)">□</button>
        <button onclick="document.getElementById('login-modal').classList.add('hidden');" class="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer" title="Close (✕)">✕</button>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto flex items-center justify-center p-4">
      <div id="login-card" class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 text-xs my-auto">
        <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <button onclick="document.getElementById('login-modal').classList.add('hidden');" class="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold cursor-pointer" title="Back (←)">←</button>
            <span class="font-bold text-slate-800">Login / Logout (Security PIN &amp; Staff Login)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="document.getElementById('login-modal').classList.add('hidden');document.getElementById('login-minimized-bar').classList.remove('hidden');" class="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold cursor-pointer" title="Minimize (—)">—</button>
            <button onclick="toggleModalFullScreen('login-card')" class="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold cursor-pointer" title="Maximize / Full Screen (□)">□</button>
            <button onclick="document.getElementById('login-modal').classList.add('hidden');" class="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer" title="Close (✕)">✕</button>
          </div>
        </div>
        <div class="text-center">
          <h2 class="text-lg font-bold text-slate-900">Al-Hikmat General Hospital</h2>
          <p class="text-slate-500">Enter Security PIN or Staff Login to Access System</p>
        </div>
        <input id="pin-input" type="password" maxlength="6" placeholder="••••" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-center font-mono text-xl tracking-widest" />
        <div id="login-err" class="text-rose-600 text-center font-semibold"></div>
        <button onclick="unlockApp()" class="w-full py-2.5 rounded-lg bg-[#1D5464] text-white font-bold cursor-pointer">Login &amp; Open System</button>
      </div>
    </div>
  </div>

  <!-- CHANGE PIN MODAL (REQUIRES OLD PIN, WITH LAPTOP ←, —, □, ✕) -->
  <div id="change-pin-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
    <div id="change-pin-card" class="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-3 text-xs">
      <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <button onclick="document.getElementById('change-pin-modal').classList.add('hidden')" class="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold cursor-pointer" title="Back (←)">←</button>
          <h3 class="text-sm font-bold text-slate-900">Change Security PIN</h3>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="document.getElementById('change-pin-modal').classList.add('hidden')" class="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold cursor-pointer" title="Minimize (—)">—</button>
          <button onclick="toggleModalFullScreen('change-pin-card')" class="h-8 w-8 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold cursor-pointer" title="Maximize / Full Screen (□)">□</button>
          <button onclick="document.getElementById('change-pin-modal').classList.add('hidden')" class="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer" title="Close (✕)">✕</button>
        </div>
      </div>
      <p class="text-slate-500">Existing PIN is hidden. Enter your current (old) PIN first to set a new PIN.</p>
      <input id="old-pin-in" type="password" placeholder="1. Enter Current (Old) PIN (••••)" class="w-full px-3 py-2 border rounded font-mono" />
      <input id="new-pin-in" type="password" placeholder="2. Enter New PIN (••••)" class="w-full px-3 py-2 border rounded font-mono" />
      <div id="pin-change-err" class="text-rose-600 font-semibold"></div>
      <div class="flex justify-end gap-2">
        <button onclick="document.getElementById('change-pin-modal').classList.add('hidden')" class="px-3 py-1.5 border rounded cursor-pointer">Cancel</button>
        <button onclick="saveNewPin()" class="px-4 py-1.5 bg-[#1D5464] text-white font-bold rounded cursor-pointer">Verify Old PIN & Save</button>
      </div>
    </div>
  </div>

  <!-- FIXED LEFT SIDEBAR (ALWAYS VISIBLE EVEN IN FULL SCREEN — NEVER DISAPPEARS) -->
  <aside class="w-64 h-screen overflow-y-auto bg-[#1D5464] text-white flex flex-col justify-between shrink-0 select-none">
    <div>
      <div class="px-6 py-5 border-b border-white/10">
        <div class="text-base font-bold tracking-wide">AL-HIKMAT HMS</div>
        <div class="text-[11px] text-teal-200">Hospital Management System</div>
      </div>
      <nav class="px-3 py-5 space-y-1.5 text-sm">
        <button onclick="showTab('home')" id="btn-home" class="w-full text-left px-4 py-2.5 rounded-lg font-semibold bg-[#3B6E7C] text-white cursor-pointer">⊞ Dashboard (P&L)</button>
        <button onclick="showTab('pharmacy')" id="btn-pharmacy" class="w-full text-left px-4 py-2.5 rounded-lg font-medium text-teal-100 hover:bg-white/10 cursor-pointer">💊 Pharmacy & Stock</button>
        <button onclick="showTab('billing')" id="btn-billing" class="w-full text-left px-4 py-2.5 rounded-lg font-medium text-teal-100 hover:bg-white/10 cursor-pointer">💳 Billing, Staff & Salary</button>
        <button onclick="showTab('history')" id="btn-history" class="w-full text-left px-4 py-2.5 rounded-lg font-medium text-teal-100 hover:bg-white/10 cursor-pointer">📂 History & Backups</button>
      </nav>
    </div>
    <div class="p-4 border-t border-white/10 space-y-2 text-xs">
      <div class="px-3 py-2 rounded-lg bg-white/10 text-teal-100 text-[11px] text-center">✓ All Changes Auto-Saved</div>
      <button onclick="lockApp()" class="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer">Login / Logout (PIN)</button>
      <button onclick="document.getElementById('change-pin-modal').classList.remove('hidden')" class="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer">Change PIN (••••)</button>
      <div class="p-2.5 rounded-lg bg-white/10 border border-white/10 text-left space-y-1">
        <div class="text-xs font-bold text-white">Hospital Administrator</div>
        <select class="w-full text-[11px] text-teal-100 bg-[#16424F] border border-white/15 rounded px-1.5 py-1 font-medium cursor-pointer">
          <option value="ADMIN">Admin (Hospital Administrator)</option>
          <option value="PHARMACIST">Pharmacist</option>
          <option value="CASHIER">Cashier</option>
          <option value="LAB_TECH">Lab Tech</option>
          <option value="DOCTOR">Doctor</option>
          <option value="NURSE">Nurse</option>
          <option value="OTHER">Other Staff</option>
        </select>
      </div>
      <div class="pt-2 border-t border-white/10 text-[11px] text-teal-200 font-semibold text-center">
        Developed by Sajjad Qaiser Shah
      </div>
    </div>
  </aside>

  <!-- RIGHT MAIN WORKSPACE (SIDEBAR REMAINS VISIBLE IN FULL SCREEN) -->
  <div id="main-workspace" class="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
    <!-- TOP-MOST LAPTOP WINDOW BAR (ABOVE HEADER / SEARCH) -->
    <div class="bg-slate-100 border-b border-slate-200 px-6 py-2 shrink-0 flex items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2.5">
        <button onclick="goBackTab()" class="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold cursor-pointer" title="Back (←)">←</button>
        <span id="active-tab-title" class="font-bold text-sm text-slate-900">Dashboard (Consolidated Profit &amp; Loss)</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button onclick="showTab('home')" class="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold cursor-pointer" title="Minimize (—)">—</button>
        <button onclick="toggleWorkspaceFullScreen()" class="h-8 w-8 rounded-md bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold cursor-pointer" title="Maximize / Full Screen (□)">□</button>
        <button onclick="showTab('home')" class="h-8 w-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer" title="Close (✕)">✕</button>
      </div>
    </div>

    <header class="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
      <div class="text-sm font-bold text-slate-800">Al-Hikmat General Hospital</div>
    </header>

    <main id="main-content-container" class="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl w-full mx-auto">
      <!-- TAB 1: CONSOLIDATED PROFIT & LOSS DASHBOARD -->
      <section id="tab-home" class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-[#0F2937]">Consolidated Profit & Loss Dashboard</h1>
            <p class="text-xs text-slate-500">All-Time & Daily Calculation of Customer Billing, Lab Billing, Pharmacy Retail, Medicine Wholesale Cost, Salaries & Expenses</p>
          </div>
          <div id="overall-badge"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="pnl-cards"></div>
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 class="text-base font-bold text-slate-900 mb-3">Total Hospital Profit & Loss Graph (Date-Wise Consolidated Trajectory)</h3>
          <div class="h-72"><canvas id="pnlChart"></canvas></div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 class="text-base font-bold text-slate-900 mb-3">Daily Profit & Loss Record (Short-Form Date-Wise Summary)</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 text-slate-500">
                  <th class="py-2">Date</th>
                  <th class="py-2 text-right">Customer / OPD Billing</th>
                  <th class="py-2 text-right">Lab Billing</th>
                  <th class="py-2 text-right">Pharmacy Retail</th>
                  <th class="py-2 text-right">Total Revenue</th>
                  <th class="py-2 text-right">Medicine Cost (COGS)</th>
                  <th class="py-2 text-right">Salaries & Expenses</th>
                  <th class="py-2 text-right">Net Profit / Loss</th>
                  <th class="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody id="daily-tbody" class="divide-y divide-slate-100 font-mono"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 2: PHARMACY RETAIL POS, ADD MEDICINE & SUPPLIER BILLS -->
      <section id="tab-pharmacy" class="hidden space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
            <h3 class="text-base font-bold text-slate-900">01. Hospital Pharmacy Retail POS (Retail Only)</h3>
            <form onsubmit="submitPos(event)" class="mt-3 space-y-3 text-xs">
              <input id="pos_cust" value="Walk-in Customer" class="w-full px-3 py-2 border rounded" placeholder="Customer Name (Optional)" />
              <select id="pos_batch" class="w-full px-3 py-2 border rounded bg-white"></select>
              <input id="pos_qty" type="number" value="1" min="1" class="w-full px-3 py-2 border rounded font-mono" placeholder="Quantity Sold" />
              <input id="pos_date" type="date" value="2026-10-10" class="w-full px-3 py-2 border rounded font-mono" />
              <button class="w-full py-2.5 bg-[#1D5464] text-white font-bold rounded cursor-pointer">Complete Retail Sale & Print Receipt</button>
            </form>
          </div>
          <div class="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
            <h3 class="text-base font-bold text-slate-900">02. Add New Medicine / Supplier Delivery (With Supplier Bill Paid & Remaining)</h3>
            <form onsubmit="submitMedicine(event)" class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <input id="m_sup" value="AGP Pharma Distributors" class="px-3 py-2 border rounded" placeholder="Supplier Name (Optional)" />
              <input id="m_brand" placeholder="Medicine Brand Name" class="px-3 py-2 border rounded" />
              <input id="m_gen" placeholder="Generic Formula (Optional)" class="px-3 py-2 border rounded" />
              <input id="m_batch" value="B26-NEW" class="px-3 py-2 border rounded font-mono" placeholder="Batch No (Optional)" />
              <input id="m_exp" type="date" value="2028-12-31" class="px-3 py-2 border rounded font-mono" />
              <input id="m_qty" type="number" value="10" class="px-3 py-2 border rounded font-mono" placeholder="Qty Ordered" />
              <input id="m_cost" type="number" value="35" class="px-3 py-2 border rounded font-mono" placeholder="Supplier Cost / Unit" />
              <input id="m_retail" type="number" value="50" class="px-3 py-2 border rounded font-mono" placeholder="Retail Price / Unit" />
              <input id="m_paid" type="number" value="350" class="px-3 py-2 border rounded font-mono" placeholder="Bill Paid Now" />
              <button class="col-span-2 sm:col-span-3 py-2.5 bg-slate-900 text-white font-bold rounded cursor-pointer">Add Medicine to Stock & Save Supplier Bill</button>
            </form>
          </div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-slate-900">03. Pharmacy Medicine Inventory, Search & Expiry Control</h3>
            <input id="pharm_search" oninput="renderApp()" placeholder="Search medicine name or batch..." class="px-3 py-1.5 border rounded text-xs w-64" />
          </div>
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b text-slate-500">
                <th class="py-2">Medicine & Formula</th>
                <th class="py-2">Batch & Supplier</th>
                <th class="py-2">Expiry Date</th>
                <th class="py-2 text-right">Stock Qty</th>
                <th class="py-2 text-right">Supplier Cost</th>
                <th class="py-2 text-right">Retail Price</th>
                <th class="py-2 text-right">Status</th>
                <th class="py-2 text-right">Delete</th>
              </tr>
            </thead>
            <tbody id="batches-tbody" class="divide-y font-mono"></tbody>
          </table>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 class="text-base font-bold text-slate-900 mb-3">04. Supplier Medicine Bills (Total Bill, Paid & Remaining)</h3>
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b text-slate-500">
                <th class="py-2">Bill No & Date</th>
                <th class="py-2">Supplier</th>
                <th class="py-2">Medicine & Qty</th>
                <th class="py-2 text-right">Total Bill</th>
                <th class="py-2 text-right">Paid</th>
                <th class="py-2 text-right">Remaining</th>
                <th class="py-2 text-right">Delete</th>
              </tr>
            </thead>
            <tbody id="supbills-tbody" class="divide-y font-mono"></tbody>
          </table>
        </div>
      </section>

      <!-- TAB 3: CUSTOMER BILLING, STAFF & SALARY, EXPENSES -->
      <section id="tab-billing" class="hidden space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h3 class="text-base font-bold text-slate-900">01. Customer / Lab Billing & Print Receipt</h3>
            <form onsubmit="submitBill(event)" class="mt-3 space-y-3 text-xs">
              <input id="b_cust" placeholder="Customer / Patient Name (Optional)" class="w-full px-3 py-2 border rounded" />
              <select id="b_dept" class="w-full px-3 py-2 border rounded bg-white">
                <option value="HOSPITAL">Hospital OPD / IPD Billing</option>
                <option value="LABORATORY">Laboratory Diagnostic Billing</option>
              </select>
              <input id="b_desc" placeholder="Service Description (Optional)" class="w-full px-3 py-2 border rounded" />
              <input id="b_amt" type="number" value="2000" class="w-full px-3 py-2 border rounded font-mono" />
              <input id="b_date" type="date" value="2026-10-10" class="w-full px-3 py-2 border rounded font-mono" />
              <button class="w-full py-2.5 bg-[#1D5464] text-white font-bold rounded cursor-pointer">Save Customer Bill & Print Receipt</button>
            </form>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-5">
            <h3 class="text-base font-bold text-slate-900">02. Add New Staff (Doctor, Cook, Cleaner, Guard, Other) & Pay Salary</h3>
            <form onsubmit="submitStaff(event)" class="mt-3 p-3.5 rounded-lg bg-[#F1F5F8] border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs items-end">
              <div class="flex flex-col justify-end">
                <label class="block font-semibold text-slate-700 mb-1">Staff Full Name</label>
                <input id="s_name" placeholder="Staff Full Name" class="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white" />
              </div>
              <div class="flex flex-col justify-end">
                <label class="block font-semibold text-slate-700 mb-1">Job / Field (Or Other)</label>
                <select id="s_desig_preset" onchange="document.getElementById('s_desig_wrap').classList.toggle('hidden', this.value!=='OTHER')" class="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white">
                  <option value="Doctor / Medical Officer">Doctor / Medical Officer</option>
                  <option value="Staff Nurse">Staff Nurse</option>
                  <option value="Lab Technologist / Assistant">Lab Technologist / Assistant</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Cook / Kitchen Staff (Bawarchi)">Cook / Kitchen Staff (Bawarchi)</option>
                  <option value="Sweeper / Cleaner (Jharo / Safai Wala)">Sweeper / Cleaner (Jharo / Safai Wala)</option>
                  <option value="Ward Boy / Aya">Ward Boy / Aya</option>
                  <option value="Security Guard / Chowkidar">Security Guard / Chowkidar</option>
                  <option value="Ambulance Driver">Ambulance Driver</option>
                  <option value="OTHER">Other / Custom Job (Khud Likhen)...</option>
                </select>
              </div>
              <div id="s_desig_wrap" class="hidden sm:col-span-2 flex flex-col justify-end">
                <label class="block font-semibold text-slate-700 mb-1">Write Custom Job / Role</label>
                <input id="s_desig" placeholder="Write Custom Job / Role..." class="w-full h-10 px-3 border border-teal-600 rounded-lg bg-white" />
              </div>
              <div class="flex flex-col justify-end">
                <label class="block font-semibold text-slate-700 mb-1">Department</label>
                <select id="s_dept" class="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white">
                  <option value="HOSPITAL">HOSPITAL</option>
                  <option value="LABORATORY">LABORATORY</option>
                  <option value="PHARMACY">PHARMACY</option>
                </select>
              </div>
              <div class="flex flex-col justify-end">
                <label class="block font-semibold text-slate-700 mb-1">Monthly Salary (PKR)</label>
                <input id="s_sal" type="number" value="55000" class="w-full h-10 px-3 border border-slate-300 rounded-lg font-mono bg-white" />
              </div>
              <div class="sm:col-span-2 flex items-center">
                <button class="w-full h-10 px-4 bg-[#1D5464] hover:bg-[#16424F] text-white font-bold rounded-lg cursor-pointer flex items-center justify-center">Add Staff Member</button>
              </div>
            </form>
            <div class="mt-4">
              <table class="w-full text-left border-collapse text-xs">
                <thead><tr class="border-b text-slate-500"><th class="py-1.5">Staff</th><th class="py-1.5 text-right">Salary</th><th class="py-1.5 text-right">Pay</th></tr></thead>
                <tbody id="staff-tbody" class="divide-y font-mono"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 4: COMPLETE HISTORY & LAPTOP BACKUPS -->
      <section id="tab-history" class="hidden space-y-6">
        <div class="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900">01. Offline Laptop Backup Save</h3>
            <p class="text-xs text-slate-500">Save full hospital database backup directly to your laptop hard drive</p>
          </div>
          <a href="/api/backup/download" download class="px-4 py-2.5 rounded-lg bg-[#1D5464] text-white font-bold text-xs">Save Backup to Laptop (.JSON)</a>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-slate-900">02. Complete All-Time Hospital History Register (With Search & Delete)</h3>
            <input id="hist_search" oninput="renderApp()" placeholder="Search history..." class="px-3 py-1.5 border rounded text-xs w-64" />
          </div>
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b text-slate-500">
                <th class="py-2">Date</th>
                <th class="py-2">Voucher</th>
                <th class="py-2">Type</th>
                <th class="py-2">Description</th>
                <th class="py-2 text-right">Amount</th>
                <th class="py-2 text-right">Delete / Return</th>
              </tr>
            </thead>
            <tbody id="history-tbody" class="divide-y font-mono"></tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

<script>
let STATE = null;
let pnlChartInstance = null;
let ACTIVE_PIN = localStorage.getItem('al_hikmat_pin') || '1234';

function lockApp() {
  document.getElementById('login-modal').classList.remove('hidden');
}
function toggleModalFullScreen(cardId) {
  const el = document.getElementById(cardId);
  if (!el) return;
  el.classList.toggle('max-w-md');
  el.classList.toggle('w-screen');
  el.classList.toggle('min-h-screen');
  el.classList.toggle('rounded-2xl');
  el.classList.toggle('rounded-xl');
}
function unlockApp() {
  const v = document.getElementById('pin-input').value;
  if (v === ACTIVE_PIN) {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('pin-input').value = '';
    document.getElementById('login-err').innerText = '';
  } else {
    document.getElementById('login-err').innerText = 'Incorrect Security PIN';
  }
}
function saveNewPin() {
  const oldP = document.getElementById('old-pin-in').value;
  const newP = document.getElementById('new-pin-in').value;
  if (oldP !== ACTIVE_PIN) {
    document.getElementById('pin-change-err').innerText = 'Incorrect Current (Old) PIN!';
    return;
  }
  if (newP.length < 4) {
    document.getElementById('pin-change-err').innerText = 'New PIN must be at least 4 digits.';
    return;
  }
  ACTIVE_PIN = newP;
  localStorage.setItem('al_hikmat_pin', newP);
  document.getElementById('old-pin-in').value = '';
  document.getElementById('new-pin-in').value = '';
  document.getElementById('pin-change-err').innerText = '';
  document.getElementById('change-pin-modal').classList.add('hidden');
}

let TAB_HISTORY = [];
let CURRENT_TAB = 'home';
const TAB_TITLES = {
  home: 'Dashboard (Consolidated Profit & Loss)',
  pharmacy: 'Pharmacy & Medicine Stock',
  billing: 'Customer Billing, Staff & Salary',
  history: 'History & Laptop Backups'
};

function toggleWorkspaceFullScreen() {
  const mc = document.getElementById('main-content-container');
  if (mc) {
    mc.classList.toggle('max-w-7xl');
    mc.classList.toggle('max-w-none');
  }
  try {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  } catch (e) {}
}

function goBackTab() {
  if (TAB_HISTORY.length > 0) {
    const prev = TAB_HISTORY.pop();
    showTab(prev, true);
  } else if (CURRENT_TAB !== 'home') {
    showTab('home', true);
  }
}

function showTab(tab, isBack) {
  if (!isBack && tab !== CURRENT_TAB) {
    TAB_HISTORY.push(CURRENT_TAB);
  }
  CURRENT_TAB = tab;
  const titleEl = document.getElementById('active-tab-title');
  if (titleEl && TAB_TITLES[tab]) titleEl.innerText = TAB_TITLES[tab];
  ['home', 'pharmacy', 'billing', 'history'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
    document.getElementById('btn-' + t).className = t === tab
      ? 'w-full text-left px-4 py-2.5 rounded-lg font-semibold bg-[#3B6E7C] text-white cursor-pointer'
      : 'w-full text-left px-4 py-2.5 rounded-lg font-medium text-teal-100 hover:bg-white/10 cursor-pointer';
  });
}

async function loadState() {
  const res = await fetch('/api/bootstrap');
  STATE = await res.json();
  renderApp();
}

function renderApp() {
  const days = STATE.dailyBreakdown || [];
  const totalRev = days.reduce((a, d) => a + d.totalRevenue, 0);
  const totalCost = days.reduce((a, d) => a + d.totalCostAndLoss, 0);
  const net = totalRev - totalCost;
  const today = days[days.length - 1] || { date: '2026-10-10', totalRevenue: 0, totalCostAndLoss: 0, netProfit: 0 };

  document.getElementById('overall-badge').innerHTML = net >= 0
    ? '<span class="px-3 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">HOSPITAL IN NET PROFIT</span>'
    : '<span class="px-3 py-1 rounded bg-rose-100 text-rose-800 font-bold text-xs">HOSPITAL IN NET LOSS</span>';

  document.getElementById('pnl-cards').innerHTML = `
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-xs text-slate-500 font-bold">ALL-TIME NET ${net >= 0 ? 'PROFIT' : 'LOSS'}</div>
      <div class="text-2xl font-bold font-mono mt-1 ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString()} PKR</div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-xs text-slate-500 font-bold">TODAY (${today.date})</div>
      <div class="text-2xl font-bold font-mono mt-1 ${today.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${today.netProfit >= 0 ? '+' : '-'}${Math.abs(today.netProfit).toLocaleString()} PKR</div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-xs text-slate-500 font-bold">TOTAL GROSS REVENUE</div>
      <div class="text-2xl font-bold font-mono mt-1 text-emerald-700">${totalRev.toLocaleString()} PKR</div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-xs text-slate-500 font-bold">TOTAL COSTS & SALARIES</div>
      <div class="text-2xl font-bold font-mono mt-1 text-rose-700">${totalCost.toLocaleString()} PKR</div>
    </div>
  `;

  const ctx = document.getElementById('pnlChart').getContext('2d');
  if (pnlChartInstance) pnlChartInstance.destroy();
  pnlChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days.map(d => d.date),
      datasets: [
        { label: 'Total Revenue', data: days.map(d => d.totalRevenue), backgroundColor: '#10b981' },
        { label: 'Total Costs & Salaries', data: days.map(d => d.totalCostAndLoss), backgroundColor: '#f43f5e' },
        { label: 'Net Profit / Loss', data: days.map(d => d.netProfit), type: 'line', borderColor: '#1D5464', borderWidth: 3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  document.getElementById('daily-tbody').innerHTML = [...days].reverse().map(d => `
    <tr>
      <td class="py-2 font-bold">${d.date}</td>
      <td class="py-2 text-right">${d.hospitalRev.toLocaleString()}</td>
      <td class="py-2 text-right">${d.labRev.toLocaleString()}</td>
      <td class="py-2 text-right">${d.pharmacyRev.toLocaleString()}</td>
      <td class="py-2 text-right text-emerald-700 font-bold">${d.totalRevenue.toLocaleString()}</td>
      <td class="py-2 text-right text-rose-600">-${d.pharmacyCogs.toLocaleString()}</td>
      <td class="py-2 text-right text-rose-600">-${d.expenses.toLocaleString()}</td>
      <td class="py-2 text-right font-bold ${d.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${d.netProfit >= 0 ? '+' : '-'}${Math.abs(d.netProfit).toLocaleString()}</td>
      <td class="py-2 text-right"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${d.netProfit >= 0 ? 'PROFIT' : 'LOSS'}</span></td>
    </tr>
  `).join('');

  document.getElementById('pos_batch').innerHTML = STATE.batches.map(b =>
    `<option value="${b.id}">${b.brand_name} (Stock: ${b.stock_qty}) — Retail: ${b.retail_price} PKR</option>`
  ).join('');

  const q = (document.getElementById('pharm_search')?.value || '').toLowerCase();
  document.getElementById('batches-tbody').innerHTML = STATE.batches
    .filter(b => !q || b.brand_name.toLowerCase().includes(q) || b.batch_no.toLowerCase().includes(q))
    .map(b => `
      <tr>
        <td class="py-2 font-sans"><b>${b.brand_name}</b><br/><span class="text-slate-500">${b.generic_name}</span></td>
        <td class="py-2">${b.batch_no} · ${b.supplier_name}</td>
        <td class="py-2">${b.expiry_date}</td>
        <td class="py-2 text-right font-bold">${b.stock_qty}</td>
        <td class="py-2 text-right">${b.unit_cost}</td>
        <td class="py-2 text-right font-bold">${b.retail_price}</td>
        <td class="py-2 text-right">${b.expiry_date < '2026-10-10' ? '<span class="text-rose-700 font-bold">EXPIRED</span>' : b.stock_qty <= 0 ? '<span class="text-rose-700 font-bold">OUT OF STOCK</span>' : '<span class="text-emerald-700 font-bold">AVAILABLE</span>'}</td>
        <td class="py-2 text-right"><button onclick="deleteRecord('batch','${b.id}')" class="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-xs cursor-pointer">Delete</button></td>
      </tr>
    `).join('');

  document.getElementById('supbills-tbody').innerHTML = STATE.supplierBills.map(sb => `
    <tr>
      <td class="py-2 font-bold">${sb.bill_no} · ${sb.business_date}</td>
      <td class="py-2 font-sans">${sb.supplier_name}</td>
      <td class="py-2 font-sans">${sb.brand_name} (x${sb.qty})</td>
      <td class="py-2 text-right font-bold">${sb.total_bill.toLocaleString()}</td>
      <td class="py-2 text-right text-emerald-700">${sb.paid_amount.toLocaleString()}</td>
      <td class="py-2 text-right text-amber-700 font-bold">${sb.remaining_amount.toLocaleString()}</td>
      <td class="py-2 text-right"><button onclick="deleteRecord('supplier_bill','${sb.id}')" class="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-xs cursor-pointer">Delete</button></td>
    </tr>
  `).join('');

  document.getElementById('staff-tbody').innerHTML = STATE.employees.map(e => `
    <tr>
      <td class="py-2 font-sans"><b>${e.full_name}</b> (${e.designation})</td>
      <td class="py-2 text-right font-bold">${e.net_salary.toLocaleString()} PKR</td>
      <td class="py-2 text-right space-x-1">
        <button onclick="paySalary('${e.id}')" class="px-2.5 py-1 bg-emerald-700 text-white rounded text-xs cursor-pointer">Pay Salary</button>
        <button onclick="deleteRecord('employee','${e.id}')" class="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs cursor-pointer">Delete</button>
      </td>
    </tr>
  `).join('');

  const hq = (document.getElementById('hist_search')?.value || '').toLowerCase();
  document.getElementById('history-tbody').innerHTML = STATE.journals
    .filter(j => !hq || j.narration.toLowerCase().includes(hq) || j.voucher_no.toLowerCase().includes(hq) || j.business_date.toLowerCase().includes(hq))
    .map(j => `
    <tr>
      <td class="py-2 font-bold">${j.business_date}</td>
      <td class="py-2">${j.voucher_no}</td>
      <td class="py-2">${j.cost_center} · ${j.ref_type}</td>
      <td class="py-2 font-sans">${j.narration}</td>
      <td class="py-2 text-right font-bold">${j.amount.toLocaleString()} PKR</td>
      <td class="py-2 text-right"><button onclick="deleteRecord('journal','${j.id}')" class="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-xs cursor-pointer">Delete / Return</button></td>
    </tr>
  `).join('');
}

async function deleteRecord(kind, id) {
  await fetch('/api/delete', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ kind, id })
  });
  await loadState();
}

async function submitPos(e) {
  e.preventDefault();
  await fetch('/api/pos', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      customer_name: document.getElementById('pos_cust').value,
      batch_id: document.getElementById('pos_batch').value,
      qty: Number(document.getElementById('pos_qty').value),
      business_date: document.getElementById('pos_date').value
    })
  });
  await loadState();
  window.print();
}

async function submitMedicine(e) {
  e.preventDefault();
  await fetch('/api/medicine', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      supplier_name: document.getElementById('m_sup').value,
      brand_name: document.getElementById('m_brand').value,
      generic_name: document.getElementById('m_gen').value,
      batch_no: document.getElementById('m_batch').value,
      expiry_date: document.getElementById('m_exp').value,
      qty: Number(document.getElementById('m_qty').value),
      unit_cost: Number(document.getElementById('m_cost').value),
      retail_price: Number(document.getElementById('m_retail').value),
      paid_amount: Number(document.getElementById('m_paid').value)
    })
  });
  await loadState();
}

async function submitBill(e) {
  e.preventDefault();
  await fetch('/api/bill', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      customer_name: document.getElementById('b_cust').value,
      department: document.getElementById('b_dept').value,
      description: document.getElementById('b_desc').value,
      amount: Number(document.getElementById('b_amt').value),
      business_date: document.getElementById('b_date').value
    })
  });
  await loadState();
  window.print();
}

async function submitStaff(e) {
  e.preventDefault();
  await fetch('/api/staff', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      full_name: document.getElementById('s_name').value,
      designation: document.getElementById('s_desig').value,
      department: document.getElementById('s_dept').value,
      net_salary: Number(document.getElementById('s_sal').value)
    })
  });
  await loadState();
}

async function paySalary(empId) {
  await fetch('/api/pay-salary', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ employee_id: empId })
  });
  await loadState();
}

loadState();
</script>
</body>
</html>
"""


class HospitalErpHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        raw = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/" or self.path.startswith("/index"):
            raw = HTML_PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        elif self.path.startswith("/api/bootstrap"):
            self._send_json(compute_state())
        elif self.path.startswith("/api/backup/download"):
            raw = json.dumps(compute_state(), indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Disposition", 'attachment; filename="Al-Hikmat-HMS-Laptop-Backup.json"')
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}
        conn = get_db()
        cur = conn.cursor()
        ts = str(int(datetime.datetime.now().timestamp() * 1000))

        if self.path == "/api/pos":
            b = cur.execute("SELECT * FROM pharmacy_batches WHERE id = ?", (body["batch_id"],)).fetchone()
            qty = int(body["qty"])
            if b and b["stock_qty"] >= qty:
                cur.execute("UPDATE pharmacy_batches SET stock_qty = stock_qty - ? WHERE id = ?", (qty, body["batch_id"]))
                rev = float(b["retail_price"]) * qty
                cogs = float(b["unit_cost"]) * qty
                cur.execute(
                    "INSERT INTO journal_entries VALUES (?,?,?,?,?,?,?,?)",
                    (f"JRN-{ts}", f"JV-{ts[-4:]}", body["business_date"], "PHARMACY", "INVOICE", f"Pharmacy Retail Sale: {b['brand_name']} (x{qty})", rev, cogs)
                )
        elif self.path == "/api/medicine":
            qty = int(body["qty"])
            cost = float(body["unit_cost"])
            retail = float(body["retail_price"])
            total_bill = qty * cost
            paid = min(total_bill, float(body.get("paid_amount", total_bill)))
            rem = max(0.0, total_bill - paid)
            cur.execute(
                "INSERT INTO pharmacy_batches VALUES (?,?,?,?,?,?,?,?,?,?)",
                (f"BAT-{ts}", body["brand_name"], body.get("generic_name", body["brand_name"]), "Tablet", body["batch_no"], body["supplier_name"], body["expiry_date"], qty, cost, retail)
            )
            cur.execute(
                "INSERT INTO supplier_bills VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (f"SB-{ts}", f"SUP-{ts[-4:]}", "2026-10-10", body["supplier_name"], body["brand_name"], body["batch_no"], qty, cost, retail, total_bill, paid, rem)
            )
        elif self.path == "/api/bill":
            amt = float(body["amount"])
            cur.execute(
                "INSERT INTO journal_entries VALUES (?,?,?,?,?,?,?,?)",
                (f"JRN-{ts}", f"JV-{ts[-4:]}", body["business_date"], body["department"], "INVOICE", f"Customer Bill ({body['customer_name']}): {body['description']}", amt, 0)
            )
        elif self.path == "/api/staff":
            cur.execute(
                "INSERT INTO employees VALUES (?,?,?,?,?,?)",
                (f"EMP-{ts}", f"EMP-{ts[-3:]}", body["full_name"], body["designation"], body["department"], float(body["net_salary"]))
            )
        elif self.path == "/api/pay-salary":
            emp = cur.execute("SELECT * FROM employees WHERE id = ?", (body["employee_id"],)).fetchone()
            if emp:
                cur.execute(
                    "INSERT INTO salary_slips VALUES (?,?,?,?,?,?,?)",
                    (f"SAL-{ts}", "2026-10", "2026-10-10", emp["full_name"], emp["designation"], emp["department"], emp["net_salary"])
                )
                cur.execute(
                    "INSERT INTO journal_entries VALUES (?,?,?,?,?,?,?,?)",
                    (f"JRN-{ts}", f"JV-{ts[-4:]}", "2026-10-10", emp["department"], "PAYROLL", f"Staff Salary Paid: {emp['full_name']} ({emp['designation']})", emp["net_salary"], 0)
                )
        elif self.path == "/api/delete":
            kind = body.get("kind")
            rec_id = body.get("id")
            if kind == "batch":
                cur.execute("DELETE FROM pharmacy_batches WHERE id = ?", (rec_id,))
            elif kind == "supplier_bill":
                cur.execute("DELETE FROM supplier_bills WHERE id = ?", (rec_id,))
            elif kind == "employee":
                cur.execute("DELETE FROM employees WHERE id = ?", (rec_id,))
            elif kind == "journal":
                cur.execute("DELETE FROM journal_entries WHERE id = ?", (rec_id,))

        conn.commit()
        conn.close()
        self._send_json({"ok": True}, 201)


if __name__ == "__main__":
    init_db()
    url = f"http://localhost:{PORT}"
    print(f"Al-Hikmat Hospital ERP (Python Edition) running at {url}")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    HTTPServer(("0.0.0.0", PORT), HospitalErpHandler).serve_forever()
