import React, { useState, useRef } from 'react';
import { StorageScope, User } from '../../types';
import { formatBytes } from '../../services/storageService';
import { UploadCloud, X, FileCheck, AlertCircle, File, Trash2, Scan } from 'lucide-react';
import { DocumentScannerModal } from '../scanner/DocumentScannerModal';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: StorageScope;
  targetOwner?: User;
  onUpload: (files: File[], bidangCategory?: string) => Promise<void>;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  scope,
  targetOwner,
  onUpload,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'scan'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [bidangCategory, setBidangCategory] = useState('Bidang PME');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setErrorMessage('');
    const incoming = Array.from(fileList);
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    incoming.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${formatBytes(file.size)})`);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      setErrorMessage(
        `Berkas berikut melebihi batas maksimal 500 MB: ${oversizedFiles.join(', ')}`
      );
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    (window as any).__EPMPED_IS_UPLOADING__ = true;
    try {
      await onUpload(selectedFiles, scope === 'bidang' ? bidangCategory : undefined);
      setSelectedFiles([]);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      (window as any).__EPMPED_IS_UPLOADING__ = false;
    }
  };

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Pilihan Tambah Berkas: Upload atau Scan</span>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-2 gap-2 bg-slate-100/70 border-b border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Opsi 1: Upload File Komputer/HP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('scan');
              setIsScannerOpen(true);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
              activeMode === 'scan'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>Opsi 2: Scan Mesin Scanner</span>
          </button>
        </div>

        <div className="p-5">
          {scope === 'bidang' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori Dokumen Bidang
              </label>
              <select
                value={bidangCategory}
                onChange={(e) => setBidangCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Bidang PME">Bidang PME (Pengendalian, Monev &amp; Evaluasi)</option>
                <option value="Bidang Infrastruktur">Bidang Infrastruktur &amp; Kewilayahan</option>
                <option value="Bidang Tata Ruang">Bidang Tata Ruang &amp; Lingkungan Hidup</option>
                <option value="Bidang Sosial Budaya">Bidang Sosial Budaya &amp; SDM</option>
                <option value="Bidang Perekonomian">Bidang Perekonomian &amp; SDA</option>
              </select>
            </div>
          )}

          {activeMode === 'upload' ? (
            /* Drag & Drop Area */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">
                Pilih Berkas atau Tarik File ke Sini
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Mendukung semua format: PDF, DOCX, XLSX, PPTX, JPG, PNG, TXT, ZIP, MP4, MP3, dll.
              </p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Batas Maksimal: 500 MB per Berkas
              </span>
            </div>
          ) : (
            /* Scan Action Area */
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <Scan className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Universal Scanner Hardware</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                  Pindai langsung dari mesin scanner fisik (Epson, Canon, HP, Brother, USB TWAIN) atau kamera dokumen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
              >
                <Scan className="w-4 h-4" />
                <span>Buka Panel Pemindai Scanner</span>
              </button>
            </div>
          )}

          {/* Quick link to toggle between Scan and Upload */}
          <div className="mt-3 flex items-center justify-center">
            {activeMode === 'upload' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveMode('scan');
                  setIsScannerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
              >
                <Scan className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ingin Scan dari Mesin Scanner? Klik di Sini</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveMode('upload');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kembali ke Upload Berkas Komputer</span>
              </button>
            )}
          </div>

          {/* Error Message for Exceeding 500MB */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span>Daftar Berkas Terpilih ({selectedFiles.length})</span>
                <span className="font-mono text-slate-500">{formatBytes(totalSize)}</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <File className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-800 truncate font-medium">{file.name}</span>
                      <span className="text-slate-400 font-mono text-[11px] shrink-0">
                        ({formatBytes(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="text-slate-400 hover:text-red-500 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFiles.some((f) => f.size > 20 * 1024 * 1024) && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Terdapat berkas berukuran &gt; 20MB (didukung s.d. 500MB). Berkas besar akan diproses secara bertahap untuk menjaga kinerja penyimpanan server.
              </span>
            </div>
          )}

          <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Target Ruang: <strong className="text-slate-700 capitalize">{scope}</strong>
              {targetOwner ? ` (Atas nama: ${targetOwner.name})` : ''}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={selectedFiles.length === 0 || isUploading}
              onClick={handleSubmit}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm ${
                selectedFiles.length === 0 || isUploading
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isUploading ? 'Sedang Mengunggah...' : `Unggah ${selectedFiles.length} Berkas`}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL SCANNER */}
      {isScannerOpen && (
        <DocumentScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          title={`Scan Dokumen Langsung (${scope})`}
          onScanComplete={(scannedFile) => {
            setSelectedFiles((prev) => [...prev, scannedFile]);
            setIsScannerOpen(false);
          }}
        />
      )}
    </div>
  );
};
