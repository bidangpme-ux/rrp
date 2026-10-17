import PDFDocument from 'pdfkit';

export interface AgendaItemRecord {
  id: string;
  userId: string;
  creatorName?: string;
  title: string;
  location: string;
  description?: string;
  scheduleDate: string; // YYYY-MM-DD
  timeStart: string; // HH:mm
  timeEnd?: string; // HH:mm
  groupJid?: string;
  createdAt: string;
}

export function getWIBDate(offsetDays: number = 0): string {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  const wibString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const wibDate = new Date(wibString);
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatIndonesianDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function generateAgendaPDF(dateStr: string, agendas: AgendaItemRecord[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 38, bottom: 38, left: 40, right: 40 },
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: Error) => reject(err));

      const sortedAgendas = [...agendas].sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
      const formattedDate = formatIndonesianDate(dateStr);

      const startX = 40;
      const pageWidth = 515;

      // 1. KOP SURAT 2 BARIS RESMI (CENTER ALIGNED)
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a')
        .text('AGENDA BIDANG PMPEPD', { align: 'center' });
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a')
        .text('BAPPERIDA TANGGAMUS', { align: 'center' });
      doc.moveDown(0.35);

      doc.fontSize(9.5).font('Helvetica').fillColor('#475569')
        .text(`Hari / Tanggal: ${formattedDate}`, { align: 'center' });
      doc.moveDown(0.8);

      // Garis Pemisah Kop Ganda
      const lineY = doc.y;
      doc.lineWidth(1.8).strokeColor('#1e293b').moveTo(startX, lineY).lineTo(startX + pageWidth, lineY).stroke();
      doc.lineWidth(0.6).strokeColor('#64748b').moveTo(startX, lineY + 2.5).lineTo(startX + pageWidth, lineY + 2.5).stroke();
      doc.moveDown(0.9);

      // 2. TABEL 4 KOLOM
      // Lebar kolom: WAKTU (75) | KEGIATAN (175) | LOKASI (125) | KETERANGAN (140) = 515 total
      const colWidths = { waktu: 75, kegiatan: 175, lokasi: 125, ket: 140 };
      const tableHeaderY = doc.y;

      // Background Header
      doc.rect(startX, tableHeaderY, pageWidth, 24).fill('#f1f5f9');
      doc.rect(startX, tableHeaderY, pageWidth, 24).lineWidth(0.8).strokeColor('#94a3b8').stroke();

      // Label Header Kolom
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
      let hX = startX;
      doc.text('WAKTU', hX + 4, tableHeaderY + 7, { width: colWidths.waktu - 8, align: 'center' });
      hX += colWidths.waktu;
      doc.text('KEGIATAN', hX + 6, tableHeaderY + 7, { width: colWidths.kegiatan - 12 });
      hX += colWidths.kegiatan;
      doc.text('LOKASI', hX + 6, tableHeaderY + 7, { width: colWidths.lokasi - 12 });
      hX += colWidths.lokasi;
      doc.text('KETERANGAN', hX + 6, tableHeaderY + 7, { width: colWidths.ket - 12 });

      let currentY = tableHeaderY + 24;

      if (sortedAgendas.length === 0) {
        doc.rect(startX, currentY, pageWidth, 32).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748b')
          .text('Tidak ada agenda kegiatan kedinasan yang terdaftar pada tanggal ini.', startX, currentY + 10, {
            width: pageWidth,
            align: 'center',
          });
        currentY += 32;
      } else {
        sortedAgendas.forEach((item, index) => {
          const waktuText = item.timeEnd ? `${item.timeStart} - ${item.timeEnd}` : `${item.timeStart} WIB`;
          const kegiatanText = item.title || '-';
          const lokasiText = item.location || '-';
          const ketText = item.description || '-';

          doc.font('Helvetica').fontSize(8.5);
          const hKeg = doc.heightOfString(kegiatanText, { width: colWidths.kegiatan - 12 });
          const hLok = doc.heightOfString(lokasiText, { width: colWidths.lokasi - 12 });
          const hKet = doc.heightOfString(ketText, { width: colWidths.ket - 12 });
          const rowHeight = Math.max(24, hKeg + 12, hLok + 12, hKet + 12);

          // Page break check
          if (currentY + rowHeight > doc.page.height - 45) {
            doc.addPage();
            currentY = 40;
          }

          // Alternating background
          if (index % 2 === 1) {
            doc.rect(startX, currentY, pageWidth, rowHeight).fill('#f8fafc');
          }

          // Row border
          doc.rect(startX, currentY, pageWidth, rowHeight).lineWidth(0.5).strokeColor('#cbd5e1').stroke();

          // Render Row Text
          let rX = startX;
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5)
            .text(waktuText, rX + 4, currentY + 6, { width: colWidths.waktu - 8, align: 'center' });

          rX += colWidths.waktu;
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5)
            .text(kegiatanText, rX + 6, currentY + 6, { width: colWidths.kegiatan - 12 });

          rX += colWidths.kegiatan;
          doc.fillColor('#334155').font('Helvetica').fontSize(8.5)
            .text(lokasiText, rX + 6, currentY + 6, { width: colWidths.lokasi - 12 });

          rX += colWidths.lokasi;
          doc.fillColor('#475569').font('Helvetica').fontSize(8.5)
            .text(ketText, rX + 6, currentY + 6, { width: colWidths.ket - 12 });

          currentY += rowHeight;
        });
      }

      // Footer Catatan Resmi
      currentY += 16;
      doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
        .text(`Dokumen resmi dicetak secara otomatis melalui Sistem E-PMPED Bapperida Tanggamus pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.`, startX, currentY, {
          width: pageWidth,
          align: 'right',
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
