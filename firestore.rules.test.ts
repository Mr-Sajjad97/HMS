/**
 * Security Rules Verification Suite — Developed by Sajjad Qaiser Shah
 * Validates that all Dirty Dozen adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  { id: 1, name: 'Unauthenticated Write to /users', collection: 'users', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Unverified Email Admin Spoof', collection: 'users', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Self-Assigned ADMIN Role Escalation', collection: 'users', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Shadow Field Injection (isSuperAdmin)', collection: 'users', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'PII Cross-User Read on /users/{otherUid}', collection: 'users', operation: 'get', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Unbounded String Resource Exhaustion (>500 chars)', collection: 'audit_logs', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Path Variable ID Poisoning', collection: 'erp_snapshots', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Identity Spoofing in Audit Log actorUid', collection: 'audit_logs', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Audit Log Mutation / Tampering', collection: 'audit_logs', operation: 'update', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Audit Log Deletion Attempt', collection: 'audit_logs', operation: 'delete', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Client Timestamp Forgery (createdAt != request.time)', collection: 'erp_snapshots', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Immutable Field Mutation (ownerId / createdAt)', collection: 'erp_snapshots', operation: 'update', expected: 'PERMISSION_DENIED' },
];
