import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import {
  Scan,
  Camera,
  Printer,
  RotateCw,
  Trash2,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  Sliders,
  ZoomIn,
  RefreshCw,
  FileDown,
  Monitor,
  Settings2,
  Check,
  ChevronRight,
  Maximize2,
  Wifi,
  Usb,
  Layers,
  ArrowUp,
  ArrowDown,
  Info,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (file: File) => void;
  title?: string;
  defaultFileName?: string;
}

export interface ScannedPage {
  id: string;
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
  filter: 'normal' | 'document' | 'grayscale' | 'bw';
}

export interface ScannerBrandPreset {
  id: string;
  name: string;
  category: 'epson' | 'canon' | 'hp' | 'brother' | 'fujitsu' | 'universal' | 'camera';
  defaultPort: string;
  defaultIpHint: string;
  supportsAdf: boolean;
  supportsDuplex: boolean;
  recommendedDpi: number;
  description: string;
}

export const SCANNER_BRAND_PRESETS: ScannerBrandPreset[] = [
  {
    id: 'epson_ecotank',
    name: 'Epson EcoTank (L3110, L3150, L3210, L3250, L4260, L5290, L6270, L15150)',
    category: 'epson',
    defaultPort: '80',
    defaultIpHint: '192.168.1.100',
    supportsAdf: true,
    supportsDuplex: false,
    recommendedDpi: 300,
    description: 'Protokol eSCL / AirScan standar printer all-in-one Epson kantor',
  },
  {
    id: 'epson_workforce',
    name: 'Epson WorkForce & Sheetfed Scanner (DS-530, DS-770, WF-7840)',
    category: 'epson',
    defaultPort: '80',
    defaultIpHint: '192.168.1.105',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'Scanner dokumen berkecepatan tinggi dengan ADF pengumpan otomatis',
  },
  {
    id: 'canon_pixma',
    name: 'Canon PIXMA (G2010, G2020, G3010, G3020, G6070, TS/TR Series)',
    category: 'canon',
    defaultPort: '80',
    defaultIpHint: '192.168.1.110',
    supportsAdf: true,
    supportsDuplex: false,
    recommendedDpi: 300,
    description: 'Printer multifungsi Canon dengan pemindai flatbed & feeder',
  },
  {
    id: 'canon_imagerunner',
    name: 'Canon imageRUNNER / imageFORMULA (iR-ADV, DR-C225, DR-C240)',
    category: 'canon',
    defaultPort: '80',
    defaultIpHint: '192.168.1.115',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'Mesin fotokopi & scanner dokumen arsip kantor tugas berat',
  },
  {
    id: 'hp_smart_tank',
    name: 'HP Smart Tank & LaserJet Pro (Smart Tank 515/580, M428fdw, M283fdw)',
    category: 'hp',
    defaultPort: '80',
    defaultIpHint: '192.168.1.120',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'HP WebScan & eSCL direct scanning protocol',
  },
  {
    id: 'hp_scanjet',
    name: 'HP ScanJet Pro & Enterprise Flow (2500 f1, 3000 s4, 5000 s5)',
    category: 'hp',
    defaultPort: '80',
    defaultIpHint: '192.168.1.122',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'Scanner lembaran dokumen dinas kecepatan tinggi HP',
  },
  {
    id: 'brother_mfc',
    name: 'Brother DCP & MFC Series (DCP-T420W, DCP-T520W, MFC-T4500DW, ADS-2400N)',
    category: 'brother',
    defaultPort: '80',
    defaultIpHint: '192.168.1.130',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'Protokol pemindaian jaringan & Web Services Brother',
  },
  {
    id: 'fujitsu_scansnap',
    name: 'Fujitsu / Ricoh ScanSnap & fi-Series (ScanSnap iX1600, iX1400, fi-7160, fi-8170)',
    category: 'fujitsu',
    defaultPort: '80',
    defaultIpHint: '192.168.1.140',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'Scanner pengarsipan arsiparis nomor satu dengan feeder ultrasonic',
  },
  {
    id: 'ricoh_xerox',
    name: 'Ricoh Aficio / IM Series & Xerox (VersaLink, AltaLink, WorkCentre)',
    category: 'universal',
    defaultPort: '80',
    defaultIpHint: '192.168.1.150',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'Mesin fotokopi multifungsi perkantoran skala besar',
  },
  {
    id: 'kyocera_pantum',
    name: 'Kyocera ECOSYS, Pantum, Lexmark & Konica Minolta',
    category: 'universal',
    defaultPort: '80',
    defaultIpHint: '192.168.1.160',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'Kompatibilitas standar WSD & eSCL scanner kantor umum',
  },
  {
    id: 'usb_twain_universal',
    name: 'Scanner Kabel USB Konvensional (Driver TWAIN / WIA / SANE / NAPS2)',
    category: 'universal',
    defaultPort: '11180',
    defaultIpHint: '127.0.0.1',
    supportsAdf: true,
    supportsDuplex: true,
    recommendedDpi: 300,
    description: 'Koneksi kabel USB langsung dari laptop/PC kantor',
  },
  {
    id: 'camera_czur_overhead',
    name: 'Kamera Pemindai Dokumen Buku / Overhead (CZUR, Ipevo, Eloam, Webcam)',
    category: 'camera',
    defaultPort: '0',
    defaultIpHint: 'local_camera',
    supportsAdf: false,
    supportsDuplex: false,
    recommendedDpi: 300,
    description: 'Pindai buku naskah tebal atau lembar fisik via kamera dokumen resolusi tinggi',
  },
];

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  title = 'Universal Scanner Dokumen Fisik',
  defaultFileName = 'Hasil_Scan_Dokumen',
}) => {
  // Scanner Source Mode: 'escl' (Network Wi-Fi/LAN) | 'twain' (USB / Desktop Driver) | 'camera' (Live Camera)
  const [scannerMode, setScannerMode] = useState<'escl' | 'twain' | 'camera'>('escl');

  // Selected brand preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>('epson_ecotank');

  // Multi-page scans list
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [previewZoomPage, setPreviewZoomPage] = useState<ScannedPage | null>(null);

  const [fileName, setFileName] = useState<string>(() => {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    return `${defaultFileName}_${dateStr}`;
  });
  const [outputFormat, setOutputFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [paperSize, setPaperSize] = useState<'a4' | 'f4' | 'legal'>('a4');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  // Mode 1: Network Scanner (eSCL / AirScan / Mopria / WSD)
  const [scannerIp, setScannerIp] = useState<string>('192.168.1.100');
  const [scannerPort, setScannerPort] = useState<string>('80');
  const [scannerResolution, setScannerResolution] = useState<number>(300);
  const [scannerColorMode, setScannerColorMode] = useState<'color' | 'grayscale' | 'bw'>('color');
  const [scannerSource, setScannerSource] = useState<'flatbed' | 'adf'>('flatbed');
  const [isConnectingScanner, setIsConnectingScanner] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{ checked: boolean; reachable: boolean; message: string } | null>(null);

  // Mode 2: Camera Scanner State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFilter, setCameraFilter] = useState<'document' | 'normal' | 'grayscale' | 'bw'>('document');
  const streamRef = useRef<MediaStream | null>(null);

  // Update preset defaults
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = SCANNER_BRAND_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (preset.category === 'camera') {
      setScannerMode('camera');
      return;
    }
    if (preset.id === 'usb_twain_universal') {
      setScannerMode('twain');
      return;
    }

    setScannerMode('escl');
    setScannerPort(preset.defaultPort);
    if (preset.defaultIpHint && !scannerIp) {
      setScannerIp(preset.defaultIpHint);
    }
    setScannerResolution(preset.recommendedDpi);
    setConnectionStatus(null);
  };

  // Test network scanner connection
  const handleTestConnection = async () => {
    if (!scannerIp.trim()) {
      setErrorMsg('Silakan masukkan alamat IP Scanner terlebih dahulu.');
      return;
    }
    setIsConnectingScanner(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/scanner/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: scannerIp.trim(),
          port: parseInt(scannerPort, 10) || 80,
        }),
      });
      const data = await res.json();
      setConnectionStatus({
        checked: true,
        reachable: Boolean(data.reachable),
        message: data.message || (data.reachable ? 'Scanner aktif & siap.' : 'Tidak merespons.'),
      });
    } catch (err: any) {
      setConnectionStatus({
        checked: true,
        reachable: false,
        message: `Gagal menguji koneksi: ${err?.message}`,
      });
    } finally {
      setIsConnectingScanner(false);
    }
  };

  // Initialize camera list on open if camera mode
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (scannerMode === 'camera') {
        initCameraDevices();
      }
    } else {
      stopCamera();
    }
  }, [isOpen, scannerMode]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const initCameraDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setErrorMsg('Browser Anda tidak mendukung akses kamera/scanner langsung.');
        return;
      }

      // Request permission once to populate device labels
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
      initialStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      if (videoInputs.length > 0) {
        const preferred = videoInputs.find(
          (d) =>
            d.label.toLowerCase().includes('scanner') ||
            d.label.toLowerCase().includes('document') ||
            d.label.toLowerCase().includes('czur') ||
            d.label.toLowerCase().includes('back')
        );
        const deviceId = preferred ? preferred.deviceId : videoInputs[0].deviceId;
        setSelectedDeviceId(deviceId);
        startCameraStream(deviceId);
      }
    } catch (err: any) {
      console.warn('Camera init error:', err);
      setErrorMsg('Tidak dapat mengakses perangkat kamera/scanner: ' + (err?.message || 'Izin ditolak'));
    }
  };

  const startCameraStream = async (deviceId: string) => {
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setErrorMsg('');
    } catch (err: any) {
      console.warn('Failed to start camera stream:', err);
      setErrorMsg('Gagal menyalakan video scanner: ' + err?.message);
    }
  };

  // Capture page from Camera feed with document filter
  const handleCaptureCameraPage = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply document contrast/whitening filter if selected
    if (cameraFilter !== 'normal') {
      applyDocumentFilter(canvas, cameraFilter);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const newPage: ScannedPage = {
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl,
      rotation: 0,
      filter: cameraFilter,
    };

    setPages((prev) => [...prev, newPage]);
    setSelectedPageIndex(pages.length);
    setSuccessNotice(`Lembar ke-${pages.length + 1} berhasil dipindai.`);
    setTimeout(() => setSuccessNotice(''), 3000);
  };

  // Document Whitening / High Contrast Filter
  const applyDocumentFilter = (canvas: HTMLCanvasElement, mode: 'document' | 'grayscale' | 'bw') => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (mode === 'grayscale') {
        d[i] = lum;
        d[i + 1] = lum;
        d[i + 2] = lum;
      } else if (mode === 'document') {
        let contrastLum = (lum - 128) * 1.6 + 128;
        if (contrastLum > 185) {
          contrastLum = 255;
        } else if (contrastLum < 90) {
          contrastLum = Math.max(0, contrastLum * 0.7);
        }
        d[i] = contrastLum;
        d[i + 1] = contrastLum;
        d[i + 2] = contrastLum;
      } else if (mode === 'bw') {
        const threshold = lum > 140 ? 255 : 0;
        d[i] = threshold;
        d[i + 1] = threshold;
        d[i + 2] = threshold;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  // Rotate a page 90 degrees
  const handleRotatePage = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  // Move page position in sequence
  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === pages.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setSelectedPageIndex(targetIndex);
  };

  // Delete a scanned page
  const handleDeletePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (selectedPageIndex >= index && selectedPageIndex > 0) {
      setSelectedPageIndex(selectedPageIndex - 1);
    }
  };

  // Trigger Network Scanner (eSCL / WebScan)
  const handleScanFromNetworkScanner = async () => {
    setIsConnectingScanner(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/scanner/escl-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: scannerIp.trim(),
          port: parseInt(scannerPort, 10) || 80,
          resolution: scannerResolution,
          colorMode: scannerColorMode,
          source: scannerSource,
          paperSize,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageDataUrl) {
        const newPage: ScannedPage = {
          id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          dataUrl: data.imageDataUrl,
          rotation: 0,
          filter: 'normal',
        };
        setPages((prev) => [...prev, newPage]);
        setSelectedPageIndex(pages.length);
        setSuccessNotice(data.message || `Lembar berhasil dipindai.`);
        setTimeout(() => setSuccessNotice(''), 3500);
      } else {
        setErrorMsg(
          data.message ||
            `Tidak dapat terhubung ke mesin scanner di ${scannerIp}:${scannerPort}. Pastikan scanner menyala.`
        );
      }
    } catch (err: any) {
      setErrorMsg(`Koneksi scanner gagal: ${err?.message || 'Periksa IP Scanner'}`);
    } finally {
      setIsConnectingScanner(false);
    }
  };

  // Manual File Import from Desktop Scanner App (Epson Scan 2, Canon ScanGear, HP Scan)
  const handleImportScannedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPages((prev) => [
          ...prev,
          {
            id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            dataUrl,
            rotation: 0,
            filter: 'normal',
          },
        ]);
        setSuccessNotice(`Berkas "${file.name}" berhasil ditambahkan.`);
        setTimeout(() => setSuccessNotice(''), 3000);
      };
      reader.readAsDataURL(file);
    });
  };

  // Helper to rotate canvas image safely with dimension fallbacks
  const getRotatedCanvas = (img: HTMLImageElement, rotation: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const naturalW = img.naturalWidth || img.width || 800;
    const naturalH = img.naturalHeight || img.height || 1130;

    if (rotation === 90 || rotation === 270) {
      canvas.width = naturalH;
      canvas.height = naturalW;
    } else {
      canvas.width = naturalW;
      canvas.height = naturalH;
    }

    // Always fill white background so output is never black or transparent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);

    return canvas;
  };

  // Compile all pages into a final File (Multi-page PDF or Single JPG)
  const handleFinalizeDocument = async () => {
    if (pages.length === 0) {
      setErrorMsg('Belum ada lembar halaman yang di-scan.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const cleanName = (fileName.trim() || 'Hasil_Scan_Dokumen').replace(/\.[^/.]+$/, '');

      if (outputFormat === 'jpg' && pages.length === 1) {
        const page = pages[0];
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = page.dataUrl;

        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 5000); // 5s timeout safeguard
        });

        const canvas = getRotatedCanvas(img, page.rotation);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.92);
        });

        if (blob) {
          const finalFile = new File([blob], `${cleanName}.jpg`, { type: 'image/jpeg' });
          onScanComplete(finalFile);
          stopCamera();
          onClose();
        } else {
          throw new Error('Gagal mengekstrak berkas gambar JPG.');
        }
      } else {
        // Multi-page PDF (Standar Dokumen Dinas)
        // A4 = 210 x 297 mm, F4/Folio = 215 x 330 mm, Legal = 216 x 356 mm
        const formatDimension: [number, number] =
          paperSize === 'f4' ? [215, 330] : paperSize === 'legal' ? [216, 356] : [210, 297];

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: formatDimension,
        });

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          if (i > 0) {
            pdf.addPage(formatDimension, 'portrait');
          }

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = page.dataUrl;

          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => {
              console.warn(`Halaman ${i + 1} gagal dimuat normal, melanjutkan...`);
              resolve();
            };
            setTimeout(resolve, 5000);
          });

          const canvas = getRotatedCanvas(img, page.rotation);
          const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.90);

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          pdf.addImage(rotatedDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        }

        const pdfBlob = pdf.output('blob');
        const finalFile = new File([pdfBlob], `${cleanName}.pdf`, { type: 'application/pdf' });

        onScanComplete(finalFile);
        stopCamera();
        onClose();
      }
    } catch (err: any) {
      console.error('Finalize scan error:', err);
      setErrorMsg('Gagal mengompilasi dokumen scan: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                {title}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase border border-emerald-200">
                  Universal Scanner Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mendukung semua merk & tipe: Epson, Canon, HP, Brother, ScanSnap, USB Desktop & Kamera Dokumen
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Brand Preset Bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="font-bold text-slate-700 shrink-0 flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
              Pilih Merk / Tipe Mesin:
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none truncate"
            >
              {SCANNER_BRAND_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mendukung Flatbed &amp; ADF Otomatis Bolak-balik</span>
          </div>
        </div>

        {/* Scanner Source Selector Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-white flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              stopCamera();
              setScannerMode('escl');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              scannerMode === 'escl'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>1. Scanner Wi-Fi / Jaringan LAN (eSCL / AirScan)</span>
          </button>

          <button
            onClick={() => {
              stopCamera();
              setScannerMode('twain');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              scannerMode === 'twain'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>2. Scanner Kabel USB Desktop (TWAIN / WIA / SANE)</span>
          </button>

          <button
            onClick={() => setScannerMode('camera')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              scannerMode === 'camera'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>3. Kamera Dokumen / Overhead (CZUR &amp; HP)</span>
          </button>
        </div>

        {/* Alerts & Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{errorMsg}</div>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-600 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successNotice && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
        )}

        {/* Main Work Area */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          {/* Kolom Kiri: Hardware Controls */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-[360px]">
            {/* MODE 1: NETWORK SCANNER (eSCL / AirScan / Mopria / WSD) */}
            {scannerMode === 'escl' && (
              <div className="flex-1 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Printer className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          Scanner Jaringan Kantor (Protokol eSCL / AirScan / WSD)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Kompatibel dengan semua mesin scanner &amp; printer Wi-Fi/LAN (Epson, Canon, HP, Brother, Ricoh).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        IP Address / Hostname Mesin Scanner
                      </label>
                      <input
                        type="text"
                        value={scannerIp}
                        onChange={(e) => setScannerIp(e.target.value)}
                        placeholder="Contoh: 192.168.1.50 atau epson-scanner.local"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Port</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={scannerPort}
                          onChange={(e) => setScannerPort(e.target.value)}
                          placeholder="80 / 8080"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleTestConnection}
                          disabled={isConnectingScanner}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                          title="Uji Sambungan ke IP Scanner"
                        >
                          Uji
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Connection test result pill */}
                  {connectionStatus && (
                    <div
                      className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                        connectionStatus.reachable
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            connectionStatus.reachable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        <span>{connectionStatus.message}</span>
                      </div>
                      <span className="text-[10px] font-mono">Port {scannerPort}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Sumber Kertas</label>
                      <select
                        value={scannerSource}
                        onChange={(e) => setScannerSource(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                      >
                        <option value="flatbed">Kaca Datar (Flatbed)</option>
                        <option value="adf">Pengumpan Dokumen (ADF)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Resolusi (DPI)</label>
                      <select
                        value={scannerResolution}
                        onChange={(e) => setScannerResolution(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium font-mono"
                      >
                        <option value={150}>150 DPI (Cepat &amp; Ringan)</option>
                        <option value={200}>200 DPI (Standar Kantor)</option>
                        <option value={300}>300 DPI (Kualitas Tinggi Resmi)</option>
                        <option value={600}>600 DPI (Ultra Tajam)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mode Warna</label>
                      <select
                        value={scannerColorMode}
                        onChange={(e) => setScannerColorMode(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                      >
                        <option value="color">Warna Penuh (Color)</option>
                        <option value="grayscale">Skala Abu-abu (Grayscale)</option>
                        <option value="bw">Hitam Putih (Black &amp; White)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 truncate">
                    Tekan tombol untuk memicu pemindaian dokumen dari mesin.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleScanFromNetworkScanner}
                      disabled={isConnectingScanner || !scannerIp.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isConnectingScanner ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Scan className="w-4 h-4" />
                      )}
                      <span>{isConnectingScanner ? 'Memindai dari Mesin...' : 'Mulai Pindai Dokumen'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: USB DESKTOP SCANNER (TWAIN / WIA / SANE) */}
            {scannerMode === 'twain' && (
              <div className="flex-1 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <Usb className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Scanner Kabel USB (Driver TWAIN / WIA / SANE / NAPS2)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Untuk mesin scanner USB desktop (Epson Scan 2, Canon ScanGear, HP Scan, Windows Fax &amp; Scan).
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs text-slate-600 shadow-2xs">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                      Langkah Pemindaian Mesin Scanner USB:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 pl-1 leading-relaxed">
                      <li>Buka software scanner bawaan laptop Anda (misal: <em>Epson Scan 2</em>, <em>Canon CaptureOnTouch</em>, <em>HP Smart</em>, atau <em>NAPS2</em>).</li>
                      <li>Tekan tombol Scan pada software atau mesin fisik Anda.</li>
                      <li>Klik kotak pemilih berkas di bawah ini untuk langsung memuat lembar hasil scan ke dokumen ini.</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Ambil Berkas Hasil Scan USB dari Komputer
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleImportScannedFile}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dapat memilih beberapa lembar sekaligus (ADF Batch) untuk disusun otomatis.</span>
                </div>
              </div>
            )}

            {/* MODE 3: LIVE CAMERA SCANNER */}
            {scannerMode === 'camera' && (
              <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-inner">
                {/* Video Preview */}
                <div className="relative flex-1 flex items-center justify-center bg-black min-h-[260px]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain max-h-[340px]"
                  />

                  {/* Document Framing Guide */}
                  <div className="absolute inset-4 sm:inset-7 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded self-start">
                      Posisikan Kertas Dokumen di Dalam Bingkai Ini
                    </span>
                    <span className="text-[9px] font-mono text-emerald-300/80 bg-black/60 px-1.5 py-0.5 rounded self-end">
                      Format: {paperSize.toUpperCase()}
                    </span>
                  </div>

                  {!isCameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs p-4 text-center">
                      <Camera className="w-8 h-8 mb-2 text-slate-600 animate-pulse" />
                      <span>Menghubungkan ke kamera / scanner dokumen...</span>
                    </div>
                  )}
                </div>

                {/* Camera Toolbar */}
                <div className="p-3 bg-slate-800 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 text-xs text-white">
                  <div className="flex items-center gap-2">
                    {videoDevices.length > 1 && (
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          setSelectedDeviceId(e.target.value);
                          startCameraStream(e.target.value);
                        }}
                        className="bg-slate-700 text-white text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-600 focus:outline-none"
                      >
                        {videoDevices.map((d, i) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Scanner / Kamera ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex items-center bg-slate-700 rounded-lg p-0.5 text-[11px]">
                      <button
                        onClick={() => setCameraFilter('document')}
                        className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                          cameraFilter === 'document' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                        }`}
                        title="Teks Tajam & Kertas Putih Bersih (Standar Arsip)"
                      >
                        Dokumen Bersih
                      </button>
                      <button
                        onClick={() => setCameraFilter('normal')}
                        className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                          cameraFilter === 'normal' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                        }`}
                      >
                        Warna Asli
                      </button>
                      <button
                        onClick={() => setCameraFilter('grayscale')}
                        className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                          cameraFilter === 'grayscale' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                        }`}
                      >
                        Grayscale
                      </button>
                      <button
                        onClick={() => setCameraFilter('bw')}
                        className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                          cameraFilter === 'bw' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                        }`}
                      >
                        Monokrom
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCaptureCameraPage}
                    disabled={!isCameraActive}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-white shadow-md shadow-emerald-900/40 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ambil Halaman</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Scanned Pages Manager & Settings */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                Lembar Dokumen ({pages.length} Halaman)
              </span>

              {pages.length > 0 && (
                <button
                  onClick={() => setPages([])}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            {/* Pages Carousel / Grid */}
            <div className="flex-1 overflow-y-auto max-h-[220px] lg:max-h-[240px] space-y-2 pr-1">
              {pages.length === 0 ? (
                <div className="py-10 text-center bg-white rounded-xl border border-dashed border-slate-300 p-4">
                  <Scan className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Belum ada lembar halaman.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gunakan tombol &quot;Mulai Pindai Dokumen&quot; atau &quot;Ambil Halaman&quot;.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPageIndex(idx)}
                      className={`group relative p-2 rounded-xl border bg-white cursor-pointer transition-all ${
                        selectedPageIndex === idx
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center relative">
                        <img
                          src={p.dataUrl}
                          alt={`Hal ${idx + 1}`}
                          style={{ transform: `rotate(${p.rotation}deg)` }}
                          className="w-full h-full object-contain transition-transform"
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">
                          Hal {idx + 1}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewZoomPage(p);
                          }}
                          className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Perbesar Pratinjau"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100 text-[10px]">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(idx, 'up');
                            }}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                            title="Pindah ke Atas"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(idx, 'down');
                            }}
                            disabled={idx === pages.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                            title="Pindah ke Bawah"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotatePage(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Putar 90 Derajat"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Hapus Halaman"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Output Document Configuration */}
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Berkas Hasil Scan
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Nama berkas..."
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Format Output
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800"
                  >
                    <option value="pdf">Dokumen PDF (Multi-Halaman)</option>
                    <option value="jpg">Gambar High-Res (JPG)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ukuran Kertas
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="f4">F4 / Folio (215 x 330 mm)</option>
                    <option value="legal">Legal (216 x 356 mm)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Final Action Button */}
            <button
              onClick={handleFinalizeDocument}
              disabled={pages.length === 0 || isProcessing}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-700/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengompilasi Dokumen ({pages.length} Halaman)...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesai &amp; Gunakan Dokumen ({pages.length} Halaman)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            💡 Berkas hasil scan otomatis dikompilasi ke standar kearsipan resmi Pemerintah Kabupaten Tanggamus.
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Large Zoom Preview Modal */}
      {previewZoomPage && (
        <div
          onClick={() => setPreviewZoomPage(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-4 flex flex-col items-center shadow-2xl border border-slate-700 max-h-[90vh]"
          >
            <div className="flex items-center justify-between w-full pb-2 border-b border-slate-200 mb-2">
              <span className="text-xs font-bold text-slate-800">Pratinjau Hasil Pemindaian</span>
              <button
                onClick={() => setPreviewZoomPage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto max-h-[75vh] flex items-center justify-center">
              <img
                src={previewZoomPage.dataUrl}
                alt="Zoom Preview"
                style={{ transform: `rotate(${previewZoomPage.rotation}deg)` }}
                className="max-h-[72vh] object-contain rounded shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
