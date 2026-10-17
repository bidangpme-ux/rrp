import React, { useState, useMemo } from 'react';
import { useStorage } from '../../context/StorageContext';
import { useAuth } from '../../context/AuthContext';
import { TujuanSasaranItem, PeriodeRPJMD } from '../../types';
import * as XLSX from 'xlsx';
import {
  Target,
  Calendar,
  Plus,
  Download,
  Search,
  Layers,
  Building2,
  CheckCircle2,
  Edit3,
  Trash2,
  Filter,
  Eye,
  X,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const DAFTAR_OPD = [
  'Bapperida',
  'Dinas Pendidikan',
  'Dinas Kesehatan',
  'Dinas PUPR',
  'Dinas Sosial',
  'Dinas Pertanian',
  'Dinas Perhubungan',
  'Dinas Koperasi & UMKM',
  'Dinas Lingkungan Hidup',
  'Dinas Kependudukan & Catatan Sipil',
  'Dinas Kominfo',
  'Dinas PMD',
  'Dinas Pariwisata & Kebudayaan',
  'Satpol PP',
  'Inspektorat Daerah',
  'BPBD',
];

export const TujuanSasaranManagementView: React.FC = () => {
  const {
    tujuanSasaranList,
    periodeList,
    activePeriode,
    setActivePeriode,
    addTujuanSasaran,
    updateTujuanSasaran,
    deleteTujuanSasaran,
    addPeriode,
    updatePeriode,
  } = useStorage();

  const { currentUser, isAdmin } = useAuth();

  // Selected period
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(() => {
    return activePeriode?.id || periodeList[0]?.id || '';
  });

  const currentPeriode = useMemo(() => {
    return periodeList.find((p) => p.id === selectedPeriodeId) || activePeriode || periodeList[0];
  }, [periodeList, selectedPeriodeId, activePeriode]);

  // View SubTab
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'cards'>('matrix');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpdFilter, setSelectedOpdFilter] = useState('all');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TujuanSasaranItem | null>(null);
  const [inspectingItem, setInspectingItem] = useState<TujuanSasaranItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<TujuanSasaranItem | null>(null);
  const [isPeriodeModalOpen, setIsPeriodeModalOpen] = useState(false);

  // Items for the selected period
  const periodItems = useMemo(() => {
    if (!currentPeriode) return [];
    return tujuanSasaranList.filter((item) => item.periodeId === currentPeriode.id);
  }, [tujuanSasaranList, currentPeriode]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let result = periodItems;
    if (selectedOpdFilter !== 'all') {
      result = result.filter((i) => i.perangkatDaerahList && i.perangkatDaerahList.includes(selectedOpdFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.visi.toLowerCase().includes(q) ||
          i.misi.toLowerCase().includes(q) ||
          i.tujuan.toLowerCase().includes(q) ||
          i.sasaran.toLowerCase().includes(q) ||
          i.indikator.toLowerCase().includes(q) ||
          (i.perangkatDaerahList && i.perangkatDaerahList.some((opd) => opd.toLowerCase().includes(q))) ||
          (i.bidangPengampu && i.bidangPengampu.toLowerCase().includes(q))
      );
    }
    return result;
  }, [periodItems, selectedOpdFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalIndikator = periodItems.length;
    const opdSet = new Set<string>();
    periodItems.forEach((i) => {
      i.perangkatDaerahList?.forEach((opd) => opdSet.add(opd));
    });
    const distinctTujuan = new Set(periodItems.map((i) => i.tujuan)).size;
    const distinctSasaran = new Set(periodItems.map((i) => i.sasaran)).size;

    return {
      totalIndikator,
      totalOpd: opdSet.size,
      distinctTujuan,
      distinctSasaran,
    };
  }, [periodItems]);

  // Export to Excel
  const exportToExcel = () => {
    if (!currentPeriode) return;
    const tahunCols = currentPeriode.tahunList || [2025, 2026, 2027, 2028, 2029, 2030];

    const rows = filteredItems.map((item, index) => {
      const baseRow: Record<string, any> = {
        No: index + 1,
        Visi: item.visi,
        Misi: item.misi,
        Tujuan: item.tujuan,
        Sasaran: item.sasaran,
        'Indikator Sasaran': item.indikator,
        Satuan: item.satuan,
      };

      // Target per tahun
      tahunCols.forEach((th) => {
        baseRow[`Target ${th}`] = item.targetTahunan?.[th] ?? '-';
      });

      baseRow['Perangkat Daerah Pengampu'] = (item.perangkatDaerahList || []).join(', ');
      baseRow['Bidang Pengampu'] = item.bidangPengampu || '-';
      baseRow['Formula / Definisi Operasional'] = item.formula || '-';
      baseRow['Penanggung Jawab'] = item.penanggungJawab || '-';
      baseRow['Keterangan'] = item.keterangan || '-';

      return baseRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tujuan & Sasaran RPJMD');
    XLSX.writeFile(workbook, `Tujuan_Sasaran_RPJMD_${currentPeriode.nama.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item: TujuanSasaranItem) => {
    setEditingItem(item);
    setIsFormModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    await deleteTujuanSasaran(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-100">
      {/* Top Header Banner */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Tujuan &amp; Sasaran RPJMD (5 Tahunan)
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  Target Tahunan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemetaan Visi &amp; Misi ke Tujuan, Sasaran, dan Target Indikator 5 Tahunan Multi-Perangkat Daerah
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Periode Selector Dropdown */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 px-2.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Periode:
              </span>
              <select
                value={selectedPeriodeId}
                onChange={(e) => {
                  setSelectedPeriodeId(e.target.value);
                  const p = periodeList.find((item) => item.id === e.target.value);
                  if (p) setActivePeriode(p);
                }}
                className="bg-white text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1.5 border-0 shadow-2xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {periodeList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} {p.isAktif ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
              title="Unduh Berkas Excel Tujuan & Sasaran"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            {/* Add Target Button */}
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Indikator</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Indikator
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.totalIndikator}</span>
              <span className="text-[11px] font-medium text-slate-400">item</span>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Tujuan Terdefinisi
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-700">{stats.distinctTujuan}</span>
              <span className="text-[11px] font-medium text-slate-400">tujuan</span>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Sasaran Terdefinisi
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-700">{stats.distinctSasaran}</span>
              <span className="text-[11px] font-medium text-slate-400">sasaran</span>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Perangkat Daerah Terkait
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700">{stats.totalOpd}</span>
              <span className="text-[11px] font-medium text-slate-400">OPD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 border-b border-slate-200/60">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari indikator, tujuan, sasaran, perangkat daerah..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* OPD Filter */}
          <div className="w-48 shrink-0">
            <select
              value={selectedOpdFilter}
              onChange={(e) => setSelectedOpdFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer font-medium text-slate-700"
            >
              <option value="all">Semua Perangkat Daerah</option>
              {DAFTAR_OPD.map((opd) => (
                <option key={opd} value={opd}>
                  {opd}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View toggle tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'matrix'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Matriks Target Tahunan
          </button>
          <button
            onClick={() => setActiveSubTab('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'cards'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Kartu Rincian
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Belum Ada Indikator Tujuan &amp; Sasaran</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tidak ada data yang cocok dengan kriteria pencarian atau periode terpilih. Silakan tambahkan indikator
              tujuan &amp; sasaran baru.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Indikator Baru</span>
            </button>
          </div>
        ) : activeSubTab === 'matrix' ? (
          /* Table Matrix View */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-4 min-w-[200px]">Tujuan &amp; Sasaran</th>
                    <th className="py-3 px-4 min-w-[240px]">Indikator Kinerja</th>
                    <th className="py-3 px-3 w-20 text-center">Satuan</th>
                    {currentPeriode?.tahunList?.map((th) => (
                      <th key={th} className="py-3 px-3 w-24 text-center bg-indigo-50/40 text-indigo-900 border-l border-slate-200/60">
                        Target {th}
                      </th>
                    ))}
                    <th className="py-3 px-4 min-w-[180px]">Perangkat Daerah</th>
                    <th className="py-3 px-3 w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-900">{item.tujuan}</div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                          <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{item.sasaran}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-900 leading-snug">{item.indikator}</div>
                        {item.formula && (
                          <div className="text-[11px] text-slate-500 mt-1 italic">
                            Rumus: {item.formula}
                          </div>
                        )}
                        {item.bidangPengampu && (
                          <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                            {item.bidangPengampu}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center align-top font-mono text-slate-700 font-medium">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {item.satuan}
                        </span>
                      </td>

                      {/* Yearly Targets */}
                      {currentPeriode?.tahunList?.map((th) => (
                        <td
                          key={th}
                          className="py-3 px-3 text-center align-top font-mono font-bold text-indigo-950 bg-indigo-50/20 border-l border-slate-100"
                        >
                          {item.targetTahunan?.[th] !== undefined && item.targetTahunan[th] !== '' ? (
                            <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-100 text-indigo-700 shadow-2xs">
                              {item.targetTahunan[th]}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}

                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {item.perangkatDaerahList && item.perangkatDaerahList.length > 0 ? (
                            item.perangkatDaerahList.map((opd, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                              >
                                {opd}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Belum ditentukan</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center align-top">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setInspectingItem(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Detail Rincian"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Indikator"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(item)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Indikator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {item.satuan}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setInspectingItem(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{item.indikator}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    <strong className="text-slate-700">Tujuan:</strong> {item.tujuan}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <strong className="text-slate-700">Sasaran:</strong> {item.sasaran}
                  </p>

                  {/* Target per tahun grid */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Target 5 Tahunan ({item.satuan})
                    </span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {currentPeriode?.tahunList?.map((th) => (
                        <div key={th} className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 block">{th}</span>
                          <span className="text-xs font-extrabold text-indigo-700 mt-0.5 block">
                            {item.targetTahunan?.[th] ?? '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex flex-wrap gap-1 max-w-[80%]">
                    {item.perangkatDaerahList?.map((opd, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium"
                      >
                        {opd}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.penanggungJawab || ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal (Add / Edit) */}
      {isFormModalOpen && (
        <TujuanSasaranFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          initialItem={editingItem}
          periode={currentPeriode}
          onSave={async (data, id) => {
            if (id) {
              await updateTujuanSasaran(id, data);
            } else {
              await addTujuanSasaran({
                ...data,
                periodeId: currentPeriode.id,
              });
            }
            setIsFormModalOpen(false);
          }}
        />
      )}

      {/* Inspect Detail Modal */}
      {inspectingItem && (
        <TujuanSasaranDetailModal
          item={inspectingItem}
          periode={currentPeriode}
          onClose={() => setInspectingItem(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900">Hapus Indikator Sasaran?</h3>
            <p className="text-xs text-center text-slate-500 mt-2">
              Indikator &quot;<span className="font-semibold text-slate-700">{deleteCandidate.indikator}</span>&quot; akan
              dihapus dari daftar. Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Form Modal Component
interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem: TujuanSasaranItem | null;
  periode: PeriodeRPJMD;
  onSave: (
    data: Omit<TujuanSasaranItem, 'id' | 'createdAt' | 'updatedAt' | 'periodeId'>,
    id?: string
  ) => Promise<void>;
}

const TujuanSasaranFormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  initialItem,
  periode,
  onSave,
}) => {
  const [visi, setVisi] = useState(
    initialItem?.visi ||
      'Terwujudnya Kabupaten Tanggamus yang Tangguh, Agamis, Mandiri, Unggul dan Sejahtera (TANGGAMUS TAMUS)'
  );
  const [misi, setMisi] = useState(
    initialItem?.misi ||
      'Misi 1: Mewujudkan Sumber Daya Manusia yang Berkualitas, Berdaya Saing dan Berakhlak Mulia'
  );
  const [tujuan, setTujuan] = useState(initialItem?.tujuan || '');
  const [sasaran, setSasaran] = useState(initialItem?.sasaran || '');
  const [indikator, setIndikator] = useState(initialItem?.indikator || '');
  const [satuan, setSatuan] = useState(initialItem?.satuan || '%');
  const [bidangPengampu, setBidangPengampu] = useState(
    initialItem?.bidangPengampu || 'Bidang PME (Pengendalian, Monev & Evaluasi)'
  );
  const [formula, setFormula] = useState(initialItem?.formula || '');
  const [penanggungJawab, setPenanggungJawab] = useState(initialItem?.penanggungJawab || '');
  const [keterangan, setKeterangan] = useState(initialItem?.keterangan || '');

  // Perangkat Daerah multi-selection
  const [selectedOpds, setSelectedOpds] = useState<string[]>(
    initialItem?.perangkatDaerahList || ['Bapperida']
  );

  // Targets per year
  const tahunList = periode?.tahunList || [2025, 2026, 2027, 2028, 2029, 2030];
  const [targets, setTargets] = useState<Record<number, string | number>>(() => {
    const res: Record<number, string | number> = {};
    tahunList.forEach((th) => {
      res[th] = initialItem?.targetTahunan?.[th] ?? '';
    });
    return res;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleOpd = (opd: string) => {
    setSelectedOpds((prev) =>
      prev.includes(opd) ? prev.filter((o) => o !== opd) : [...prev, opd]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tujuan.trim() || !sasaran.trim() || !indikator.trim()) {
      alert('Tujuan, Sasaran, dan Indikator wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(
        {
          visi,
          misi,
          tujuan: tujuan.trim(),
          sasaran: sasaran.trim(),
          indikator: indikator.trim(),
          satuan: satuan.trim(),
          targetTahunan: targets,
          perangkatDaerahList: selectedOpds,
          bidangPengampu: bidangPengampu.trim(),
          formula: formula.trim(),
          penanggungJawab: penanggungJawab.trim(),
          keterangan: keterangan.trim(),
        },
        initialItem?.id
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {initialItem ? 'Edit Indikator Sasaran RPJMD' : 'Tambah Indikator Sasaran RPJMD'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Periode: {periode.nama}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[75vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Visi Daerah</label>
            <input
              type="text"
              value={visi}
              onChange={(e) => setVisi(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Misi Terkait</label>
            <input
              type="text"
              value={misi}
              onChange={(e) => setMisi(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tujuan Pemda *</label>
              <textarea
                rows={2}
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                required
                placeholder="Contoh: Meningkatkan Pertumbuhan Ekonomi yang Inklusif..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sasaran Pemda *</label>
              <textarea
                rows={2}
                value={sasaran}
                onChange={(e) => setSasaran(e.target.value)}
                required
                placeholder="Contoh: Meningkatnya Produktivitas Sektor Pertanian & UMKM..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Indikator Sasaran *</label>
              <input
                type="text"
                value={indikator}
                onChange={(e) => setIndikator(e.target.value)}
                required
                placeholder="Contoh: Laju Pertumbuhan Ekonomi Daerah (LPE)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Satuan *</label>
              <input
                type="text"
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                required
                placeholder="Contoh: %, Indeks, Poin"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Yearly Targets Grid */}
          <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100">
            <label className="block text-xs font-extrabold text-indigo-900 mb-2">
              Target 5 Tahunan ({periode.tahunMulai} - {periode.tahunSelesai})
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {tahunList.map((th) => (
                <div key={th}>
                  <label className="block text-[10px] font-bold text-indigo-700 mb-1 text-center">
                    Tahun {th}
                  </label>
                  <input
                    type="text"
                    value={targets[th] ?? ''}
                    onChange={(e) =>
                      setTargets((prev) => ({ ...prev, [th]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full text-xs font-mono font-bold text-center px-2 py-1.5 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-indigo-950"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* OPD Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Perangkat Daerah Pengampu (Dapat dipilih lebih dari satu)
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-36 overflow-y-auto">
              {DAFTAR_OPD.map((opd) => {
                const isSelected = selectedOpds.includes(opd);
                return (
                  <button
                    type="button"
                    key={opd}
                    onClick={() => toggleOpd(opd)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{opd}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bidang Pengampu</label>
              <input
                type="text"
                value={bidangPengampu}
                onChange={(e) => setBidangPengampu(e.target.value)}
                placeholder="Contoh: Bidang PME"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Penanggung Jawab</label>
              <input
                type="text"
                value={penanggungJawab}
                onChange={(e) => setPenanggungJawab(e.target.value)}
                placeholder="Contoh: Kabid PME"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Rumus / Formula Perhitungan</label>
            <input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Contoh: (Capaian / Target) x 100% atau data BPS"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Tambahan</label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan perencanaan atau sumber regulasi..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : initialItem ? 'Perbarui Data' : 'Simpan Indikator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Detail Inspect Modal Component
interface DetailModalProps {
  item: TujuanSasaranItem;
  periode: PeriodeRPJMD;
  onClose: () => void;
}

const TujuanSasaranDetailModal: React.FC<DetailModalProps> = ({ item, periode, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Rincian Indikator Sasaran RPJMD</h3>
              <p className="text-[10px] text-slate-400">{periode?.nama}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mt-4 text-xs">
          <div>
            <span className="font-bold text-slate-500 text-[10px] uppercase block">Indikator Kinerja</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{item.indikator}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Tujuan Pemda</span>
              <span className="font-medium text-slate-800 mt-0.5 block">{item.tujuan}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Sasaran Pemda</span>
              <span className="font-medium text-slate-800 mt-0.5 block">{item.sasaran}</span>
            </div>
          </div>

          {/* Yearly target preview */}
          <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
            <span className="font-extrabold text-indigo-900 text-[10px] uppercase block mb-2">
              Target Tahunan ({item.satuan})
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              {periode?.tahunList?.map((th) => (
                <div key={th} className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-semibold text-slate-400 block">{th}</span>
                  <span className="text-xs font-black text-indigo-700 block mt-0.5">
                    {item.targetTahunan?.[th] ?? '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-500 text-[10px] uppercase block mb-1">
              Perangkat Daerah Pengampu
            </span>
            <div className="flex flex-wrap gap-1">
              {item.perangkatDaerahList?.map((opd, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                >
                  {opd}
                </span>
              ))}
            </div>
          </div>

          {item.formula && (
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Formula / Rumus</span>
              <span className="text-slate-700 italic mt-0.5 block">{item.formula}</span>
            </div>
          )}

          {item.penanggungJawab && (
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Penanggung Jawab</span>
              <span className="text-slate-700 mt-0.5 block">{item.penanggungJawab}</span>
            </div>
          )}

          {item.keterangan && (
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Keterangan</span>
              <span className="text-slate-600 mt-0.5 block">{item.keterangan}</span>
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
