import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AgendaItem, BotSettings, AgendaReminderLog, AgendaPermissionsConfig, User } from '../../types';
import {
  CalendarDays,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Printer,
  FileDown,
  Bot,
  Clock,
  MapPin,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Send,
  History,
  ShieldAlert,
  ShieldCheck,
  CalendarX2,
  Users,
  Power,
  Unplug,
  Loader2,
  Eye,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { RecurringAgendaModal } from './RecurringAgendaModal';

export const AgendaManagementView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  // Selected date state in YYYY-MM-DD
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatIndonesianDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    } catch {}
    return dateStr;
  };

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayStr());

  // Data states
  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [monthlyCounts, setMonthlyCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: string; isError?: boolean } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaItem | null>(null);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isApplyingRecurring, setIsApplyingRecurring] = useState(false);

  // Bot Settings state
  const [botSettings, setBotSettings] = useState<BotSettings>({
    fonnteToken: '',
    defaultGroupJid: '',
    isActive: true,
  });
  const [reminderLogs, setReminderLogs] = useState<AgendaReminderLog[]>([]);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [isDisconnectingBot, setIsDisconnectingBot] = useState(false);

  // Agenda Permissions state
  const [agendaPermissions, setAgendaPermissions] = useState<AgendaPermissionsConfig>({
    allowAllStaff: false,
    allowedUserIds: [],
  });
  const [allUsersList, setAllUsersList] = useState<User[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Batch Form rows for adding agenda
  interface BatchRow {
    timeStart: string;
    timeEnd: string;
    title: string;
    location: string;
    description: string;
  }
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { timeStart: '08:30', timeEnd: '11:00', title: '', location: '', description: '' },
  ]);
  const [batchGroupJid, setBatchGroupJid] = useState('');

  // Edit Single Agenda form state
  const [editFormData, setEditFormData] = useState({
    title: '',
    location: '',
    description: '',
    scheduleDate: '',
    timeStart: '',
    timeEnd: '',
    groupJid: '',
  });

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const showToast = (text: string, isError = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  // Determine if current user can input & edit agenda
  const canInputAgenda = Boolean(
    isAdmin ||
    agendaPermissions.allowAllStaff ||
    (currentUser && agendaPermissions.allowedUserIds?.includes(currentUser.id)) ||
    currentUser?.canInputAgenda
  );

  // 1. Fetch Agendas for the selected date & month
  const fetchAgendas = async (dateStr?: string) => {
    setIsLoading(true);
    try {
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth();
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

      const res = await fetch(`/api/agendas?start_date=${firstDay}&end_date=${lastDay}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const counts: Record<string, number> = {};
        json.data.forEach((item: AgendaItem) => {
          counts[item.scheduleDate] = (counts[item.scheduleDate] || 0) + 1;
        });
        setMonthlyCounts(counts);

        const target = dateStr || selectedDateStr;
        const currentFiltered = json.data.filter((a: AgendaItem) => a.scheduleDate === target);
        setAgendas(currentFiltered);
      }
    } catch (err: any) {
      console.warn('Gagal memuat agenda:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply Recurring Agendas to Current Calendar Month (1-Click)
  const handleApplyRecurringCurrentMonth = async () => {
    const targetYear = currentMonthDate.getFullYear();
    const targetMonth = currentMonthDate.getMonth() + 1;
    setIsApplyingRecurring(true);
    try {
      const res = await fetch('/api/agendas/recurring/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: targetYear,
          month: targetMonth,
          user_id: currentUser?.id,
          user_name: currentUser?.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        fetchAgendas();
      } else {
        showToast(data.message || 'Gagal menerapkan jadwal rutin.', true);
      }
    } catch (err: any) {
      showToast(`Error: ${err?.message}`, true);
    } finally {
      setIsApplyingRecurring(false);
    }
  };

  // 2. Fetch Bot Settings
  const fetchBotSettings = async () => {
    try {
      const res = await fetch('/api/bot/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setBotSettings(json.data);
      }
    } catch {
      // ignore
    }
  };

  // 3. Fetch Reminder Logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/bot/logs');
      const json = await res.json();
      if (json.success && Array.isArray(json.logs)) {
        setReminderLogs(json.logs);
      }
    } catch {
      // ignore
    }
  };

  // 4. Fetch Agenda Permissions
  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/agenda/permissions');
      const json = await res.json();
      if (json.success && json.permissions) {
        setAgendaPermissions(json.permissions);
      }
    } catch {
      // ignore
    }
  };

  // 5. Fetch All Users for permissions modal
  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success && Array.isArray(json.users)) {
        setAllUsersList(json.users);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAgendas(selectedDateStr);
  }, [selectedDateStr, currentMonthDate]);

  useEffect(() => {
    fetchBotSettings();
    fetchPermissions();
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin]);

  // Calendar Helpers
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };
  const handleSetToday = () => {
    const today = new Date();
    setCurrentMonthDate(today);
    setSelectedDateStr(getTodayStr());
  };

  // Manual PDF Print & Download (Accessible by Admin and Staf) - Uses in-app fetch + Blob to avoid 403 Forbidden
  const handlePrintManualPDF = async (dateStr: string) => {
    if (!dateStr) return;
    setIsExportingPdf(true);
    try {
      showToast(`Sedang menyiapkan dokumen PDF Agenda ${formatIndonesianDate(dateStr)}...`);
      const res = await fetch(`/api/agendas/export-pdf?date=${encodeURIComponent(dateStr)}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Gagal mengunduh PDF (Status ${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Agenda_PMPEPD_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
      showToast(`Dokumen PDF Agenda ${formatIndonesianDate(dateStr)} berhasil diunduh.`);
    } catch (err: any) {
      console.error('Gagal mengunduh PDF:', err);
      showToast(`Gagal mengunduh PDF: ${err.message || 'Terjadi kesalahan sistem'}`, true);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Direct Print via In-App Hidden Iframe (Clean A4 Paper Format)
  const handlePrintDirect = () => {
    const printContent = document.getElementById('printable-agenda-area');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Agenda PMPEPD Bapperida Tanggamus - ${selectedDateStr}</title>
          <style>
            @page { size: A4; margin: 15mm 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 10px;
            }
            .kop-title {
              font-size: 13.5pt;
              font-weight: 800;
              text-align: center;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kop-sub {
              font-size: 10pt;
              text-align: center;
              color: #334155;
              margin: 6px 0 10px 0;
            }
            .border-double-top {
              border-top: 2.5px solid #0f172a;
              margin-bottom: 2px;
            }
            .border-double-bottom {
              border-top: 1px solid #64748b;
              margin-bottom: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9.5pt;
              margin-top: 6px;
            }
            th {
              border: 1px solid #475569;
              padding: 8px 6px;
              background-color: #f1f5f9;
              font-weight: 700;
              text-align: center;
              font-size: 8.5pt;
              text-transform: uppercase;
            }
            td {
              border: 1px solid #94a3b8;
              padding: 7px 8px;
              vertical-align: top;
            }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; font-size: 9pt; }
            .footer-note {
              margin-top: 24px;
              font-size: 8.5pt;
              color: #64748b;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          \${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1500);
    }, 300);
  };

  // Batch Form Handlers
  const handleAddBatchRow = () => {
    setBatchRows((prev) => [
      ...prev,
      { timeStart: '09:00', timeEnd: '', title: '', location: '', description: '' },
    ]);
  };

  const handleRemoveBatchRow = (index: number) => {
    if (batchRows.length <= 1) return;
    setBatchRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchRowChange = (index: number, field: keyof BatchRow, val: string) => {
    setBatchRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: val } : r))
    );
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInputAgenda) {
      showToast('Anda belum memiliki izin untuk menginput agenda.', true);
      return;
    }

    const validItems = batchRows
      .filter((r) => r.title.trim() && r.timeStart.trim())
      .map((r) => ({
        time_start: r.timeStart.trim(),
        time_end: r.timeEnd.trim() || undefined,
        title: r.title.trim(),
        location: r.location.trim() || 'Kantor Bapperida Tanggamus',
        description: r.description.trim(),
      }));

    if (validItems.length === 0) {
      showToast('Harap lengkapi minimal satu kegiatan dengan judul dan waktu mulai.', true);
      return;
    }

    try {
      const res = await fetch('/api/agendas/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_date: selectedDateStr,
          group_jid: batchGroupJid.trim() || undefined,
          user_id: currentUser?.id || 'user_admin',
          user_name: currentUser?.name || 'Administrator',
          items: validItems,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Agenda berhasil disimpan!');
        setIsAddModalOpen(false);
        setBatchRows([{ timeStart: '08:30', timeEnd: '11:00', title: '', location: '', description: '' }]);
        fetchAgendas(selectedDateStr);
      } else {
        showToast(json.message || 'Gagal menyimpan agenda.', true);
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat menyimpan agenda.', true);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (agenda: AgendaItem) => {
    setEditingAgenda(agenda);
    setEditFormData({
      title: agenda.title,
      location: agenda.location,
      description: agenda.description || '',
      scheduleDate: agenda.scheduleDate,
      timeStart: agenda.timeStart,
      timeEnd: agenda.timeEnd || '',
      groupJid: agenda.groupJid || '',
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Agenda
  const handleUpdateAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgenda) return;

    if (!editFormData.title.trim() || !editFormData.scheduleDate || !editFormData.timeStart) {
      showToast('Harap isi judul, tanggal, dan waktu mulai.', true);
      return;
    }

    try {
      const res = await fetch(`/api/agendas/${editingAgenda.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title.trim(),
          location: editFormData.location.trim() || 'Kantor Bapperida Tanggamus',
          description: editFormData.description.trim(),
          schedule_date: editFormData.scheduleDate,
          time_start: editFormData.timeStart,
          time_end: editFormData.timeEnd ? editFormData.timeEnd.trim() : null,
          group_jid: editFormData.groupJid ? editFormData.groupJid.trim() : null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast('Agenda kegiatan berhasil diperbarui.');
        setIsEditModalOpen(false);
        setEditingAgenda(null);
        fetchAgendas(selectedDateStr);
      } else {
        showToast(json.message || 'Gagal memperbarui agenda.', true);
      }
    } catch {
      showToast('Terjadi kesalahan saat memperbarui agenda.', true);
    }
  };

  // Delete Agenda
  const handleDeleteAgenda = async (item: AgendaItem) => {
    const isOwner = currentUser?.id === item.userId;
    if (!isAdmin && !isOwner) {
      showToast('Hanya administrator atau pembuat agenda yang dapat menghapus kegiatan ini.', true);
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus agenda: "${item.title}"?`)) return;

    try {
      const res = await fetch(`/api/agendas/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Agenda berhasil dihapus.');
        fetchAgendas(selectedDateStr);
      } else {
        showToast(json.message || 'Gagal menghapus agenda.', true);
      }
    } catch {
      showToast('Gagal menghapus agenda.', true);
    }
  };

  // Save Bot Settings: Terus Aktif Sekali Disetup
  const handleSaveBotSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bot/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...botSettings,
          isActive: true, // Sekali disetup, terus aktif
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBotSettings(json.data);
        showToast('Bot WhatsApp berhasil disetup & aktif terus secara permanen!');
        setIsBotModalOpen(false);
      } else {
        showToast('Gagal menyimpan konfigurasi.', true);
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', true);
    }
  };

  // Disconnect Bot: HANYA dinonaktifkan saat klik tombol putus
  const handleDisconnectBot = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memutuskan integrasi Bot WhatsApp?\n\nPengingat otomatis H-1 (20:00 WIB) dan Hari-H (06:00 WIB) akan dihentikan sampai Anda menghubungkannya kembali.')) {
      return;
    }

    setIsDisconnectingBot(true);
    try {
      const res = await fetch('/api/bot/disconnect', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setBotSettings(json.data);
        showToast('Koneksi Bot WhatsApp berhasil diputuskan.');
        setIsBotModalOpen(false);
      } else {
        showToast('Gagal memutuskan bot.', true);
      }
    } catch {
      showToast('Terjadi kesalahan saat memutuskan koneksi bot.', true);
    } finally {
      setIsDisconnectingBot(false);
    }
  };

  // Test Send Reminder
  const handleTestSendReminder = async () => {
    if (!botSettings.fonnteToken || !botSettings.defaultGroupJid) {
      showToast('Token Fonnte dan Default Group JID wajib diisi terlebih dahulu.', true);
      return;
    }
    setIsTestingBot(true);
    try {
      const res = await fetch('/api/bot/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateStr,
          group_jid: botSettings.defaultGroupJid,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Uji coba pengiriman berhasil terkirim ke WhatsApp!');
      } else {
        showToast(json.message || 'Uji coba gagal terkirim.', true);
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengirim pengujian bot.', true);
    } finally {
      setIsTestingBot(false);
    }
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    setIsSavingPermissions(true);
    try {
      const res = await fetch('/api/agenda/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agendaPermissions),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Hak akses input agenda berhasil diperbarui!');
        setIsPermissionsModalOpen(false);
      } else {
        showToast('Gagal menyimpan izin hak akses.', true);
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', true);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const toggleUserPermission = (userId: string) => {
    setAgendaPermissions((prev) => {
      const current = prev.allowedUserIds || [];
      if (current.includes(userId)) {
        return { ...prev, allowedUserIds: current.filter((id) => id !== userId) };
      } else {
        return { ...prev, allowedUserIds: [...current, userId] };
      }
    });
  };

  const formattedSelectedDate = (() => {
    try {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDateStr;
    }
  })();

  const isBotActive = Boolean(botSettings.fonnteToken && botSettings.isActive);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              notification.isError
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {notification.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{notification.text}</span>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Agenda &amp; Pengingat WhatsApp via PDF
                </h1>
                {/* Access badge */}
                {canInputAgenda ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Akses Input Aktif</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    <ShieldAlert className="w-3 h-3 text-slate-400" />
                    <span>Mode Lihat Saja</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Bidang PMPEPD Bapperida Tanggamus • Penjadwalan &amp; Notifikasi PDF Otomatis H-1 / Hari-H
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Cetak Manual: Dapat diakses oleh Admin maupun Staf */}
          <button
            onClick={() => handlePrintManualPDF(selectedDateStr)}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            title="Download PDF Agenda Tanggal Ini Langsung ke Perangkat (Tanpa Error 403)"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="hidden md:inline">Unduh PDF</span>
          </button>

          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 shadow-2xs transition-colors cursor-pointer"
            title="Buka Pratinjau Lembar Agenda & Cetak Langsung"
          >
            <Printer className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">Pratinjau / Cetak</span>
          </button>

          {/* Menu Khusus Admin: Kelola Akses Pengguna yang Bisa Input Agenda */}
          {isAdmin && (
            <button
              onClick={() => {
                fetchAllUsers();
                setIsPermissionsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
              title="Kelola siapa saja pengguna/staf yang boleh input & edit agenda"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Akses User Input</span>
            </button>
          )}

          {/* Setup Bot Fonnte (Admin Only) */}
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  fetchLogs();
                  setIsLogsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                title="Lihat Log Riwayat Pengiriman WhatsApp"
              >
                <History className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden lg:inline">Log WA</span>
              </button>

              <button
                onClick={() => setIsBotModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                  isBotActive
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-300'
                }`}
                title="Konfigurasi Bot Fonnte & Target Group WhatsApp"
              >
                {isBotActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                <Bot className={`w-3.5 h-3.5 ${isBotActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{isBotActive ? 'Bot WA Aktif' : 'Setup Bot WA'}</span>
              </button>
            </>
          )}

          {/* Tombol Jadwal Rutin Bulanan */}
          {canInputAgenda && (
            <button
              onClick={() => setIsRecurringModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 shadow-2xs transition-colors cursor-pointer"
              title="Atur & Terapkan Jadwal Rutin Bulanan Otomatis"
            >
              <RotateCw className="w-3.5 h-3.5 text-purple-600" />
              <span>Jadwal Rutin Bulanan</span>
            </button>
          )}

          {/* Tombol Input Agenda: Dapat diakses jika canInputAgenda (Admin atau Staf yang diizinkan) */}
          {canInputAgenda && (
            <button
              onClick={() => {
                setBatchRows([{ timeStart: '08:30', timeEnd: '11:00', title: '', location: '', description: '' }]);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Agenda</span>
            </button>
          )}
        </div>
      </header>

      {/* WORKSPACE AREA (2 KOLOM: KALENDER + DAFTAR AGENDA) */}
      <div className="flex-1 p-6 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* KOLOM KIRI: KALENDER BULANAN INTERAKTIF (7 KOLOM GRID) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">
                {monthNames[month]} {year}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                (WIB / Asia-Jakarta)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {canInputAgenda && (
                <button
                  onClick={handleApplyRecurringCurrentMonth}
                  disabled={isApplyingRecurring}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer disabled:opacity-50"
                  title={`Otomatis isi kalender bulan ${monthNames[month]} ${year} dengan seluruh jadwal rutin aktif`}
                >
                  {isApplyingRecurring ? (
                    <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  )}
                  <span className="hidden sm:inline">Isi Rutin Bulan Ini</span>
                </button>
              )}
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleSetToday}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hari Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2">
            <div className="text-rose-500">Min</div>
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div className="text-rose-500">Sab</div>
          </div>

          {/* Grid Tanggal Kalender */}
          <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="p-2 rounded-xl border border-transparent bg-slate-50/40"></div>
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === getTodayStr();
              const count = monthlyCounts[dateStr] || 0;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none min-h-[64px] ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                      : isToday
                      ? 'border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50/70'
                      : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-amber-700'
                          : isToday
                          ? 'text-indigo-600 font-extrabold'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    )}
                  </div>

                  <div>
                    {count > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                        {count} Kegiatan
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN: DAFTAR AGENDA PADA TANGGAL TERPILIH (5 KOLOM GRID) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Agenda Kegiatan Kedinasan
              </span>
              <h3 className="text-sm font-bold text-slate-800">{formattedSelectedDate}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePrintManualPDF(selectedDateStr)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                title="Cetak PDF Tanggal Ini"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-600" />
                <span>Cetak PDF</span>
              </button>

              {canInputAgenda && (
                <button
                  onClick={() => {
                    setBatchRows([{ timeStart: '08:30', timeEnd: '11:00', title: '', location: '', description: '' }]);
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Tambah Agenda pada Tanggal Ini"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              )}
            </div>
          </div>

          {/* List Agendas */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Memuat agenda kegiatan...</div>
            ) : agendas.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CalendarX2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">
                  Tidak ada agenda kegiatan yang terdaftar untuk tanggal ini.
                </p>
                {canInputAgenda ? (
                  <button
                    onClick={() => {
                      setBatchRows([{ timeStart: '08:30', timeEnd: '11:00', title: '', location: '', description: '' }]);
                      setIsAddModalOpen(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambahkan Agenda Sekarang</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hubungi Administrator atau staf berwenang jika ada agenda dinas tambahan.
                  </p>
                )}
              </div>
            ) : (
              agendas.map((item) => {
                const canManageItem = isAdmin || (currentUser && currentUser.id === item.userId);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-amber-300 transition-all relative group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-md border border-amber-200/80">
                        <Clock className="w-3 h-3 text-amber-700" />
                        {item.timeStart} {item.timeEnd ? `- ${item.timeEnd}` : 'WIB'}
                      </span>

                      {/* Tombol Edit & Hapus (Admin & Pembuat Agenda) */}
                      {canManageItem && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit Agenda Kegiatan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAgenda(item)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus Agenda Kegiatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mb-1 leading-snug">{item.title}</h4>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.location || 'Bapperida Tanggamus'}</span>
                    </div>

                    {item.description && (
                      <div className="mt-2 pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 leading-relaxed flex items-start gap-1.5">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span>{item.description}</span>
                      </div>
                    )}

                    <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Diinput oleh: <strong className="text-slate-600">{item.creatorName || 'Administrator'}</strong></span>
                      {item.groupJid && (
                        <span className="font-mono text-emerald-700 font-medium">
                          WA: {item.groupJid.substring(0, 14)}...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: INPUT BANYAK AGENDA (BATCH) - ADMIN & AUTHORIZED USER */}
      {/* ============================================================== */}
      {isAddModalOpen && canInputAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Input Agenda Harian Kegiatan</h3>
                <p className="text-xs text-slate-500">
                  Pelaksanaan Tanggal: <span className="font-semibold text-amber-700">{formattedSelectedDate}</span>
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBatch} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target WhatsApp Group JID (Opsional)
                </label>
                <input
                  type="text"
                  value={batchGroupJid}
                  onChange={(e) => setBatchGroupJid(e.target.value)}
                  placeholder="Contoh: 12036304xxxxxxxxxx@g.us (Kosongkan jika menggunakan default bot)"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              {/* Dynamic Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Daftar Kegiatan:</span>
                  <button
                    type="button"
                    onClick={handleAddBatchRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris Kegiatan</span>
                  </button>
                </div>

                {batchRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">Kegiatan #{idx + 1}</span>
                      {batchRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchRow(idx)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Waktu Mulai <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          required
                          value={row.timeStart}
                          onChange={(e) => handleBatchRowChange(idx, 'timeStart', e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Waktu Selesai (Opsional)
                        </label>
                        <input
                          type="time"
                          value={row.timeEnd}
                          onChange={(e) => handleBatchRowChange(idx, 'timeEnd', e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Nama / Judul Kegiatan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Rapat Koordinasi Evaluasi DAK Fisik Triwulan I"
                        value={row.title}
                        onChange={(e) => handleBatchRowChange(idx, 'title', e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Lokasi Kegiatan <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Ruang Rapat Utama Bapperida"
                          value={row.location}
                          onChange={(e) => handleBatchRowChange(idx, 'location', e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Keterangan / Catatan Tambahan
                        </label>
                        <input
                          type="text"
                          placeholder="Membawa berkas laporan triwulan..."
                          value={row.description}
                          onChange={(e) => handleBatchRowChange(idx, 'description', e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handlePrintManualPDF(selectedDateStr)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF Langsung</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Simpan Semua Agenda
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL EDIT AGENDA TUNGGAL                                     */}
      {/* ============================================================== */}
      {isEditModalOpen && editingAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Agenda Kegiatan</h3>
                  <p className="text-xs text-slate-500">Perbarui rincian waktu, lokasi, atau keterangan</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAgenda} className="p-6 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={editFormData.scheduleDate}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduleDate: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waktu Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editFormData.timeStart}
                    onChange={(e) => setEditFormData({ ...editFormData, timeStart: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waktu Selesai (Opsional)
                  </label>
                  <input
                    type="time"
                    value={editFormData.timeEnd}
                    onChange={(e) => setEditFormData({ ...editFormData, timeEnd: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama / Judul Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Catatan tambahan mengenai kegiatan..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target WhatsApp Group JID (Opsional)
                </label>
                <input
                  type="text"
                  value={editFormData.groupJid}
                  onChange={(e) => setEditFormData({ ...editFormData, groupJid: e.target.value })}
                  placeholder="12036304xxxxxxxxxx@g.us"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: SETUP BOT FONNTE WHATSAPP - TERUS AKTIF & PUTUS MANUAL*/}
      {/* ============================================================== */}
      {isBotModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  isBotActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Setup Bot WhatsApp (Fonnte API)</h3>
                  <p className="text-[11px] text-slate-500">
                    Otomasi pengiriman PDF agenda H-1 (20:00 WIB) &amp; Hari-H (06:00 WIB)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBotModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STATUS KONEKSI BOT BANNER */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              {isBotActive ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Power className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>STATUS BOT: AKTIF &amp; TERHUBUNG</span>
                      </div>
                      <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                        Bot WhatsApp akan <strong>terus aktif berjalan otomatis di latar belakang</strong>. Bot hanya dapat dinonaktifkan ketika Anda menekan tombol <strong>Putus Koneksi Bot</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Unplug className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">STATUS BOT: TERPUTUS / BELUM DIAKTIFKAN</div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Masukkan Token Fonnte dan Target Group JID di bawah, lalu klik <strong>Hubungkan &amp; Aktifkan Bot</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveBotSettings} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Token API Fonnte <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={botSettings.fonnteToken}
                  onChange={(e) => setBotSettings({ ...botSettings, fonnteToken: e.target.value })}
                  placeholder="Masukkan token Fonnte dari dashboard..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Dapatkan token resmi dari portal pengembang Fonnte (https://fonnte.com).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Target WhatsApp Group JID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={botSettings.defaultGroupJid}
                  onChange={(e) => setBotSettings({ ...botSettings, defaultGroupJid: e.target.value })}
                  placeholder="12036304xxxxxxxxxx@g.us"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  ID Grup WhatsApp tujuan pengiriman berkas PDF agenda dinas harian.
                </p>
              </div>

              {/* Tombol Uji Coba Pengiriman Langsung */}
              {isBotActive && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTestSendReminder}
                    disabled={isTestingBot}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTestingBot ? 'Sedang Mengirim...' : `Kirim Uji Coba PDF WhatsApp (${selectedDateStr})`}</span>
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Tombol Putus Koneksi: HANYA bisa dimatikan saat tombol ini diklik */}
                {isBotActive ? (
                  <button
                    type="button"
                    onClick={handleDisconnectBot}
                    disabled={isDisconnectingBot}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                    title="Putuskan koneksi bot secara manual"
                  >
                    <Unplug className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isDisconnectingBot ? 'Memutuskan...' : 'Putus Koneksi Bot'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Siap dihubungkan</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBotModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {isBotActive ? 'Perbarui Konfigurasi' : 'Hubungkan & Aktifkan Bot'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: PENGATURAN HAK AKSES INPUT USER (ADMIN ONLY)          */}
      {/* ============================================================== */}
      {isPermissionsModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hak Akses Input &amp; Edit Agenda</h3>
                  <p className="text-[11px] text-slate-500">
                    Tentukan siapa saja pengguna yang berhak memasukkan agenda kegiatan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPermissionsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Master Switch: Allow all staff */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/60 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Izinkan Seluruh Pengguna / Staf</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 mt-0.5">
                    Jika diaktifkan, semua pengguna yang masuk dapat menginput agenda tanpa harus dipilih satu per satu.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={agendaPermissions.allowAllStaff}
                  onChange={(e) =>
                    setAgendaPermissions({ ...agendaPermissions, allowAllStaff: e.target.checked })
                  }
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Individual user list */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Atau Pilih Pengguna Tertentu:
                </label>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {allUsersList.filter((u) => u.role !== 'admin').length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Tidak ada akun staf non-admin yang terdaftar saat ini.
                    </div>
                  ) : (
                    allUsersList
                      .filter((u) => u.role !== 'admin')
                      .map((u) => {
                        const isChecked =
                          agendaPermissions.allowAllStaff ||
                          (agendaPermissions.allowedUserIds || []).includes(u.id);

                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              if (!agendaPermissions.allowAllStaff) {
                                toggleUserPermission(u.id);
                              }
                            }}
                            className={`p-3 flex items-center justify-between gap-2.5 transition-colors ${
                              agendaPermissions.allowAllStaff
                                ? 'bg-slate-50 cursor-not-allowed opacity-75'
                                : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-800">{u.name}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <span className="font-mono">@{u.username || 'user'}</span>
                                <span>•</span>
                                <span>{u.department || 'Umum'}</span>
                              </div>
                            </div>

                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={agendaPermissions.allowAllStaff}
                              onChange={() => toggleUserPermission(u.id)}
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPermissionsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSavingPermissions}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingPermissions ? 'Menyimpan...' : 'Simpan Hak Akses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: LOG RIWAYAT PENGIRIMAN PENGINGAT                      */}
      {/* ============================================================== */}
      {isLogsModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Log Riwayat Pengiriman WhatsApp</h3>
              </div>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {reminderLogs.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Belum ada catatan pengiriman bot WhatsApp.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Tanggal Agenda</th>
                      <th className="py-2.5 px-3">Tipe</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 rounded-r-lg">Waktu Kirim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reminderLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{log.agendaDate}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.reminderType === 'H-1'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {log.reminderType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(log.sentAt).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola & Terapkan Jadwal Rutin Bulanan */}
      {isRecurringModalOpen && (
        <RecurringAgendaModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          currentYear={currentMonthDate.getFullYear()}
          currentMonth={currentMonthDate.getMonth()}
          monthName={monthNames[month]}
          onApplied={() => {
            fetchAgendas();
          }}
          showToast={showToast}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
