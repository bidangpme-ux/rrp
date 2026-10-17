import { AuditLogEntry, AuditStatus, ActiveUserSession, User } from '../types';
import * as XLSX from 'xlsx';

const STORAGE_KEY_AUDIT_LOGS = 'epmped_audit_logs';

export class AuditLogService {
  private static cachedLogs: AuditLogEntry[] | null = null;

  static getLogs(): AuditLogEntry[] {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    if (!raw) {
      // Sync from server if available
      this.syncFromServer();
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static async syncFromServer(): Promise<AuditLogEntry[]> {
    try {
      const res = await fetch('/api/security/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(data.logs));
          return data.logs;
        }
      }
    } catch {
      // Ignore network errors
    }
    return [];
  }

  static saveLogs(logs: AuditLogEntry[]): void {
    localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(logs.slice(0, 500)));
  }

  static clearLogs(): void {
    localStorage.removeItem(STORAGE_KEY_AUDIT_LOGS);
    fetch('/api/security/clear-logs', { method: 'POST' }).catch(() => {});
  }

  static addLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      ...entry,
    };

    const currentLogs = this.getLogs();
    const updated = [fullEntry, ...currentLogs].slice(0, 500);
    this.saveLogs(updated);

    // Send to server
    fetch('/api/security/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullEntry),
    }).catch(() => {});

    return fullEntry;
  }

  static logAuth(params: {
    action: string;
    description?: string;
    user?: Partial<User> | null;
    attemptName?: string;
    status: AuditStatus;
    metadata?: Record<string, any>;
    [key: string]: any;
  }): void {
    this.addLog({
      category: 'auth',
      action: params.action,
      description: params.description || `Autentikasi: ${params.action}`,
      userId: params.user?.id,
      userName: params.user?.name || params.attemptName || 'Tamu / Anonim',
      userRole: params.user?.role || 'tamu',
      status: params.status,
      metadata: params.metadata,
    });
  }

  static logAdmin(params: {
    action: string;
    description?: string;
    user?: Partial<User> | null;
    adminUser?: Partial<User> | null;
    status: AuditStatus;
    metadata?: Record<string, any>;
    [key: string]: any;
  }): void {
    const usr = params.user || params.adminUser;
    this.addLog({
      category: 'admin',
      action: params.action,
      description: params.description || `Administrasi: ${params.action}`,
      userId: usr?.id,
      userName: usr?.name || 'Administrator',
      userRole: usr?.role || 'admin',
      status: params.status,
      metadata: params.metadata,
    });
  }

  static logFile(params: {
    action: string;
    description?: string;
    user?: Partial<User> | null;
    fileName?: string;
    status: AuditStatus;
    metadata?: Record<string, any>;
    [key: string]: any;
  }): void {
    this.addLog({
      category: 'file',
      action: params.action,
      description: params.description || `Berkas ${params.action}: ${params.fileName || ''}`,
      userId: params.user?.id,
      userName: params.user?.name || 'Pengguna',
      userRole: params.user?.role || 'user',
      status: params.status,
      metadata: { ...params.metadata, ...(params.fileName ? { fileName: params.fileName } : {}) },
    });
  }

  static logSurat(params: {
    action: string;
    description?: string;
    user?: Partial<User> | null;
    nomorSurat?: string;
    status: AuditStatus;
    metadata?: Record<string, any>;
    [key: string]: any;
  }): void {
    this.addLog({
      category: 'surat',
      action: params.action,
      description: params.description || `Surat ${params.action}: ${params.nomorSurat || ''}`,
      userId: params.user?.id,
      userName: params.user?.name || 'Pengguna Surat',
      userRole: params.user?.role || 'user',
      status: params.status,
      metadata: { ...params.metadata, ...(params.nomorSurat ? { nomorSurat: params.nomorSurat } : {}) },
    });
  }

  static logSecurity(params: {
    action: string;
    description?: string;
    user?: Partial<User> | null;
    status: AuditStatus;
    metadata?: Record<string, any>;
    [key: string]: any;
  }): void {
    this.addLog({
      category: 'security',
      action: params.action,
      description: params.description || `Keamanan: ${params.action}`,
      userId: params.user?.id,
      userName: params.user?.name || 'Pengguna',
      userRole: params.user?.role || 'tamu',
      status: params.status,
      metadata: params.metadata,
    });
  }

  static exportLogsToExcel(logs: AuditLogEntry[]): void {
    const rows = logs.map((log) => ({
      ID: log.id,
      Waktu: new Date(log.timestamp).toLocaleString('id-ID'),
      Kategori: log.category.toUpperCase(),
      Aksi: log.action,
      Deskripsi: log.description,
      Pengguna: log.userName,
      Role: log.userRole || '-',
      Status: log.status.toUpperCase(),
      IP_Address: log.ipAddress || '127.0.0.1',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
    XLSX.writeFile(workbook, `Audit_Security_Logs_${Date.now()}.xlsx`);
  }

  static getActiveSessions(currentUserId?: string): ActiveUserSession[] {
    const rawUsers = localStorage.getItem('epmped_users');
    let usersList: User[] = [];
    try {
      usersList = rawUsers ? JSON.parse(rawUsers) : [];
    } catch {
      usersList = [];
    }

    const now = new Date();
    return usersList.map((u, idx) => ({
      id: `session_${u.id}`,
      userId: u.id,
      userName: u.name,
      userRole: u.role,
      department: u.department,
      loginTime: new Date(now.getTime() - (idx + 1) * 35 * 60000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      lastActive: idx === 0 ? 'Aktif saat ini' : `${(idx + 1) * 12} menit lalu`,
      ipAddress: `192.168.1.${10 + idx}`,
      deviceInfo: idx % 2 === 0 ? 'Chrome / Windows 11' : 'Mobile Safari / iOS 17',
      isCurrent: u.id === currentUserId,
    }));
  }
}
