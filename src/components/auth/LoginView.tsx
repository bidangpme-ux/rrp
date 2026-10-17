import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BapperidaLogo } from '../common/BapperidaLogo';
import { 
  Eye, 
  EyeOff, 
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Smartphone
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionExpiredType, setSessionExpiredType] = useState<string | null>(() => {
    return localStorage.getItem('epmped_session_expired');
  });
  const [kickedDevice, setKickedDevice] = useState<string>(() => {
    return localStorage.getItem('epmped_kicked_device') || 'Perangkat Baru';
  });
  const [kickedTime, setKickedTime] = useState<string>(() => {
    const raw = localStorage.getItem('epmped_kicked_time');
    if (!raw) return '';
    try {
      return new Date(raw).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    } catch {
      return '';
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!emailInput.trim()) {
      setErrorMsg('Silakan masukkan username atau alamat email akun Anda.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await login(emailInput.trim(), passwordInput);
      if (!res.success) {
        setErrorMsg(res.message || 'Login gagal. Periksa kembali username/email dan password Anda.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan saat mencoba masuk. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f6f8fb] text-slate-800 flex items-stretch font-sans overflow-hidden select-none">
      {/* ================= LEFT COLUMN: LOGIN CARD (EXACTLY AS IN SCREENSHOT) ================= */}
      <div className="w-full lg:w-[45%] xl:w-[42%] min-h-screen bg-white/90 backdrop-blur-xl border-r border-slate-100 flex flex-col justify-between p-6 sm:p-10 md:p-14 z-20 shadow-xl lg:shadow-none">
        {/* Top Header Label */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold tracking-wider text-[11px] uppercase text-slate-400">
            E-PMPED Bapperida Tanggamus
          </span>
        </div>

        {/* Center Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-6">
          {/* Logo BAPPERIDA KABUPATEN TANGGAMUS (Official Logo) */}
          <div className="flex justify-center mb-5">
            <BapperidaLogo size="xl" allowCustomUpload className="w-48 h-48 drop-shadow-sm hover:scale-105 transition-transform duration-300" />
          </div>

          {/* Heading */}
          <h1 className="text-center text-2xl font-bold text-slate-800 tracking-tight mb-6">
            Login
          </h1>

          {/* Alert 1: Concurrent Login Kickout (Perangkat Lain) */}
          {sessionExpiredType === 'concurrent_login' && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300/80 text-rose-950 text-xs shadow-md shadow-rose-900/5 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <p className="font-extrabold text-rose-950 text-xs">
                      Sesi Di-Logout (Login di Perangkat Lain)
                    </p>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                      1 Akun = 1 Perangkat
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 mt-1.5 leading-relaxed">
                    Akun Anda baru saja digunakan untuk masuk pada perangkat:
                  </p>
                  <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-white/90 border border-rose-200 text-[11px] font-semibold text-rose-900 flex items-center justify-between shadow-2xs">
                    <span className="flex items-center gap-1.5 truncate">
                      <Smartphone className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{kickedDevice}</span>
                    </span>
                    {kickedTime && (
                      <span className="font-mono text-[10px] text-rose-600 font-bold shrink-0 ml-2">
                        {kickedTime}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-rose-700/90 mt-1.5 leading-relaxed">
                    Demi keamanan data instansi BAPPERIDA, akun tidak diizinkan aktif bersamaan di perangkat berbeda. Sesi pada perangkat ini telah ditutup secara otomatis. Silakan masuk kembali jika ingin memindahkan kendali ke perangkat ini.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Alert 2: Inactivity Timeout (15 Menit) */}
          {sessionExpiredType === 'timeout' && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs animate-in fade-in">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Sesi Berakhir (Inaktivitas 15 Menit)</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas selama 15 menit demi keamanan sistem. Silakan login kembali untuk melanjutkan.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= LOGIN FORM ================= */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Field 1: Username / Email */}
            <div className="relative">
              <div className="flex items-center w-full bg-[#f2f3ee] border border-slate-200/80 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#5c46e2] focus-within:bg-white transition-all">
                <span className="text-xs font-medium text-slate-500 w-28 shrink-0">User / Email</span>
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Masukkan user / email"
                  required
                  autoComplete="username"
                  spellCheck={false}
                  data-lpignore="true"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Field 2: Password (Protected & Anti-Inspect) */}
            <div className="relative">
              <div className="flex items-center justify-between w-full bg-[#f2f3ee] border border-slate-200/80 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#5c46e2] focus-within:bg-white transition-all">
                <span className="text-xs font-medium text-slate-500 w-28 shrink-0">Password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  autoComplete="current-password"
                  spellCheck={false}
                  data-lpignore="true"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 shrink-0 cursor-pointer"
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? (
                    <Eye className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox: Keep me logged in */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="keepLoggedIn"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#5c46e2] accent-[#5c46e2] focus:ring-[#5c46e2] cursor-pointer"
              />
              <label
                htmlFor="keepLoggedIn"
                className="text-xs text-slate-700 font-medium cursor-pointer"
              >
                Keep me logged in
              </label>
            </div>

            {/* Submit Button: Solid Purple/Violet (as in screenshot) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#5c46e2] hover:bg-[#4d38d0] active:scale-[0.99] disabled:opacity-75 disabled:cursor-wait text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-[#5c46e2]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'Memeriksa Kredensial...' : 'Login'}</span>
            </button>

            {/* Security Assurance Indicator */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Kode akses &amp; data terproteksi dengan enkripsi dan anti-inspeksi</span>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 pt-4">
          <span>Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah (BAPPERIDA)</span>
          <span className="block text-[10px] text-slate-400/80 mt-0.5">Kabupaten Tanggamus · Provinsi Lampung</span>
        </div>
      </div>

      {/* ================= RIGHT COLUMN: ARTWORK & GREETING HERO (EXACTLY AS IN SCREENSHOT) ================= */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#eef2f6] items-center justify-center p-12 overflow-hidden">
        {/* Subtle background glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-rose-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-64 h-64 bg-purple-200/30 rounded-full blur-2xl pointer-events-none" />

        {/* Floating Geometric Colorful Shapes Exactly Matching Screenshot */}

        {/* 1. Top-Left: Soft Lavender/Purple Circle */}
        <div 
          className="absolute top-[-20px] left-[30px] w-40 h-40 rounded-full bg-[#9f8ae5]/70 pointer-events-none transition-transform duration-700 hover:scale-105"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(159, 138, 229, 0.2))' }}
        />

        {/* 2. Top-Center: Warm Orange Half-Circle / Oval */}
        <div 
          className="absolute top-[-30px] left-[35%] w-64 h-36 rounded-b-full bg-[#f87853] pointer-events-none"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(248, 120, 83, 0.25))' }}
        />

        {/* 3. Top-Right: Magenta/Purple Arc / Circle */}
        <div 
          className="absolute top-[40px] right-[-20px] w-44 h-44 rounded-full bg-[#d78fe9] pointer-events-none"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(215, 143, 233, 0.25))' }}
        />

        {/* 4. Center-Left: Coral Red Angled Oval / Teardrop */}
        <div 
          className="absolute top-[38%] left-[20%] w-36 h-20 bg-[#eb5461] rounded-t-full rounded-b-3xl rotate-[-28deg] pointer-events-none"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(235, 84, 97, 0.25))' }}
        />

        {/* 5. Bottom-Left: Bold Crimson / Coral Rounded Triangle Pebble */}
        <div 
          className="absolute bottom-[-10px] left-[0px] w-48 h-56 bg-[#eb3d4d] rounded-3xl rotate-[12deg] pointer-events-none"
          style={{ filter: 'drop-shadow(0 15px 30px rgba(235, 61, 77, 0.3))' }}
        />

        {/* 6. Bottom-Center: Bright Sky Blue Semi-Circle */}
        <div 
          className="absolute bottom-[40px] left-[28%] w-48 h-28 rounded-b-full bg-[#56a1f0] pointer-events-none"
          style={{ filter: 'drop-shadow(0 10px 25px rgba(86, 161, 240, 0.3))' }}
        />

        {/* 7. Bottom-Right: Soft Purple Rounded Triangular Blob */}
        <div 
          className="absolute bottom-[60px] right-[40px] w-44 h-44 bg-[#9b88dc] rounded-3xl rotate-[-24deg] pointer-events-none"
          style={{ filter: 'drop-shadow(0 15px 30px rgba(155, 136, 220, 0.25))' }}
        />

        {/* Soft Glass Decorative Blur Bubble */}
        <div className="absolute top-[28%] left-[2%] w-28 h-28 bg-white/30 backdrop-blur-md rounded-full border border-white/40 pointer-events-none" />
        <div className="absolute bottom-[24%] left-[45%] w-32 h-32 bg-white/20 backdrop-blur-lg rounded-full pointer-events-none" />

        {/* Central Prominent Text Headline */}
        <div className="relative z-10 text-center max-w-xl px-4 animate-in fade-in duration-700">
          <h2 className="text-3xl sm:text-4xl lg:text-[32px] font-bold tracking-tight leading-tight">
            <span className="text-[#8f2830] block">
              Selamat Datang di E-PMPED
            </span>
            <span className="text-[#15233e] block mt-1">
              Bapperida Tanggamus
            </span>
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-medium">
            Sistem Elektronik Bidang Perencanaan Makro Pengendalian dan Evaluasi Pembangunan Daerah
          </p>
        </div>
      </div>
    </div>
  );
};
