# Deployment Acceptance & Recovery Manual — Developed by Sajjad Qaiser Shah

## 1. Network Architecture & Local-Network Deployment
- **Topology**: Single-hospital on-premises local server (`192.168.10.10`) connected via redundant gigabit LAN switches to:
  1. **Hospital LAN Web Clients**: Reception, OPD Consulting Rooms, Nursing Stations, Laboratory Workstations, Billing Counters (`https://erp.hospital.lan:3000`).
  2. **Secure Windows Desktop Application**: Packaged via Electron / WebView2 in Kiosk/Workstation policy mode for Pharmacy POS barcode scanners and thermal receipt printers.
  3. **Responsive Mobile Clients**: Doctors and ward nurses over secured WPA3-Enterprise Hospital Wi-Fi VLAN (`192.168.20.0/24`).
- **Port Isolation Rule**:
  - PostgreSQL (`5432/tcp`) binds strictly to `127.0.0.1` (loopback) on the central server.
  - Client devices on the LAN/Wi-Fi can **only** reach the HTTPS application server (`3000/tcp` or `443/tcp` via local reverse proxy). Direct database connections from workstations are blocked by host firewall (`ufw`/`nftables` / Windows Defender Firewall).
- **Zero-Internet Continuity**:
  - All clinical, laboratory, pharmacy POS, billing, HR/payroll, and accounting operations execute locally against the central server without requiring internet connectivity.
  - When internet connectivity is lost, the AI reporting assistant degrades gracefully to its deterministic local SQL/ledger analytical engine without blocking any clinical or financial workflow.

## 2. Financial Definitions & Double-Entry Accounting Rules
- **Three Distinct Timestamps**:
  1. `businessDate` (`YYYY-MM-DD`): The operational/clinical service date for accrual revenue and date-wise P&L.
  2. `createdAt` (ISO-8601 UTC timestamp): Exact system entry timestamp for immutable audit trail.
  3. `paymentDate` (`YYYY-MM-DD`): Actual cash/bank settlement date for cash-flow reconciliation.
- **Anti-Double-Counting Invariants**:
  - **Inventory Purchases**: Recorded as `DR Pharmacy Inventory (Asset) / CR Accounts Payable or Cash`. Never counted as an expense at purchase time; Cost of Goods Sold (`DR Cost of Goods Sold / CR Pharmacy Inventory`) is recognized atomically only when stock is dispensed/sold.
  - **Internal Transfers & Interdepartmental Issues**: Moving stock from Main Pharmacy Store to IPD Ward Emergency Stock (`INTERNAL_TRANSFER`, `isInternalTransfer = true`) records `DR Ward Consignment Stock / CR Pharmacy Main Inventory` and is **excluded** from revenue and expense totals.

## 3. Backup, Archiving & Isolated Restoration Procedure
1. **Automated Encrypted Backups**:
   - Full logical + physical snapshot encrypted with `AES-256-GCM` (PBKDF2 SHA-256 key derivation) plus SHA-256 integrity manifest.
2. **Storage Tiers**:
   - **Primary Local Server**: `/var/backups/hospital-erp/primary`
   - **Separate Network NAS**: `/mnt/hospital-nas/erp-backups`
   - **Disconnected Offline Media (Air-Gapped USB/Tape)**: Rotated daily and physically disconnected after verification.
3. **Isolated Restoration Command**:
   ```bash
   # Verify SHA-256 checksum & decrypt archive into isolated test database (hospital_erp_restore_test)
   openssl enc -d -aes-256-cbc -pbkdf2 -in backup_verified.enc -out restore.sql -pass env:BACKUP_PASSPHRASE
   psql -h 127.0.0.1 -U postgres -d hospital_erp_restore_test -f restore.sql
   ```

## 4. Windows Desktop Packaging Specification
- Use the included Windows Desktop wrapper configuration (`electron-builder` / Edge WebView2 App Mode):
  ```powershell
  msedge.exe --app="https://192.168.10.10:3000?client=windows-desktop" --start-maximized
  ```
