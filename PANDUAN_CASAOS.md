# Panduan Menjalankan E-PMPED di CasaOS (Setup IP Otomatis & Port Kosong Otomatis)

Panduan ini menjawab dua kebutuhan utama Anda:
1. **Mengikuti IP / Domain bawaan CasaOS** (tidak perlu setup IP manual).
2. **Port otomatis terisi dengan port yang kosong** (mencegah bentrok port).

---

## 💡 Solusi Error yang Sering Terjadi:

### 1. Error `Cannot find native binding ... @rolldown/binding-linux-x64-musl`:
- **Penyebab**: Vite versi 8 menggunakan bundler *Rolldown* yang membutuhkan binary native C. Image Docker `node:20-alpine` menggunakan C library `musl` yang sering gagal diinstal oleh npm karena bug npm #4828.
- **Solusi Tuntas**:
  1. Base image Dockerfile telah diganti dari `node:20-alpine` ke **`node:20-slim` (Debian)** yang menggunakan standar `glibc` lengkap.
  2. Binary native Rolldown (`@rolldown/binding-linux-x64-gnu`) otomatis terinstal sempurna dan `npm run build` berjalan mulus.
  3. Cukup jalankan perintah instalasi di bawah, skrip akan otomatis memperbarui Dockerfile dan mem-build ulang.

### 2. Error `process "/bin/sh -c npm install" did not complete successfully`:
- **Penyebab**: Terjadi bentrok versi ketergantungan paket (*peer dependency conflict* pada npm).
- **Solusi**: File `package.json` dan `Dockerfile` sudah menggunakan `--legacy-peer-deps`.

### 3. Error `open Dockerfile: no such file or directory`:
- **Penyebab**: Folder `/DATA/AppData/epmped` di CasaOS belum berisi file aplikasi.
- **Solusi**: Pastikan file-file aplikasi sudah disalin ke folder tersebut.

---

## 🚀 CARA 1: Paling Mudah & Otomatis (Lewat Terminal CasaOS)
*Cara ini paling direkomendasikan karena skrip akan **otomatis mendeteksi port kosong**, menangani izin root, dan memasang ikon di CasaOS.*

### Langkah 1: Pastikan File Aplikasi Berada di Folder CasaOS
1. Buka dashboard CasaOS di browser Anda.
2. Klik ikon aplikasi **Files** (File Manager bawaan CasaOS).
3. Masuk ke direktori: `/DATA/AppData/epmped` (jika folder `epmped` belum ada, buat foldernya).
4. Upload file proyek ini ke dalam folder tersebut (Anda bisa upload file ZIP lalu klik kanan **Extract**).
5. Pastikan di dalam `/DATA/AppData/epmped` terdapat file `package.json`, `server.ts`, `casaos-install.sh`, `Dockerfile`, dan folder `src`.

### Langkah 2: Jalankan Script di Terminal CasaOS
Buka **Terminal** di CasaOS (atau lewat SSH), lalu ketik:
```bash
cd /DATA/AppData/epmped && sudo bash casaos-install.sh
```

**Apa yang dilakukan skrip ini secara otomatis?**
- 🧹 Membersihkan container dan cache lama yang gagal.
- 📄 Memastikan Dockerfile menggunakan **`node:20-slim` (Debian glibc)** agar bebas dari error native binding.
- 🔍 Memindai port host (mulai dari 3000, 3001, 3002...) dan **otomatis memilih port yang belum dipakai**.
- 🌐 Menghubungkan aplikasi ke IP / domain CasaOS Anda.
- ⚡ Membangun dan menyalakan server aplikasi E-PMPED.
- 📱 Mendaftarkan ikon **E-PMPED Bapperida** di Dashboard CasaOS.

---

## 🖱️ CARA 2: Lewat Web UI CasaOS (Custom Install / Import)
Jika Anda ingin memasang langsung dari tampilan grafis web CasaOS:

1. Buka **Dashboard CasaOS** di browser Anda.
2. Masuk ke **App Store**.
3. Di sudut kanan atas, klik tombol **"Custom Install"**.
4. Klik tombol **Import** (ikon dokumen / panah di kanan atas form).
5. Tempel (*paste*) konfigurasi Docker Compose berikut:

```yaml
name: epmped-bapperida

services:
  epmped:
    image: node:20-slim
    container_name: epmped-bapperida
    restart: unless-stopped
    ports:
      - "3000" # Biarkan tanpa host port spesifik jika ingin CasaOS mengalokasikan port otomatis
    working_dir: /app
    volumes:
      - /DATA/AppData/epmped:/app
    command: sh -c "npm install --legacy-peer-deps && npm run build && npx tsx server.ts"
    environment:
      - PORT=3000
      - NODE_ENV=production
    x-casaos:
      icon: "https://cdn-icons-png.flaticon.com/512/906/906334.png"
      title:
        en_us: E-PMPED Bapperida
        id_id: E-PMPED Bapperida
      author: Bapperida Tanggamus
      category: Office
      description:
        en_us: Sistem Elektronik Bidang Perencanaan Makro Pengendalian dan Evaluasi Pembangunan Daerah
        id_id: Sistem Elektronik Bidang Perencanaan Makro Pengendalian dan Evaluasi Pembangunan Daerah
      developer: Bapperida Tanggamus
      index: /
      port_map: "3000"
      scheme: http
```


6. **Pengaturan Port di Form CasaOS:**
   - **Container Port**: `3000`
   - **Host Port**: `3000` *(Sesuai konfigurasi Cloudflare Tunnel Service URL: `http://192.168.99.30:3000`)*
   - **Web UI**: `3000`
7. **Pengaturan IP & Domain:**
   - Anda dapat mengakses aplikasi melalui IP lokal CasaOS: `http://192.168.99.30:3000`
   - Atau langsung melalui domain Cloudflare publik: **`https://pme.cloudpme.my.id`**
8. Klik **Submit** lalu **Install**.

---

## 🌐 Dukungan Penuh Domain Cloudflare (`pme.cloudpme.my.id`)
Aplikasi ini sudah **100% dikonfigurasi siap pakai** untuk tunnel Cloudflare Anda:
- **Service URL Cloudflare**: `http://192.168.99.30:3000`
- **Domain Publik**: `https://pme.cloudpme.my.id`
- **Fitur Otomatis yang Terpasang**:
  1. **Trust Proxy Express**: Otomatis mendeteksi protokol HTTPS dan IP asli pengunjung melalui header `CF-Connecting-IP`.
  2. **CORS & Allowed Hosts**: Header keamanan dikonfigurasi untuk menerima akses dari domain `pme.cloudpme.my.id` dan IP `192.168.99.30`.
  3. **Zero Setup**: Begitu container dinyalakan di CasaOS, domain Cloudflare langsung aktif dan menampilkan sistem E-PMPED.


---

## 💾 Basis Data Relasional PostgreSQL 16 & Penyimpanan Terpusat

Aplikasi kini telah terintegrasi penuh dengan **PostgreSQL 16**:
1. **Otomatis Disediakan via Docker Compose**:
   - Skrip instalasi otomatis menyalakan container `epmped-postgres` bersama dengan `epmped-bapperida`.
   - Data PostgreSQL tersimpan permanen di `/DATA/AppData/epmped/pgdata`.
   - Konfigurasi memori PostgreSQL telah dituning khusus untuk **PC RAM 4 GB & Core i5** (stabil di ~150-200MB RAM).
2. **Auto-Seeding Data Awal**:
   - Saat pertama kali dinyalakan, sistem otomatis mengeksekusi skema tabel dari `init.sql`.
   - Jika tabel masih kosong, data awal bawaan instansi (pengguna, contoh surat, pohon IKU Tanggamus) otomatis dimigrasikan ke PostgreSQL tanpa perlu input ulang manual.
3. **Pengelompokan Otomatis Folder Pribadi User di Harddisk CasaOS**:
   - Setiap kali Admin menambahkan pengguna baru di aplikasi, sistem secara otomatis membuatkan folder fisik di:
     `📁 /DATA/AppData/epmped/data/storage/File_Saya/[nama_user]/`
   - Berkas yang diunggah staf otomatis tersimpan ke dalam folder pribadi masing-masing di harddisk server CasaOS, memudahkan backup mandiri per pegawai melalui aplikasi **Files** bawaan CasaOS.
4. **Dual Mirroring & Fallback Keamanan**:
   - Jika PostgreSQL sewaktu-waktu dalam masa perbaikan/maintenance, backend otomatis menggunakan penyimpanan file JSON lokal sehingga aplikasi tetap dapat diakses tanpa jeda (*zero-downtime*).

---

## 🔑 Login Default Aplikasi
Setelah aplikasi aktif:
- **Username**: `admin`
- **Password**: `admin`
*(Akun baru yang Anda tambahkan melalui menu Manajemen Pengguna akan langsung aktif dan bisa login dari perangkat mana saja)*
