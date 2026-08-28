import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface AuditLog {
  id: string;
  action: string; // e.g., 'UPDATE_VIP', 'VERIFY_BUSINESS', 'EDIT_NEWS', 'SUPERVISOR_PERMS', 'DELETE_ITEM'
  actionAr: string; // Human readable in Arabic
  details: string;
  performedBy: string; // User name or email
  userRole?: string;
  targetId?: string;
  targetName?: string;
  timestamp: number;
}

const LOCAL_AUDIT_LOGS_KEY = 'irbid_admin_audit_logs';

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export function getLocalAuditLogs(): AuditLog[] {
  try {
    const data = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading local audit logs', e);
  }
  return INITIAL_AUDIT_LOGS;
}

export function saveLocalAuditLog(log: Omit<AuditLog, 'id'>) {
  const logs = getLocalAuditLogs();
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    ...log
  };
  const updated = [newLog, ...logs].slice(0, 100);
  try {
    localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving local audit log', e);
  }
  return newLog;
}

export async function recordAuditLog(log: Omit<AuditLog, 'id'>) {
  const localSaved = saveLocalAuditLog(log);
  if (db) {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        ...log,
        timestamp: log.timestamp || Date.now()
      });
    } catch (e) {
      console.warn('Could not save audit log to firestore, saved locally:', e);
    }
  }
  return localSaved;
}

export async function fetchAuditLogsFromFirestore(): Promise<AuditLog[]> {
  if (!db) return getLocalAuditLogs();
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    const list: AuditLog[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as AuditLog);
    });
    if (list.length > 0) return list;
  } catch (e) {
    console.warn('Could not fetch audit logs from firestore:', e);
  }
  return getLocalAuditLogs();
}
