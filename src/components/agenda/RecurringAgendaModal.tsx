import React, { useState, useEffect } from 'react';
import { RecurringAgendaItem, User } from '../../types';
import {
  RotateCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info,
  CalendarDays,
} from 'lucide-react';

interface RecurringAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentYear: number;
  currentMonth: number; // 0-indexed (0 = Jan, 11 = Des)
  monthName: string;
  onApplied: () => void;
  showToast: (text: string, isError?: boolean) => void;
  currentUser: User | null;
}

export const RecurringAgendaModal: React.FC<RecurringAgendaModalProps> = ({
  isOpen,
  onClose,
  currentYear,
  currentMonth,
  monthName,
  onApplied,
  showToast,
  currentUser,
}) => {
  const [templates, setTemplates] = useState<RecurringAgendaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Form state for adding/editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Kantor Bapperida Tanggamus');
  const [description, setDescription] = useState('');
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('11:00');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Target month for application
  const [targetYear, setTargetYear] = useState<number>(currentYear);
  const [targetMonth, setTargetMonth] = useState<number>(currentMonth + 1); // 1-indexed

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setTargetYear(currentYear);
      setTargetMonth(currentMonth + 1);
    }
  }, [isOpen, currentYear, currentMonth]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agendas/recurring');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTemplates(data.data);
      }
    } catch (err: any) {
      showToast('Gagal memuat daftar jadwal rutin.', true);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setLocation('Kantor Bapperida Tanggamus');
    setDescription('');
    setTimeStart('09:00');
    setTimeEnd('11:00');
    setDayOfMonth(1);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: RecurringAgendaItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setLocation(item.location);
    setDescription(item.description || '');
    setTimeStart(item.timeStart);
    setTimeEnd(item.timeEnd || '');
    setDayOfMonth(item.dayOfMonth || 1);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !timeStart) {
      showToast('Judul dan waktu mulai wajib diisi.', true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        time_start: timeStart,
        time_end: timeEnd || undefined,
        day_of_month: Number(dayOfMonth),
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/agendas/recurring/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/agendas/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.success) {
        showToast(result.message || 'Jadwal rutin berhasil disimpan.');
        resetForm();
        fetchTemplates();
      } else {
        showToast(result.message || 'Gagal menyimpan jadwal rutin.', true);
      }
    } catch (err: any) {
      showToast(`Error: ${err?.message}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: RecurringAgendaItem) => {
    try {
      const res = await fetch(`/api/agendas/recurring/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, isActive: !t.isActive } : t))
        );
        showToast(`Jadwal "${item.title}" ${!item.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`);
      }
    } catch {
      showToast('Gagal mengubah status jadwal rutin.', true);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!window.confirm(`Hapus template jadwal rutin "${itemTitle}"?`)) return;
    try {
      const res = await fetch(`/api/agendas/recurring/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        showToast('Template jadwal rutin berhasil dihapus.');
      }
    } catch {
      showToast('Gagal menghapus jadwal rutin.', true);
    }
  };

  const handleApplyToMonth = async () => {
    setIsApplying(true);
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
        showToast(data.message || 'Jadwal rutin berhasil diterapkan!');
        onApplied();
      } else {
        showToast(data.message || 'Gagal menerapkan jadwal rutin.', true);
      }
    } catch (err: any) {
      showToast(`Error: ${err?.message}`, true);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                Jadwal Rutin Bulanan
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold uppercase">
                  Otomatis
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set sekali, berlaku setiap bulan tanpa perlu input berulang-ulang
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Banner: 1-Click Apply */}
        <div className="p-5 border-b border-purple-100/70 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Penerapan 1-Klik ke Kalender</span>
              </div>
              <h4 className="text-sm font-extrabold text-white mt-0.5">
                Otomatis Isi Kalender dengan Seluruh Jadwal Rutin
              </h4>
              <p className="text-[11px] text-purple-100/90 mt-1">
                Sistem akan membuat agenda pada tanggal yang ditentukan secara otomatis tanpa menduplikasi kegiatan yang sudah ada.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Target Month Selector */}
              <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20 text-xs">
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="bg-transparent text-white font-semibold text-xs border-0 px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value} className="text-slate-900 font-medium">
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="w-16 bg-transparent text-white font-mono font-semibold text-xs border-0 px-1 py-1 focus:outline-none text-center"
                />
              </div>

              <button
                onClick={handleApplyToMonth}
                disabled={isApplying || templates.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-700 hover:bg-purple-50 text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <RotateCw className="w-4 h-4 text-indigo-600" />
                )}
                <span>Terapkan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Header row: title and Add Template button */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-purple-600" />
              Daftar Agenda Rutin ({templates.length} template)
            </span>

            {!isFormOpen && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Jadwal Rutin</span>
              </button>
            )}
          </div>

          {/* Form Add / Edit */}
          {isFormOpen && (
            <form
              onSubmit={handleSaveForm}
              className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                <h4 className="text-xs font-black text-purple-900">
                  {editingId ? 'Edit Template Jadwal Rutin' : 'Tambah Template Jadwal Rutin Baru'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama / Judul Kegiatan Rutin *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Contoh: Apel Rutin Awal Bulan / Rapat Monev Kinerja"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tanggal Rutin Tiap Bulan *
                  </label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-purple-900 cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Setiap Tanggal {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Lokasi Kegiatan</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Contoh: Ruang Rapat Utama Bapperida Tanggamus"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Keterangan / Uraian</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan peserta atau materi koordinasi..."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          )}

          {/* List of Templates */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>Memuat jadwal rutin...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <RotateCw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Belum ada template jadwal rutin.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Klik tombol &quot;Tambah Jadwal Rutin&quot; di atas untuk mendaftarkan kegiatan bulanan.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    tpl.isActive
                      ? 'bg-white border-slate-200/90 hover:border-purple-200 shadow-2xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-400 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                        tpl.isActive
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase leading-none">TGL</span>
                      <span className="text-sm font-black leading-tight mt-0.5">{tpl.dayOfMonth}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`text-xs font-bold tracking-tight ${
                            tpl.isActive ? 'text-slate-900' : 'text-slate-500 line-through'
                          }`}
                        >
                          {tpl.title}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {tpl.timeStart} {tpl.timeEnd ? `- ${tpl.timeEnd}` : 'WIB'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{tpl.location}</span>
                        </span>
                        {tpl.description && (
                          <span className="truncate max-w-[220px] text-slate-400 italic">
                            • {tpl.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleToggleActive(tpl)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                        tpl.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={tpl.isActive ? 'Nonaktifkan Jadwal' : 'Aktifkan Jadwal'}
                    >
                      {tpl.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <span>Nonaktif</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(tpl)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Template"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(tpl.id, tpl.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Jadwal rutin dapat diterapkan berulang kali ke bulan mana pun tanpa duplikasi.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
