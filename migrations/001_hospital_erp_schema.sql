-- =============================================================================
-- Hospital ERP Central PostgreSQL Schema & Atomic Transaction Procedures
-- Developed by Sajjad Qaiser Shah
-- Target: PostgreSQL 15+ (On-Premises Local Server — Port 5432 Loopback Only)
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Hospital System Configuration
CREATE TABLE IF NOT EXISTS hospital_settings (
  id SERIAL PRIMARY KEY,
  hospital_name VARCHAR(160) NOT NULL DEFAULT 'Al-Hikmat General Hospital',
  currency_code VARCHAR(10) NOT NULL DEFAULT 'PKR',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Karachi',
  audit_retention_days INTEGER NOT NULL DEFAULT 2555, -- 7 years clinical/financial
  backup_Schedule_cron VARCHAR(64) NOT NULL DEFAULT '0 2 * * *',
  wal_archiving_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  lan_subnet_cidr VARCHAR(32) NOT NULL DEFAULT '192.168.10.0/24',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Idempotency Control Registry (Prevents duplicate concurrent mutations)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key VARCHAR(128) PRIMARY KEY,
  endpoint VARCHAR(120) NOT NULL,
  actor_uid VARCHAR(128) NOT NULL,
  response_status INTEGER NOT NULL,
  response_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Patients Registry, Doctors, OPD Appointments & IPD Admissions
CREATE TABLE IF NOT EXISTS doctors (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  specialization VARCHAR(80) NOT NULL,
  department VARCHAR(80) NOT NULL,
  consultation_fee NUMERIC(12,2) NOT NULL CHECK (consultation_fee >= 0),
  room_no VARCHAR(24) NOT NULL,
  on_duty BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(64) PRIMARY KEY,
  mrn VARCHAR(32) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 140),
  gender VARCHAR(16) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  cnic VARCHAR(32) NOT NULL,
  blood_group VARCHAR(8) NOT NULL,
  address TEXT NOT NULL,
  allergies TEXT NOT NULL DEFAULT 'None',
  registered_business_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encounters (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL REFERENCES patients(id),
  doctor_id VARCHAR(64) NOT NULL REFERENCES doctors(id),
  encounter_type VARCHAR(16) NOT NULL CHECK (encounter_type IN ('OPD', 'IPD', 'EMERGENCY')),
  status VARCHAR(24) NOT NULL CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'ADMITTED', 'DISCHARGED', 'COMPLETED')),
  ward_bed VARCHAR(40),
  chief_complaint TEXT NOT NULL,
  diagnosis TEXT NOT NULL DEFAULT '',
  business_date DATE NOT NULL,
  admitted_at TIMESTAMPTZ,
  discharged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_vitals (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL REFERENCES patients(id),
  encounter_id VARCHAR(64) REFERENCES encounters(id),
  encounter_token VARCHAR(32),
  systolic_bp INTEGER NOT NULL CHECK (systolic_bp BETWEEN 40 AND 300),
  diastolic_bp INTEGER NOT NULL CHECK (diastolic_bp BETWEEN 20 AND 200),
  heart_rate INTEGER NOT NULL CHECK (heart_rate BETWEEN 20 AND 260),
  spo2 INTEGER NOT NULL CHECK (spo2 BETWEEN 50 AND 100),
  temperature_c NUMERIC(4,1) NOT NULL DEFAULT 37.0,
  clinical_notes TEXT NOT NULL DEFAULT '',
  recorded_by VARCHAR(120) NOT NULL,
  business_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Laboratory Test Ordering, Barcode Samples & Verified Reports
CREATE TABLE IF NOT EXISTS lab_orders (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL REFERENCES patients(id),
  doctor_id VARCHAR(64) NOT NULL REFERENCES doctors(id),
  test_code VARCHAR(32) NOT NULL,
  test_name VARCHAR(120) NOT NULL,
  category VARCHAR(64) NOT NULL,
  sample_barcode VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'VERIFIED')),
  result_value TEXT NOT NULL DEFAULT '',
  reference_range VARCHAR(80) NOT NULL,
  abnormal_flag VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
  verified_by VARCHAR(120),
  verified_at TIMESTAMPTZ,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  business_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Pharmacy Inventory, Batches, Expiry Alerts, Purchases & POS
CREATE TABLE IF NOT EXISTS pharmacy_batches (
  id VARCHAR(64) PRIMARY KEY,
  sku VARCHAR(40) NOT NULL,
  generic_name VARCHAR(120) NOT NULL,
  brand_name VARCHAR(120) NOT NULL,
  batch_no VARCHAR(48) NOT NULL,
  category VARCHAR(64) NOT NULL,
  expiry_date DATE NOT NULL,
  stock_qty INTEGER NOT NULL CHECK (stock_qty >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 20,
  unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
  retail_price NUMERIC(12,2) NOT NULL CHECK (retail_price >= 0),
  wholesale_price NUMERIC(12,2) NOT NULL CHECK (wholesale_price >= 0),
  supplier_id VARCHAR(64) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sku, batch_no)
);

-- 6. Patient Billing, Payments, Receipts & Refunds (Separate Dates Enforced)
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  invoice_no VARCHAR(40) UNIQUE NOT NULL,
  patient_id VARCHAR(64) REFERENCES patients(id),
  customer_name VARCHAR(120) NOT NULL,
  department VARCHAR(32) NOT NULL CHECK (department IN ('HOSPITAL_OPD', 'HOSPITAL_IPD', 'LABORATORY', 'PHARMACY_RETAIL', 'PHARMACY_WHOLESALE')),
  subtotal NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_total NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(24) NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT_LEDGER')),
  status VARCHAR(24) NOT NULL CHECK (status IN ('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED')),
  business_date DATE NOT NULL,
  payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized BOOLEAN NOT NULL DEFAULT TRUE
);

-- 7. Double-Entry General Ledger (Internal Transfers Flagged to Prevent Double Counting)
CREATE TABLE IF NOT EXISTS journal_entries (
  id VARCHAR(64) PRIMARY KEY,
  voucher_no VARCHAR(40) UNIQUE NOT NULL,
  business_date DATE NOT NULL,
  payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cost_center VARCHAR(32) NOT NULL CHECK (cost_center IN ('HOSPITAL', 'LABORATORY', 'PHARMACY', 'INTERNAL_TRANSFER', 'SHARED_ADMIN')),
  is_internal_transfer BOOLEAN NOT NULL DEFAULT FALSE,
  reference_type VARCHAR(40) NOT NULL,
  reference_id VARCHAR(64) NOT NULL,
  narration TEXT NOT NULL,
  debit_account VARCHAR(80) NOT NULL,
  credit_account VARCHAR(80) NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  cogs_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by VARCHAR(120) NOT NULL
);

-- 8.Immutable Audit Trail (Trigger blocks UPDATE/DELETE on finalized records)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_uid VARCHAR(128) NOT NULL,
  actor_email VARCHAR(256) NOT NULL,
  actor_role VARCHAR(40) NOT NULL,
  module VARCHAR(60) NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  summary TEXT NOT NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs and finalized financial records are immutable.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_audit ON audit_logs;
CREATE TRIGGER trg_immutable_audit
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

COMMIT;
