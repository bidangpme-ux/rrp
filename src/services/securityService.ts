import { SecurityConfig, User } from '../types';
import { AuditLogService } from './auditLogService';

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  antiInspectEnabled: true,
  blockContextMenu: true,
  blockKeyboardShortcuts: true,
  detectDevTools: true,
  showWarningToast: true,
  maskAccessCodes: true,
};

export interface SecurityAlertState {
  title: string;
  message: string;
  reason: string;
  timestamp: string;
}

type SecuritySubscriber = (alert: SecurityAlertState) => void;

const STORAGE_KEY_CONFIG = 'epmped_security_config';

export class SecurityService {
  private static subscribers: Set<SecuritySubscriber> = new Set();
  private static currentUser: User | null = null;
  private static initialized = false;

  static getConfig(): SecurityConfig {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return { ...DEFAULT_SECURITY_CONFIG };
    try {
      return { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SECURITY_CONFIG };
    }
  }

  static saveConfig(updates: Partial<SecurityConfig>): SecurityConfig {
    const current = this.getConfig();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));

    // Persist to server
    fetch('/api/security/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: updated }),
    }).catch(() => {});

    return updated;
  }

  static setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  static subscribe(fn: SecuritySubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  static notify(alert: SecurityAlertState): void {
    this.subscribers.forEach((fn) => {
      try {
        fn(alert);
      } catch (e) {
        console.error('Error notifying security subscriber:', e);
      }
    });
  }

  static init(): void {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    // 1. Right Click Protection
    window.addEventListener('contextmenu', (e: MouseEvent) => {
      const config = this.getConfig();
      if (!config.antiInspectEnabled || !config.blockContextMenu) return;

      e.preventDefault();
      const nowStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (config.showWarningToast) {
        this.notify({
          title: 'Klik Kanan Dinonaktifkan',
          message: 'Akses menu konteks klik kanan dibatasi untuk menjaga keamanan dokumen dan kerahasiaan arsip instansi.',
          reason: 'Proteksi Integritas Halaman',
          timestamp: nowStr,
        });
      }

      AuditLogService.logSecurity({
        action: 'CONTEXT_MENU_BLOCKED',
        description: 'Mencoba membuka menu klik kanan pada halaman.',
        user: this.currentUser,
        status: 'warning',
        metadata: { x: e.clientX, y: e.clientY },
      });
    });

    // 2. Keyboard shortcut protection (F12, Ctrl+Shift+I, Ctrl+U, etc.)
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const config = this.getConfig();
      if (!config.antiInspectEnabled || !config.blockKeyboardShortcuts) return;

      const isF12 = e.key === 'F12';
      const isInspect = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j');
      const isViewSource = (e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U');
      const isSavePage = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');

      if (isF12 || isInspect || isViewSource || isSavePage) {
        e.preventDefault();
        e.stopPropagation();

        const trigger = isF12 ? 'Tombol F12' : isInspect ? 'Developer Tools' : isViewSource ? 'Lihat Sumber Halaman' : 'Simpan Halaman';
        const nowStr = new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        if (config.showWarningToast) {
          this.notify({
            title: 'Kombinasi Tombol Diblokir',
            message: `Aksi pintasan ${trigger} diblokir oleh Perisai Sistem untuk mencegah manipulasi dan inspeksi data.`,
            reason: trigger,
            timestamp: nowStr,
          });
        }

        AuditLogService.logSecurity({
          action: 'INSPECT_SHORTCUT_BLOCKED',
          description: `Pintasan ${trigger} diblokir saat mencoba memeriksa kode frontend.`,
          user: this.currentUser,
          status: 'warning',
          metadata: { key: e.key, ctrl: e.ctrlKey, shift: e.shiftKey },
        });
      }
    });
  }
}
