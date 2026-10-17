import pg from 'pg';
import path from 'path';
import fs from 'fs';

const { Pool } = pg;

export interface PgStatus {
  connected: boolean;
  engine: 'postgresql' | 'file-json';
  host?: string;
  database?: string;
  message?: string;
  tableCounts?: Record<string, number>;
}

class PgDatabaseService {
  private pool: pg.Pool | null = null;
  private isConnected: boolean = false;
  private statusMessage: string = 'Inisialisasi...';

  constructor() {
    this.setupConnection();
  }

  private setupConnection() {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) {
      this.isConnected = false;
      this.statusMessage = 'DATABASE_URL tidak disetel (menggunakan penyimpanan file JSON lokal)';
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: connStr,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 15,
      });

      this.pool.on('error', (err) => {
        console.warn('[PostgreSQL Pool Error]:', err.message);
        this.isConnected = false;
        this.statusMessage = `Koneksi terputus: ${err.message}`;
      });
    } catch (err: any) {
      console.warn('[PostgreSQL Init Warning]:', err.message);
      this.isConnected = false;
      this.statusMessage = `Error inisialisasi: ${err.message}`;
    }
  }

  private retryInterval: any = null;
  private onConnectCallback?: () => void;

  public setOnConnectCallback(cb: () => void) {
    this.onConnectCallback = cb;
  }

  public async checkAndInit(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        this.isConnected = true;
        this.statusMessage = 'Terhubung ke PostgreSQL';
        console.log('✅ Berhasil terhubung ke database PostgreSQL!');

        if (this.retryInterval) {
          clearInterval(this.retryInterval);
          this.retryInterval = null;
        }

        // Run DDL to ensure all tables exist
        await this.createTablesIfNotExist(client);

        if (this.onConnectCallback) {
          try {
            this.onConnectCallback();
          } catch (e) {
            console.warn('[PostgreSQL onConnectCallback error]:', e);
          }
        }

        return true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.isConnected = false;
      this.statusMessage = `Koneksi gagal: ${err.message}`;
      console.warn('⚠️ PostgreSQL offline atau belum siap. Fallback ke file JSON:', err.message);

      // Start automatic background retry if not running
      if (!this.retryInterval && process.env.DATABASE_URL) {
        this.retryInterval = setInterval(async () => {
          console.log('🔄 [PostgreSQL Auto-Retry] Mencoba menghubungkan ke PostgreSQL...');
          const ok = await this.checkAndInit();
          if (ok) {
            console.log('🎉 [PostgreSQL Auto-Retry] PostgreSQL berhasil terhubung!');
          }
        }, 8000);
      }

      return false;
    }
  }

  private async createTablesIfNotExist(client: pg.PoolClient) {
    const ddl = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        department VARCHAR(150) DEFAULT 'Umum',
        can_manage_iku BOOLEAN DEFAULT FALSE,
        can_input_agenda BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS storage_items (
        id VARCHAR(60) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(10) NOT NULL,
        extension VARCHAR(20),
        size BIGINT DEFAULT 0,
        mime_type VARCHAR(100),
        parent_id VARCHAR(60),
        scope VARCHAR(20) NOT NULL,
        owner_id VARCHAR(50),
        owner_name VARCHAR(150),
        owner_email VARCHAR(150),
        bidang_category VARCHAR(100),
        data_url TEXT,
        starred BOOLEAN DEFAULT FALSE,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS surat (
        id VARCHAR(60) PRIMARY KEY,
        nomor_surat VARCHAR(100) NOT NULL,
        tanggal_surat DATE NOT NULL,
        tanggal_diterima DATE NOT NULL,
        tipe VARCHAR(20) NOT NULL,
        jenis VARCHAR(100) NOT NULL,
        kategori_keluar VARCHAR(100),
        tingkat_urgensi VARCHAR(50) DEFAULT 'Biasa',
        pengirim VARCHAR(200) NOT NULL,
        penerima VARCHAR(200) NOT NULL,
        perihal TEXT NOT NULL,
        ringkasan TEXT,
        status VARCHAR(50) DEFAULT 'Baru',
        disposisi_kepada VARCHAR(200),
        catatan_disposisi TEXT,
        file_name VARCHAR(255),
        file_size BIGINT DEFAULT 0,
        file_url TEXT,
        file_extension VARCHAR(20),
        created_by VARCHAR(50),
        creator_name VARCHAR(150),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS tujuan_sasaran (
        id VARCHAR(80) PRIMARY KEY,
        periode_id VARCHAR(80) NOT NULL,
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
        status VARCHAR(20) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(50) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agendas (
        id VARCHAR(60) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        creator_name VARCHAR(150),
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT,
        schedule_date DATE NOT NULL,
        time_start VARCHAR(10) NOT NULL,
        time_end VARCHAR(10),
        group_jid VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_agendas_date ON agendas(schedule_date);
      CREATE INDEX IF NOT EXISTS idx_agendas_user ON agendas(user_id);

      CREATE TABLE IF NOT EXISTS bot_settings (
        id INT PRIMARY KEY DEFAULT 1,
        fonnte_token VARCHAR(255) NOT NULL DEFAULT '',
        default_group_jid VARCHAR(100) DEFAULT '',
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT single_bot_config CHECK (id = 1)
      );

      INSERT INTO bot_settings (id, fonnte_token, default_group_jid, is_active)
      VALUES (1, '', '', TRUE)
      ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS agenda_reminders_log (
        id VARCHAR(60) PRIMARY KEY,
        agenda_date DATE NOT NULL,
        reminder_type VARCHAR(10) NOT NULL,
        group_jid VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL,
        response_message TEXT,
        pdf_filename VARCHAR(255),
        sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(ddl);
  }

  public getStatus(): PgStatus {
    const isConn = this.isConnected;
    return {
      connected: isConn,
      engine: isConn ? 'postgresql' : 'file-json',
      message: this.statusMessage,
    };
  }

  public async getTableCounts(): Promise<Record<string, number>> {
    if (!this.isConnected || !this.pool) return {};
    try {
      const res = await this.pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users,
          (SELECT COUNT(*) FROM storage_items) as storage_items,
          (SELECT COUNT(*) FROM surat) as surat,
          (SELECT COUNT(*) FROM iku) as iku,
          (SELECT COUNT(*) FROM tujuan_sasaran) as tujuan_sasaran,
          (SELECT COUNT(*) FROM periode_rpjmd) as periode_rpjmd,
          (SELECT COUNT(*) FROM audit_logs) as audit_logs,
          (SELECT COUNT(*) FROM agendas) as agendas
      `);
      const row = res.rows[0];
      return {
        users: Number(row.users || 0),
        storageItems: Number(row.storage_items || 0),
        surat: Number(row.surat || 0),
        iku: Number(row.iku || 0),
        tujuanSasaran: Number(row.tujuan_sasaran || 0),
        periodeRpjmd: Number(row.periode_rpjmd || 0),
        auditLogs: Number(row.audit_logs || 0),
        agendas: Number(row.agendas || 0),
      };
    } catch {
      return {};
    }
  }

  // ----------------------- USERS -----------------------
  public async getUsers(): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM users ORDER BY created_at ASC');
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        username: r.username,
        password: r.password,
        role: r.role,
        department: r.department,
        canManageIKU: r.can_manage_iku,
        canInputAgenda: r.can_input_agenda,
        createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
      }));
    } catch (err) {
      console.warn('[PgService] getUsers error:', err);
      return null;
    }
  }

  public async saveUsers(users: any[]): Promise<boolean> {
    if (!this.isConnected || !this.pool || !Array.isArray(users)) return false;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const u of users) {
        await client.query(
          `INSERT INTO users (id, name, email, username, password, role, department, can_manage_iku, can_input_agenda, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             username = EXCLUDED.username,
             password = EXCLUDED.password,
             role = EXCLUDED.role,
             department = EXCLUDED.department,
             can_manage_iku = EXCLUDED.can_manage_iku,
             can_input_agenda = EXCLUDED.can_input_agenda`,
          [
            u.id,
            u.name,
            u.email,
            u.username || u.name,
            u.password || 'password123',
            u.role || 'user',
            u.department || 'Umum',
            Boolean(u.canManageIKU),
            Boolean(u.canInputAgenda),
            u.createdAt || new Date().toISOString(),
          ]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[PgService] saveUsers error:', err);
      return false;
    } finally {
      client.release();
    }
  }

  // ----------------------- STORAGE ITEMS -----------------------
  public async getStorageItems(): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM storage_items ORDER BY created_at DESC');
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        extension: r.extension,
        size: Number(r.size || 0),
        mimeType: r.mime_type,
        parentId: r.parent_id,
        scope: r.scope,
        ownerId: r.owner_id,
        ownerName: r.owner_name,
        ownerEmail: r.owner_email,
        bidangCategory: r.bidang_category,
        dataUrl: r.data_url,
        starred: r.starred,
        description: r.description,
        createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
      }));
    } catch (err) {
      console.warn('[PgService] getStorageItems error:', err);
      return null;
    }
  }

  public async saveStorageItems(items: any[]): Promise<boolean> {
    if (!this.isConnected || !this.pool || !Array.isArray(items)) return false;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Truncate or Upsert: Since frontend sends current full item tree
      const incomingIds = items.map((i) => i.id);
      if (incomingIds.length > 0) {
        await client.query('DELETE FROM storage_items WHERE id NOT IN (' + incomingIds.map((_, i) => `$${i + 1}`).join(',') + ')', incomingIds);
      } else {
        await client.query('DELETE FROM storage_items');
      }

      for (const item of items) {
        await client.query(
          `INSERT INTO storage_items (
             id, name, type, extension, size, mime_type, parent_id, scope, owner_id,
             owner_name, owner_email, bidang_category, data_url, starred, description, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             extension = EXCLUDED.extension,
             size = EXCLUDED.size,
             mime_type = EXCLUDED.mime_type,
             parent_id = EXCLUDED.parent_id,
             scope = EXCLUDED.scope,
             owner_id = EXCLUDED.owner_id,
             owner_name = EXCLUDED.owner_name,
             owner_email = EXCLUDED.owner_email,
             bidang_category = EXCLUDED.bidang_category,
             data_url = COALESCE(EXCLUDED.data_url, storage_items.data_url),
             starred = EXCLUDED.starred,
             description = EXCLUDED.description,
             updated_at = EXCLUDED.updated_at`,
          [
            item.id,
            item.name,
            item.type,
            item.extension || '',
            item.size || 0,
            item.mimeType || '',
            item.parentId || null,
            item.scope || 'private',
            item.ownerId || null,
            item.ownerName || '',
            item.ownerEmail || '',
            item.bidangCategory || null,
            item.dataUrl || null,
            Boolean(item.starred),
            item.description || null,
            item.createdAt || new Date().toISOString(),
            item.updatedAt || new Date().toISOString(),
          ]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[PgService] saveStorageItems error:', err);
      return false;
    } finally {
      client.release();
    }
  }

  // ----------------------- SURAT -----------------------
  public async getSuratList(): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM surat ORDER BY tanggal_surat DESC');
      return res.rows.map((r) => ({
        id: r.id,
        nomorSurat: r.nomor_surat,
        tanggalSurat: r.tanggal_surat?.toISOString ? r.tanggal_surat.toISOString().split('T')[0] : r.tanggal_surat,
        tanggalDiterima: r.tanggal_diterima?.toISOString ? r.tanggal_diterima.toISOString().split('T')[0] : r.tanggal_diterima,
        tipe: r.tipe,
        jenis: r.jenis,
        kategoriKeluar: r.kategori_keluar,
        tingkatUrgensi: r.tingkat_urgensi,
        pengirim: r.pengirim,
        penerima: r.penerima,
        perihal: r.perihal,
        ringkasan: r.ringkasan,
        status: r.status,
        disposisiKepada: r.disposisi_kepada,
        catatanDisposisi: r.catatan_disposisi,
        fileName: r.file_name,
        fileSize: Number(r.file_size || 0),
        fileUrl: r.file_url,
        fileExtension: r.file_extension,
        createdBy: r.created_by,
        creatorName: r.creator_name,
        createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
      }));
    } catch (err) {
      console.warn('[PgService] getSuratList error:', err);
      return null;
    }
  }

  public async saveSuratList(suratList: any[]): Promise<boolean> {
    if (!this.isConnected || !this.pool || !Array.isArray(suratList)) return false;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const incomingIds = suratList.map((s) => s.id);
      if (incomingIds.length > 0) {
        await client.query('DELETE FROM surat WHERE id NOT IN (' + incomingIds.map((_, i) => `$${i + 1}`).join(',') + ')', incomingIds);
      } else {
        await client.query('DELETE FROM surat');
      }

      for (const s of suratList) {
        await client.query(
          `INSERT INTO surat (
             id, nomor_surat, tanggal_surat, tanggal_diterima, tipe, jenis, kategori_keluar,
             tingkat_urgensi, pengirim, penerima, perihal, ringkasan, status, disposisi_kepada,
             catatan_disposisi, file_name, file_size, file_url, file_extension, created_by,
             creator_name, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
           ON CONFLICT (id) DO UPDATE SET
             nomor_surat = EXCLUDED.nomor_surat,
             tanggal_surat = EXCLUDED.tanggal_surat,
             tanggal_diterima = EXCLUDED.tanggal_diterima,
             tipe = EXCLUDED.tipe,
             jenis = EXCLUDED.jenis,
             kategori_keluar = EXCLUDED.kategori_keluar,
             tingkat_urgensi = EXCLUDED.tingkat_urgensi,
             pengirim = EXCLUDED.pengirim,
             penerima = EXCLUDED.penerima,
             perihal = EXCLUDED.perihal,
             ringkasan = EXCLUDED.ringkasan,
             status = EXCLUDED.status,
             disposisi_kepada = EXCLUDED.disposisi_kepada,
             catatan_disposisi = EXCLUDED.catatan_disposisi,
             file_name = EXCLUDED.file_name,
             file_size = EXCLUDED.file_size,
             file_url = COALESCE(EXCLUDED.file_url, surat.file_url),
             file_extension = EXCLUDED.file_extension,
             updated_at = EXCLUDED.updated_at`,
          [
            s.id,
            s.nomorSurat,
            s.tanggalSurat,
            s.tanggalDiterima,
            s.tipe || 'masuk',
            s.jenis || 'Surat Masuk',
            s.kategoriKeluar || null,
            s.tingkatUrgensi || 'Biasa',
            s.pengirim || '',
            s.penerima || '',
            s.perihal || '',
            s.ringkasan || '',
            s.status || 'Baru',
            s.disposisiKepada || null,
            s.catatanDisposisi || null,
            s.fileName || null,
            s.fileSize || 0,
            s.fileUrl || null,
            s.fileExtension || null,
            s.createdBy || null,
            s.creatorName || '',
            s.createdAt || new Date().toISOString(),
            s.updatedAt || new Date().toISOString(),
          ]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[PgService] saveSuratList error:', err);
      return false;
    } finally {
      client.release();
    }
  }

  // ----------------------- IKU -----------------------
  public async getIKUList(): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM iku ORDER BY tahun DESC');
      return res.rows.map((r) => ({
        id: r.id,
        tahun: Number(r.tahun),
        visi: r.visi,
        misi: r.misi,
        misiNomor: r.misi_nomor,
        tujuan: r.tujuan,
        sasaran: r.sasaran,
        tujuanPD: r.tujuan_pd,
        sasaranPD: r.sasaran_pd,
        perangkatDaerah: r.perangkat_daerah,
        bidangPengampu: r.bidang_pengampu,
        indikatorKinerja: r.indikator_kinerja,
        formula: r.formula,
        satuan: r.satuan,
        target: Number(r.target || 0),
        realisasi: r.realisasi !== null ? Number(r.realisasi) : undefined,
        capaianPersen: r.capaian_persen !== null ? Number(r.capaian_persen) : undefined,
        kategoriCapaian: r.kategori_capaian,
        penanggungJawab: r.penanggung_jawab,
        keterangan: r.keterangan,
        createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
      }));
    } catch (err) {
      console.warn('[PgService] getIKUList error:', err);
      return null;
    }
  }

  public async saveIKUList(ikuList: any[]): Promise<boolean> {
    if (!this.isConnected || !this.pool || !Array.isArray(ikuList)) return false;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const incomingIds = ikuList.map((i) => i.id);
      if (incomingIds.length > 0) {
        await client.query('DELETE FROM iku WHERE id NOT IN (' + incomingIds.map((_, i) => `$${i + 1}`).join(',') + ')', incomingIds);
      } else {
        await client.query('DELETE FROM iku');
      }

      for (const item of ikuList) {
        await client.query(
          `INSERT INTO iku (
             id, tahun, visi, misi, misi_nomor, tujuan, sasaran, tujuan_pd, sasaran_pd,
             perangkat_daerah, bidang_pengampu, indikator_kinerja, formula, satuan,
             target, realisasi, capaian_persen, kategori_capaian, penanggung_jawab, keterangan, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
           ON CONFLICT (id) DO UPDATE SET
             tahun = EXCLUDED.tahun,
             visi = EXCLUDED.visi,
             misi = EXCLUDED.misi,
             misi_nomor = EXCLUDED.misi_nomor,
             tujuan = EXCLUDED.tujuan,
             sasaran = EXCLUDED.sasaran,
             tujuan_pd = EXCLUDED.tujuan_pd,
             sasaran_pd = EXCLUDED.sasaran_pd,
             perangkat_daerah = EXCLUDED.perangkat_daerah,
             bidang_pengampu = EXCLUDED.bidang_pengampu,
             indikator_kinerja = EXCLUDED.indikator_kinerja,
             formula = EXCLUDED.formula,
             satuan = EXCLUDED.satuan,
             target = EXCLUDED.target,
             realisasi = EXCLUDED.realisasi,
             capaian_persen = EXCLUDED.capaian_persen,
             kategori_capaian = EXCLUDED.kategori_capaian,
             penanggung_jawab = EXCLUDED.penanggung_jawab,
             keterangan = EXCLUDED.keterangan,
             updated_at = EXCLUDED.updated_at`,
          [
            item.id,
            item.tahun,
            item.visi || '',
            item.misi || '',
            item.misiNomor || null,
            item.tujuan || '',
            item.sasaran || '',
            item.tujuanPD || '',
            item.sasaranPD || '',
            item.perangkatDaerah || 'Bapperida Tanggamus',
            item.bidangPengampu || null,
            item.indikatorKinerja || '',
            item.formula || null,
            item.satuan || '%',
            item.target || 0,
            item.realisasi !== undefined ? item.realisasi : null,
            item.capaianPersen !== undefined ? item.capaianPersen : null,
            item.kategoriCapaian || 'Belum Dinilai',
            item.penanggungJawab || null,
            item.keterangan || null,
            item.createdAt || new Date().toISOString(),
            item.updatedAt || new Date().toISOString(),
          ]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[PgService] saveIKUList error:', err);
      return false;
    } finally {
      client.release();
    }
  }

  // ----------------------- PERIODE RPJMD -----------------------
  public async getPeriodeList(): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM periode_rpjmd ORDER BY tahun_mulai DESC');
      return res.rows.map((r) => ({
        id: r.id,
        nama: r.nama,
        tahunMulai: r.tahun_mulai,
        tahunSelesai: r.tahun_selesai,
        tahunList: r.tahun_list || [],
        isAktif: r.is_aktif,
        keterangan: r.keterangan,
        createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
      }));
    } catch (err) {
      console.warn('[PgService] getPeriodeList error:', err);
      return null;
    }
  }

  public async savePeriodeList(list: any[]): Promise<boolean> {
    if (!this.isConnected || !this.pool || !Array.isArray(list)) return false;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const incomingIds = list.map((p) => p.id);
      if (incomingIds.length > 0) {
        await client.query('DELETE FROM periode_rpjmd WHERE id NOT IN (' + incomingIds.map((_, i) => `$${i + 1}`).join(',') + ')', incomingIds);
      } else {
        await client.query('DELETE FROM periode_rpjmd');
      }

      for (const p of list) {
        await client.query(
          `INSERT INTO periode_rpjmd (id, nama, tahun_mulai, tahun_selesai, tahun_list, is_aktif, keterangan, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             nama = EXCLUDED.nama,
             tahun_mulai = EXCLUDED.tahun_mulai,
             tahun_selesai = EXCLUDED.tahun_selesai,
             tahun_list = EXCLUDED.tahun_list,
             is_aktif = EXCLUDED.is_aktif,
             keterangan = EXCLUDED.keterangan`,
          [
            p.id,
            p.nama,
            p.tahunMulai,
            p.tahunSelesai,
            p.tahunList || [],
            Boolean(p.isAktif),
            p.keterangan || null,
            p.createdAt || new Date().toISOString(),
          ]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[PgService] savePeriodeList error:', err);
      return false;
    } finally {
      client.release();
    }
  }

  // ----------------------- TUJUAN & SASARAN -----------------------
  public async getTujuanSasaranList(): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM tujuan_sasaran ORDER BY created_at ASC');
      return res.rows.map((r) => ({
        id: r.id,
        periodeId: r.periode_id,
        visi: r.visi,
        misi: r.misi,
        misiNomor: r.misi_nomor,
        tujuan: r.tujuan,
        sasaran: r.sasaran,
        indikator: r.indikator,
        satuan: r.satuan,
        targetTahunan: r.target_tahunan || {},
        perangkatDaerahList: r.perangkat_daerah_list || [],
        bidangPengampu: r.bidang_pengampu,
        formula: r.formula,
        penanggungJawab: r.penanggung_jawab,
        keterangan: r.keterangan,
        createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at?.toISOString ? r.updated_at.toISOString() : r.updated_at,
      }));
    } catch (err) {
      console.warn('[PgService] getTujuanSasaranList error:', err);
      return null;
    }
  }

  public async saveTujuanSasaranList(list: any[]): Promise<boolean> {
    if (!this.isConnected || !this.pool || !Array.isArray(list)) return false;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const incomingIds = list.map((ts) => ts.id);
      if (incomingIds.length > 0) {
        await client.query('DELETE FROM tujuan_sasaran WHERE id NOT IN (' + incomingIds.map((_, i) => `$${i + 1}`).join(',') + ')', incomingIds);
      } else {
        await client.query('DELETE FROM tujuan_sasaran');
      }

      for (const ts of list) {
        await client.query(
          `INSERT INTO tujuan_sasaran (
             id, periode_id, visi, misi, misi_nomor, tujuan, sasaran, indikator, satuan,
             target_tahunan, perangkat_daerah_list, bidang_pengampu, formula, penanggung_jawab,
             keterangan, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO UPDATE SET
             periode_id = EXCLUDED.periode_id,
             visi = EXCLUDED.visi,
             misi = EXCLUDED.misi,
             misi_nomor = EXCLUDED.misi_nomor,
             tujuan = EXCLUDED.tujuan,
             sasaran = EXCLUDED.sasaran,
             indikator = EXCLUDED.indikator,
             satuan = EXCLUDED.satuan,
             target_tahunan = EXCLUDED.target_tahunan,
             perangkat_daerah_list = EXCLUDED.perangkat_daerah_list,
             bidang_pengampu = EXCLUDED.bidang_pengampu,
             formula = EXCLUDED.formula,
             penanggung_jawab = EXCLUDED.penanggung_jawab,
             keterangan = EXCLUDED.keterangan,
             updated_at = EXCLUDED.updated_at`,
          [
            ts.id,
            ts.periodeId,
            ts.visi || '',
            ts.misi || '',
            ts.misiNomor || null,
            ts.tujuan || '',
            ts.sasaran || '',
            ts.indikator || '',
            ts.satuan || '',
            JSON.stringify(ts.targetTahunan || {}),
            ts.perangkatDaerahList || [],
            ts.bidangPengampu || null,
            ts.formula || null,
            ts.penanggungJawab || null,
            ts.keterangan || null,
            ts.createdAt || new Date().toISOString(),
            ts.updatedAt || new Date().toISOString(),
          ]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('[PgService] saveTujuanSasaranList error:', err);
      return false;
    } finally {
      client.release();
    }
  }

  // ----------------------- AUDIT LOGS -----------------------
  public async getAuditLogs(): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
      return res.rows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp?.toISOString ? r.timestamp.toISOString() : r.timestamp,
        userId: r.user_id,
        userName: r.user_name,
        userRole: r.user_role,
        category: r.category,
        action: r.action,
        description: r.description,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        deviceInfo: r.device_info,
        status: r.status,
        metadata: r.metadata,
      }));
    } catch (err) {
      console.warn('[PgService] getAuditLogs error:', err);
      return null;
    }
  }

  public async insertAuditLog(entry: any): Promise<boolean> {
    if (!this.isConnected || !this.pool || !entry) return false;
    try {
      await this.pool.query(
        `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, category, action, description, ip_address, user_agent, device_info, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          entry.id,
          entry.timestamp || new Date().toISOString(),
          entry.userId || null,
          entry.userName || 'System',
          entry.userRole || 'user',
          entry.category || 'auth',
          entry.action || 'ACTION',
          entry.description || '',
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.deviceInfo || null,
          entry.status || 'success',
          JSON.stringify(entry.metadata || {}),
        ]
      );
      return true;
    } catch (err) {
      console.warn('[PgService] insertAuditLog error:', err);
      return false;
    }
  }

  public async clearAuditLogs(): Promise<boolean> {
    if (!this.isConnected || !this.pool) return false;
    try {
      await this.pool.query('TRUNCATE TABLE audit_logs');
      return true;
    } catch {
      return false;
    }
  }

  // ----------------------- SETTINGS -----------------------
  public async getSetting<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
      if (res.rows.length > 0) {
        return res.rows[0].value as T;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async saveSetting<T>(key: string, value: T): Promise<boolean> {
    if (!this.isConnected || !this.pool) return false;
    try {
      await this.pool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
      return true;
    } catch {
      return false;
    }
  }

  // ----------------------- AGENDAS -----------------------
  public async getAgendas(startDate?: string, endDate?: string): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      let query = 'SELECT * FROM agendas';
      const params: any[] = [];
      if (startDate && endDate) {
        query += ' WHERE schedule_date >= $1 AND schedule_date <= $2';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' WHERE schedule_date = $1';
        params.push(startDate);
      }
      query += ' ORDER BY schedule_date ASC, time_start ASC';
      const res = await this.pool.query(query, params);
      return res.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        creatorName: r.creator_name,
        title: r.title,
        location: r.location,
        description: r.description || '',
        scheduleDate: typeof r.schedule_date === 'string' ? r.schedule_date.split('T')[0] : r.schedule_date.toISOString().split('T')[0],
        timeStart: r.time_start?.substring(0, 5) || r.time_start,
        timeEnd: r.time_end ? (r.time_end?.substring(0, 5) || r.time_end) : undefined,
        groupJid: r.group_jid || undefined,
        createdAt: r.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: r.updated_at?.toISOString() || undefined,
      }));
    } catch (err: any) {
      console.warn('[PG agendas] Failed to get agendas:', err.message);
      return null;
    }
  }

  public async insertAgenda(agenda: any): Promise<boolean> {
    if (!this.isConnected || !this.pool) return false;
    try {
      await this.pool.query(
        `INSERT INTO agendas (
          id, user_id, creator_name, title, location, description, 
          schedule_date, time_start, time_end, group_jid, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          location = EXCLUDED.location,
          description = EXCLUDED.description,
          schedule_date = EXCLUDED.schedule_date,
          time_start = EXCLUDED.time_start,
          time_end = EXCLUDED.time_end,
          group_jid = EXCLUDED.group_jid,
          updated_at = NOW()`,
        [
          agenda.id,
          agenda.userId || 'user_admin',
          agenda.creatorName || 'Administrator',
          agenda.title,
          agenda.location,
          agenda.description || '',
          agenda.scheduleDate,
          agenda.timeStart,
          agenda.timeEnd || null,
          agenda.groupJid || null,
        ]
      );
      return true;
    } catch (err: any) {
      console.warn('[PG agendas] Insert agenda error:', err.message);
      return false;
    }
  }

  public async updateAgenda(id: string, agenda: any): Promise<boolean> {
    if (!this.isConnected || !this.pool) return false;
    try {
      await this.pool.query(
        `UPDATE agendas SET
          title = COALESCE($2, title),
          location = COALESCE($3, location),
          description = COALESCE($4, description),
          schedule_date = COALESCE($5, schedule_date),
          time_start = COALESCE($6, time_start),
          time_end = $7,
          group_jid = $8,
          updated_at = NOW()
        WHERE id = $1`,
        [
          id,
          agenda.title,
          agenda.location,
          agenda.description,
          agenda.scheduleDate,
          agenda.timeStart,
          agenda.timeEnd || null,
          agenda.groupJid || null,
        ]
      );
      return true;
    } catch (err: any) {
      console.warn('[PG agendas] Update agenda error:', err.message);
      return false;
    }
  }

  public async deleteAgenda(id: string): Promise<boolean> {
    if (!this.isConnected || !this.pool) return false;
    try {
      await this.pool.query('DELETE FROM agendas WHERE id = $1', [id]);
      return true;
    } catch (err: any) {
      console.warn('[PG agendas] Delete agenda error:', err.message);
      return false;
    }
  }

  public async clearAgendas(): Promise<boolean> {
    if (!this.isConnected || !this.pool) return false;
    try {
      await this.pool.query('DELETE FROM agendas');
      return true;
    } catch (err: any) {
      console.warn('[PG agendas] Clear agendas error:', err.message);
      return false;
    }
  }

  // ----------------------- BOT SETTINGS -----------------------
  public async getBotSettings(): Promise<any | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM bot_settings WHERE id = 1');
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          fonnteToken: r.fonnte_token,
          defaultGroupJid: r.default_group_jid,
          isActive: r.is_active,
          updatedAt: r.updated_at?.toISOString() || new Date().toISOString(),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  public async saveBotSettings(settings: any): Promise<boolean> {
    if (!this.isConnected || !this.pool) return false;
    try {
      await this.pool.query(
        `INSERT INTO bot_settings (id, fonnte_token, default_group_jid, is_active, updated_at)
         VALUES (1, $1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET
           fonnte_token = EXCLUDED.fonnte_token,
           default_group_jid = EXCLUDED.default_group_jid,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()`,
        [settings.fonnteToken || '', settings.defaultGroupJid || '', Boolean(settings.isActive)]
      );
      return true;
    } catch (err: any) {
      console.warn('[PG bot_settings] Save error:', err.message);
      return false;
    }
  }

  // ----------------------- REMINDER LOGS -----------------------
  public async getReminderLogs(): Promise<any[] | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM agenda_reminders_log ORDER BY sent_at DESC LIMIT 150');
      return res.rows.map((r) => ({
        id: r.id,
        agendaDate: typeof r.agenda_date === 'string' ? r.agenda_date.split('T')[0] : r.agenda_date.toISOString().split('T')[0],
        reminderType: r.reminder_type,
        groupJid: r.group_jid,
        status: r.status,
        responseMessage: r.response_message,
        pdfFilename: r.pdf_filename,
        sentAt: r.sent_at?.toISOString() || new Date().toISOString(),
      }));
    } catch {
      return null;
    }
  }

  public async insertReminderLog(log: any): Promise<boolean> {
    if (!this.isConnected || !this.pool) return false;
    try {
      await this.pool.query(
        `INSERT INTO agenda_reminders_log (id, agenda_date, reminder_type, group_jid, status, response_message, pdf_filename, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [log.id, log.agendaDate, log.reminderType, log.groupJid, log.status, log.responseMessage || '', log.pdfFilename || '']
      );
      return true;
    } catch {
      return false;
    }
  }
}

export const pgService = new PgDatabaseService();
