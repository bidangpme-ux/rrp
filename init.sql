-- ============================================================================
-- SKEMA BASIS DATA POSTGRESQL UNTUK E-PMPED BAPPERIDA TANGGAMUS
-- Otomatis dieksekusi saat container PostgreSQL pertama kali dijalankan di CasaOS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user', 'bidang')),
    department VARCHAR(150) DEFAULT 'Umum',
    can_manage_iku BOOLEAN DEFAULT FALSE,
    can_input_agenda BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL CLOUD STORAGE / BERKAS & FOLDER (STORAGE_ITEMS)
CREATE TABLE IF NOT EXISTS storage_items (
    id VARCHAR(60) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('folder', 'file')),
    extension VARCHAR(20),
    size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    parent_id VARCHAR(60) REFERENCES storage_items(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('private', 'public', 'bidang')),
    owner_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    owner_name VARCHAR(150),
    owner_email VARCHAR(150),
    bidang_category VARCHAR(100),
    data_url TEXT,
    starred BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_scope ON storage_items(scope);
CREATE INDEX IF NOT EXISTS idx_storage_owner ON storage_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_storage_parent ON storage_items(parent_id);

-- 3. TABEL MANAJEMEN PERSURATAN DINAS (SURAT)
CREATE TABLE IF NOT EXISTS surat (
    id VARCHAR(60) PRIMARY KEY,
    nomor_surat VARCHAR(100) NOT NULL,
    tanggal_surat DATE NOT NULL,
    tanggal_diterima DATE NOT NULL,
    tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
    jenis VARCHAR(100) NOT NULL,
    kategori_keluar VARCHAR(100),
    tingkat_urgensi VARCHAR(50) DEFAULT 'Biasa' CHECK (tingkat_urgensi IN ('Sangat Segera', 'Segera', 'Biasa', 'Rahasia')),
    pengirim VARCHAR(200) NOT NULL,
    penerima VARCHAR(200) NOT NULL,
    perihal TEXT NOT NULL,
    ringkasan TEXT,
    status VARCHAR(50) DEFAULT 'Baru' CHECK (status IN ('Baru', 'Didisposisi', 'Ditindaklanjuti', 'Diarsipkan')),
    disposisi_kepada VARCHAR(200),
    catatan_disposisi TEXT,
    file_name VARCHAR(255),
    file_size BIGINT DEFAULT 0,
    file_url TEXT,
    file_extension VARCHAR(20),
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    creator_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_surat_nomor ON surat(nomor_surat);
CREATE INDEX IF NOT EXISTS idx_surat_tipe ON surat(tipe);
CREATE INDEX IF NOT EXISTS idx_surat_tanggal ON surat(tanggal_surat);

-- 4. TABEL PERIODE RPJMD
CREATE TABLE IF NOT EXISTS periode_rpjmd (
    id VARCHAR(80) PRIMARY KEY,
    nama VARCHAR(200) NOT NULL,
    tahun_mulai INT NOT NULL,
    tahun_selesai INT NOT NULL,
    tahun_list INT[] NOT NULL,
    is_aktif BOOLEAN DEFAULT FALSE,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABEL TUJUAN & SASARAN RPJMD 5 TAHUNAN
CREATE TABLE IF NOT EXISTS tujuan_sasaran (
    id VARCHAR(80) PRIMARY KEY,
    periode_id VARCHAR(80) NOT NULL REFERENCES periode_rpjmd(id) ON DELETE CASCADE,
    visi TEXT NOT NULL,
    misi TEXT NOT NULL,
    misi_nomor INT,
    tujuan TEXT NOT NULL,
    sasaran TEXT NOT NULL,
    indikator TEXT NOT NULL,
    satuan VARCHAR(50) NOT NULL,
    target_tahunan JSONB NOT NULL DEFAULT '{}'::jsonb,
    perangkat_daerah_list TEXT[] DEFAULT '{}',
    bidang_pengampu VARCHAR(100),
    formula TEXT,
    penanggung_jawab VARCHAR(150),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tujuan_sasaran_periode ON tujuan_sasaran(periode_id);

-- 6. TABEL INDIKATOR KINERJA UTAMA (IKU) TAHUNAN
CREATE TABLE IF NOT EXISTS iku (
    id VARCHAR(80) PRIMARY KEY,
    tahun INT NOT NULL,
    visi TEXT NOT NULL,
    misi TEXT NOT NULL,
    misi_nomor INT,
    tujuan TEXT NOT NULL,
    sasaran TEXT NOT NULL,
    tujuan_pd TEXT NOT NULL,
    sasaran_pd TEXT NOT NULL,
    perangkat_daerah VARCHAR(150) NOT NULL,
    bidang_pengampu VARCHAR(100),
    indikator_kinerja TEXT NOT NULL,
    formula TEXT,
    satuan VARCHAR(50) NOT NULL,
    target NUMERIC(10, 2) NOT NULL DEFAULT 0,
    realisasi NUMERIC(10, 2),
    capaian_persen NUMERIC(6, 2),
    kategori_capaian VARCHAR(50) DEFAULT 'Belum Dinilai',
    penanggung_jawab VARCHAR(150),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iku_tahun ON iku(tahun);
CREATE INDEX IF NOT EXISTS idx_iku_opd ON iku(perangkat_daerah);

-- 7. TABEL AUDIT LOG & KEAMANAN SISTEM
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(80) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(50),
    user_name VARCHAR(150) NOT NULL,
    user_role VARCHAR(50),
    category VARCHAR(30) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_info VARCHAR(150),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'warning', 'danger')),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs(category);

-- 8. TABEL PENGATURAN UMUM & LOGO
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABEL AGENDA KEGIATAN
CREATE TABLE IF NOT EXISTS agendas (
    id VARCHAR(60) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    schedule_date DATE NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME,
    group_jid VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agendas_date ON agendas(schedule_date);
CREATE INDEX IF NOT EXISTS idx_agendas_time ON agendas(schedule_date, time_start ASC);
CREATE INDEX IF NOT EXISTS idx_agendas_user ON agendas(user_id);

-- 10. TABEL PENGATURAN BOT WHATSAPP (FONNTE)
CREATE TABLE IF NOT EXISTS bot_settings (
    id INT PRIMARY KEY DEFAULT 1,
    fonnte_token VARCHAR(255) NOT NULL,
    default_group_jid VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row_config CHECK (id = 1)
);

INSERT INTO bot_settings (id, fonnte_token, default_group_jid, is_active)
VALUES (1, '', '', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. TABEL LOG PENGINGAT AGENDA
CREATE TABLE IF NOT EXISTS agenda_reminders_log (
    id VARCHAR(60) PRIMARY KEY,
    agenda_date DATE NOT NULL,
    reminder_type VARCHAR(10) NOT NULL CHECK (reminder_type IN ('H-1', 'DAY_H')),
    group_jid VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    response_message TEXT,
    pdf_filename VARCHAR(255),
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reminder_per_batch 
ON agenda_reminders_log(agenda_date, reminder_type, group_jid);

