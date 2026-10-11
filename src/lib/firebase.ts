/**
 * Firebase Client SDK & Hardened Firestore Error Handler
 * Developed by Sajjad Qaiser Shah
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { StaffRole } from '../types/erp.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore when authenticated
async function testConnection() {
  if (!auth.currentUser) return;
  try {
    await getDocFromServer(doc(db, 'users', sanitizeId(auth.currentUser.uid)));
  } catch {
    // Silent fallback when operating on offline local LAN server
  }
}
testConnection();

// Blueprint constraints from firebase-blueprint.json
export const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned || 'id_default';
}

export async function syncUserProfileToFirestore(
  uid: string,
  email: string,
  name: string,
  role: StaffRole,
  department: string
) {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return null;
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    const userRef = doc(db, 'users', safeUid);
    const existing = await getDoc(userRef);
    const effectiveRole: StaffRole =
      email === 'sajjadshaha58@gmail.com' ? 'ADMIN' : existing.exists() ? (existing.data().role as StaffRole) : role === 'ADMIN' ? 'DOCTOR' : role;
    if (!existing.exists()) {
      await setDoc(userRef, {
        uid: safeUid,
        email: email.slice(0, 256),
        name: (name || 'Hospital Staff').slice(0, 120),
        role: effectiveRole,
        department: (department || 'General Administration').slice(0, 80),
        createdAt: serverTimestamp(),
      });
    }
    return effectiveRole;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function mirrorAuditLogToFirestore(params: {
  id: string;
  module: string;
  action: string;
  entityId: string;
  summary: string;
  actorRole: StaffRole;
}) {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeLogId = sanitizeId(params.id);
  const path = `audit_logs/${safeLogId}`;
  try {
    await setDoc(doc(db, 'audit_logs', safeLogId), {
      actorUid: sanitizeId(auth.currentUser.uid),
      actorEmail: (auth.currentUser.email || 'staff@hospital.lan').slice(0, 256),
      actorRole: params.actorRole.slice(0, 40),
      module: params.module.slice(0, 60),
      action: params.action.slice(0, 120),
      entityId: sanitizeId(params.entityId),
      summary: params.summary.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchMyFirestoreAuditLogs() {
  if (!auth.currentUser) return [];
  const path = 'audit_logs';
  try {
    const q = query(
      collection(db, 'audit_logs'),
      where('actorUid', '==', sanitizeId(auth.currentUser.uid))
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
