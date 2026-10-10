# Security Specification — Hospital ERP (Developed by Sajjad Qaiser Shah)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths in Firestore are unconditionally rejected (`allow read, write: if false;`).
2. **Verified Authentication**: Every write requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document ID (`{userId}`, `{logId}`, `{snapshotId}`) must match `^[a-zA-Z0-9_\-]+$` and have `.size() <= 128`.
4. **PII Isolation**: `/users/{userId}` contains staff email and role metadata; `get` and `list` are strictly restricted to the document owner (`request.auth.uid == userId`) or the verified system administrator (`sajjadshaha58@gmail.com`).
5. **Privilege Escalation Prevention**: Users creating their own `/users/{userId}` profile cannot self-assign `ADMIN` unless they are the verified bootstrapped administrator (`sajjadshaha58@gmail.com`). Role cannot be modified by non-admins during update.
6. **Immutable Audit History**: `/audit_logs/{logId}` documents are write-once (`allow update, delete: if false;`). `actorUid` must equal `request.auth.uid`, and `createdAt` must equal `request.time`.
7. **Strict Key & Size Enforcement**: Every entity validation helper checks `hasAll` and `hasOnly` for keys and bounds every string property with `.size() <= maxLength`.

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Unauthenticated Write)**: `auth = null`, creating `/users/user_1`. Expected: `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Spoof)**: `auth = { uid: 'u1', token: { email: 'sajjadshaha58@gmail.com', email_verified: false } }`, creating admin profile. Expected: `PERMISSION_DENIED`.
3. **Payload 3 (Self-Assigned Admin Escalation)**: Non-admin user creating `/users/u2` with `role: "ADMIN"`. Expected: `PERMISSION_DENIED`.
4. **Payload 4 (Shadow Field Injection)**: Creating `/users/u1` with an extra undeclared field `isSuperAdmin: true`. Expected: `PERMISSION_DENIED`.
5. **Payload 5 (PII Cross-User Read)**: User `u2` attempting `get` on `/users/u1`. Expected: `PERMISSION_DENIED`.
6. **Payload 6 (Unbounded String DoW)**: Creating `/audit_logs/log_1` with `summary` of length 5,000 chars (`maxLength: 500`). Expected: `PERMISSION_DENIED`.
7. **Payload 7 (ID Poisoning)**: Creating `/erp_snapshots/bad$id!@#` with invalid characters. Expected: `PERMISSION_DENIED`.
8. **Payload 8 (Identity Spoofing in Audit Log)**: User `u1` creating `/audit_logs/log_1` with `actorUid: "u2"`. Expected: `PERMISSION_DENIED`.
9. **Payload 9 (Audit Log Tampering / Update)**: Any user or admin attempting `update` on finalized `/audit_logs/log_1`. Expected: `PERMISSION_DENIED`.
10. **Payload 10 (Audit Log Deletion)**: Any user attempting `delete` on `/audit_logs/log_1`. Expected: `PERMISSION_DENIED`.
11. **Payload 11 (Timestamp Forgery)**: Creating `/erp_snapshots/snap_1` with a past/future `createdAt` not matching `request.time`. Expected: `PERMISSION_DENIED`.
12. **Payload 12 (Immutable Owner Mutation)**: Updating `/erp_snapshots/snap_1` to change `ownerId` or `createdAt`. Expected: `PERMISSION_DENIED`.
