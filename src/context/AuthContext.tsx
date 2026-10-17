import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { StorageService, getUserAccountFolder } from '../services/storageService';
import { AuditLogService } from '../services/auditLogService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (identifier: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  loginAs: (user: User) => void;
  logout: () => void;
  register: (name: string, email: string, role: UserRole, department: string) => Promise<{ success: boolean; message?: string }>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  addUser: (userData: {
    name: string;
    email: string;
    username?: string;
    password?: string;
    role: UserRole;
    department?: string;
  }) => Promise<{ success: boolean; message?: string; user?: User }>;
  editUser: (
    userId: string,
    updates: Partial<{
      name: string;
      email: string;
      username?: string;
      password?: string;
      role: UserRole;
      department?: string;
      canManageIKU?: boolean;
    }>
  ) => Promise<{ success: boolean; message?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
  isAdmin: boolean;
  isStandardUser: boolean;
  isBidang: boolean;
  canAccessPublic: boolean;
  canAccessSurat: boolean;
  canModifyBidang: boolean;
  canEditProfile: boolean;
  canManageIKU: boolean;
  setUserIKUAccess: (userId: string, allowed: boolean) => void;
  updateOwnProfile: (updates: {
    name?: string;
    email?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
    department?: string;
  }) => Promise<{ success: boolean; message?: string }>;
}

// =========================================================================
//        DEVICE DETECTION & SINGLE ACTIVE SESSION HELPERS
// =========================================================================

function getClientDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Perangkat Web';
  const ua = navigator.userAgent;
  let os = 'Desktop PC';
  if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac';
  else if (/Android/i.test(ua)) os = 'Perangkat Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iPhone / iPad';
  else if (/Linux/i.test(ua)) os = 'Linux PC';

  let browser = 'Browser Web';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua)) browser = 'Apple Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  return `${browser} (${os})`;
}

function getClientDeviceId(): string {
  if (typeof window === 'undefined') return 'dev_default';
  let deviceId = localStorage.getItem('epmped_device_id');
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('epmped_device_id', deviceId);
  }
  return deviceId;
}

function generateNewSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function registerSessionOnServer(user: User, sessionId: string) {
  try {
    const deviceId = getClientDeviceId();
    const deviceName = getClientDeviceLabel();
    await fetch('/api/auth/session/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        department: user.department,
        sessionId,
        deviceId,
        deviceName,
      }),
    });
  } catch (err) {
    console.warn('[Session] Gagal registrasi sesi ke server:', err);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const isInitialMount = React.useRef(true);

  // On mount: sync all data from server database and register active session
  useEffect(() => {
    let isMounted = true;
    StorageService.syncWithServer().then((synced) => {
      if (isMounted && synced && Array.isArray(synced.users)) {
        setUsers(synced.users);
        const savedCurrent = StorageService.getCurrentUser();
        if (savedCurrent) {
          const fresh = synced.users.find((u: User) => u.id === savedCurrent.id);
          if (fresh) {
            setCurrentUser(fresh);
            StorageService.setCurrentUser(fresh);
            
            // Ensure session is registered with server
            let sessId = localStorage.getItem('epmped_session_id');
            if (!sessId) {
              sessId = generateNewSessionId();
              localStorage.setItem('epmped_session_id', sessId);
            }
            registerSessionOnServer(fresh, sessId);
          }
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    StorageService.saveUsers(users);
  }, [users]);

  useEffect(() => {
    StorageService.setCurrentUser(currentUser);
  }, [currentUser]);

  // =========================================================================
  //   SINGLE ACTIVE DEVICE CHECK: 1 AKUN HANYA BISA DIAKSES DI 1 PERANGKAT
  //   Jika akun dibuka di perangkat lain, sesi di perangkat ini otomatis keluar
  // =========================================================================
  useEffect(() => {
    if (!currentUser) return;

    let sessId = localStorage.getItem('epmped_session_id');
    if (!sessId) {
      sessId = generateNewSessionId();
      localStorage.setItem('epmped_session_id', sessId);
      registerSessionOnServer(currentUser, sessId);
    }

    const checkConcurrentSession = async () => {
      const activeSessId = localStorage.getItem('epmped_session_id');
      if (!activeSessId) return;

      try {
        const res = await fetch('/api/auth/session/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            sessionId: activeSessId,
          }),
        });

        if (!res.ok) return;
        const data = await res.json();

        if (data && data.valid === false) {
          if (data.reason === 'concurrent_login') {
            // TERDETEKSI LOGIN DI PERANGKAT LAIN -> KELUARKAN OTOMATIS!
            const kickedBy = data.kickedByDevice || 'Perangkat Baru';
            const kickedAt = data.kickedAt || new Date().toISOString();

            localStorage.setItem('epmped_session_expired', 'concurrent_login');
            localStorage.setItem('epmped_kicked_device', kickedBy);
            localStorage.setItem('epmped_kicked_time', kickedAt);
            localStorage.removeItem('epmped_session_id');

            AuditLogService.logAuth({
              action: 'AUTO_LOGOUT_CONCURRENT_SESSION',
              user: currentUser,
              description: `Sesi akun "${currentUser.name}" (${currentUser.role.toUpperCase()}) otomatis di-logout karena akun telah digunakan untuk masuk pada perangkat lain (${kickedBy}).`,
              status: 'warning',
            });

            // Hapus sesi lokal seketika
            setCurrentUser(null);
            StorageService.setCurrentUser(null);
          } else if (data.reason === 'no_active_session') {
            // Jika server baru restart, daftarkan ulang sesi saat ini
            registerSessionOnServer(currentUser, activeSessId);
          }
        }
      } catch {
        // Abaikan gangguan koneksi jaringan sementara
      }
    };

    // Polling setiap 2.5 detik untuk deteksi kilat pergantian perangkat
    const heartbeatTimer = window.setInterval(checkConcurrentSession, 2500);

    // Cek langsung seketika tab/jendela dibuka kembali
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkConcurrentSession();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [currentUser]);

  // =========================================================================
  //        AUTO-LOGOUT 15 MENIT INACTIVITY (TIDAK ADA AKTIVITAS)
  // =========================================================================
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit

  useEffect(() => {
    if (!currentUser) return;

    // Initialize / refresh last active timestamp
    const now = Date.now();
    localStorage.setItem('epmped_last_active', String(now));

    let lastThrottle = now;
    const recordActivity = () => {
      const current = Date.now();
      if (current - lastThrottle > 4000) {
        lastThrottle = current;
        localStorage.setItem('epmped_last_active', String(current));
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click', 'pointerdown'];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    const checkTimeout = () => {
      // PERLINDUNGAN PROSES UNGGAH:
      // Jika sedang ada proses upload berkas yang berjalan, jangan pernah logout otomatis!
      const isUploading = Boolean((window as any).__EPMPED_IS_UPLOADING__);
      if (isUploading) {
        localStorage.setItem('epmped_last_active', String(Date.now()));
        return;
      }

      const lastActiveStr = localStorage.getItem('epmped_last_active');
      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : Date.now();
      const elapsed = Date.now() - lastActive;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        localStorage.setItem('epmped_session_expired', 'timeout');
        AuditLogService.logAuth({
          action: 'AUTO_LOGOUT_TIMEOUT',
          user: currentUser,
          description: `Sesi login pengguna "${currentUser.name}" (${currentUser.role.toUpperCase()}) otomatis keluar (logout) karena tidak ada aktivitas selama 15 menit.`,
          status: 'warning',
        });
        setCurrentUser(null);
        StorageService.setCurrentUser(null);
      }
    };

    // Periodic check every 5 seconds
    const intervalId = window.setInterval(checkTimeout, 5000);

    // Immediate check on tab focus or visibility change
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [currentUser]);

  const login = async (identifier: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    const trimmed = identifier.trim().toLowerCase();
    let activeUsers = users;
    let found = activeUsers.find((u) => {
      const emailMatch = u.email.toLowerCase() === trimmed;
      const usernameMatch = u.username && u.username.toLowerCase() === trimmed;
      const adminAlias = trimmed === 'admin' && (u.role === 'admin' || u.id === 'user_admin');
      return emailMatch || usernameMatch || adminAlias;
    });

    // If not found in current memory (e.g. freshly created user on another device or incognito mode), fetch fresh users from server immediately!
    if (!found) {
      try {
        const freshUsers = await StorageService.fetchUsersFromServer();
        if (Array.isArray(freshUsers) && freshUsers.length > 0) {
          activeUsers = freshUsers;
          setUsers(freshUsers);
          found = activeUsers.find((u) => {
            const emailMatch = u.email.toLowerCase() === trimmed;
            const usernameMatch = u.username && u.username.toLowerCase() === trimmed;
            const adminAlias = trimmed === 'admin' && (u.role === 'admin' || u.id === 'user_admin');
            return emailMatch || usernameMatch || adminAlias;
          });
        }
      } catch (err) {
        console.warn('Gagal memuat pengguna dari server saat login:', err);
      }
    }

    if (!found) {
      AuditLogService.logAuth({
        action: 'LOGIN_FAILED',
        attemptName: identifier,
        description: `Percobaan login gagal: Identitas akun "${identifier}" tidak ditemukan dalam sistem.`,
        status: 'danger',
        metadata: { identifier },
      });
      return {
        success: false,
        message: 'Akun dengan username atau email tersebut tidak ditemukan. Silakan periksa kembali kredensial Anda.',
      };
    }

    if (found.password && password !== undefined) {
      if (found.password !== password) {
        AuditLogService.logAuth({
          action: 'LOGIN_FAILED',
          user: found,
          description: `Percobaan login gagal untuk akun "${found.name}": Kata sandi salah.`,
          status: 'danger',
          metadata: { username: found.username || found.email },
        });
        return {
          success: false,
          message: 'Kata sandi tidak sesuai. Silakan gunakan password yang benar.',
        };
      }
    }

    // Buat ID sesi baru khusus untuk perangkat ini (menggantikan & me-logout perangkat sebelumnya)
    const newSessionId = generateNewSessionId();
    localStorage.setItem('epmped_session_id', newSessionId);
    localStorage.removeItem('epmped_session_expired');
    localStorage.removeItem('epmped_kicked_device');
    localStorage.removeItem('epmped_kicked_time');
    localStorage.setItem('epmped_last_active', String(Date.now()));

    setCurrentUser(found);
    await registerSessionOnServer(found, newSessionId);

    AuditLogService.logAuth({
      action: 'LOGIN_SUCCESS',
      user: found,
      description: `Pengguna "${found.name}" (${found.role.toUpperCase()}) berhasil login ke sistem pada ${getClientDeviceLabel()}.`,
      status: 'success',
      metadata: { device: getClientDeviceLabel(), sessionId: newSessionId },
    });
    return { success: true };
  };

  const loginAs = (user: User) => {
    const newSessionId = generateNewSessionId();
    localStorage.setItem('epmped_session_id', newSessionId);
    localStorage.removeItem('epmped_session_expired');
    localStorage.removeItem('epmped_kicked_device');
    localStorage.removeItem('epmped_kicked_time');
    localStorage.setItem('epmped_last_active', String(Date.now()));

    // Refresh user state from users list in case role changed
    const freshUser = users.find((u) => u.id === user.id) || user;
    setCurrentUser(freshUser);
    registerSessionOnServer(freshUser, newSessionId);

    AuditLogService.logAuth({
      action: 'LOGIN_SUCCESS',
      user: freshUser,
      description: `Beralih sesi login sebagai "${freshUser.name}" pada ${getClientDeviceLabel()}.`,
      status: 'success',
      metadata: { device: getClientDeviceLabel(), sessionId: newSessionId },
    });
  };

  const logout = () => {
    const activeSessId = localStorage.getItem('epmped_session_id');
    if (currentUser && activeSessId) {
      fetch('/api/auth/session/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, sessionId: activeSessId }),
      }).catch(() => {});
    }

    localStorage.removeItem('epmped_session_id');
    localStorage.removeItem('epmped_session_expired');
    localStorage.removeItem('epmped_kicked_device');
    localStorage.removeItem('epmped_kicked_time');
    localStorage.removeItem('epmped_last_active');

    if (currentUser) {
      AuditLogService.logAuth({
        action: 'LOGOUT',
        user: currentUser,
        description: `Pengguna "${currentUser.name}" keluar (logout) dari sistem.`,
        status: 'success',
      });
    }
    setCurrentUser(null);
    StorageService.setCurrentUser(null);
  };

  const register = async (
    name: string,
    email: string,
    role: UserRole,
    department: string
  ): Promise<{ success: boolean; message?: string }> => {
    return await addUser({ name, email, role, department });
  };

  const addUser = async (userData: {
    name: string;
    email: string;
    username?: string;
    password?: string;
    role: UserRole;
    department?: string;
  }): Promise<{ success: boolean; message?: string; user?: User }> => {
    const trimmedEmail = userData.email.trim().toLowerCase();
    const cleanUsername = userData.username ? userData.username.trim().replace(/^@+/, '').toLowerCase() : '';

    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, message: 'Email sudah terdaftar dalam sistem.' };
    }

    if (cleanUsername && users.some((u) => u.username && u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: 'Username sudah digunakan oleh akun lain.' };
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: userData.name.trim(),
      email: trimmedEmail,
      username: cleanUsername || undefined,
      password: userData.password?.trim() || '123456',
      role: userData.role,
      department: (userData.department || 'Umum').trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    setUsers(updated);
    await StorageService.saveUsers(updated);

    if (currentUser) {
      AuditLogService.logAdmin({
        action: 'USER_ADD',
        adminUser: currentUser,
        targetUserName: newUser.name,
        description: `Menambahkan akun pengguna baru "${newUser.name}" dengan role ${newUser.role.toUpperCase()} (Unit: ${newUser.department}).`,
        status: 'success',
      });
    }

    return { success: true, message: 'Pengguna berhasil ditambahkan.', user: newUser };
  };

  const editUser = async (
    userId: string,
    updates: Partial<{
      name: string;
      email: string;
      username?: string;
      password?: string;
      role: UserRole;
      department?: string;
      canManageIKU?: boolean;
    }>
  ): Promise<{ success: boolean; message?: string }> => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    if (updates.email) {
      const emailLower = updates.email.trim().toLowerCase();
      if (users.some((u) => u.id !== userId && u.email.toLowerCase() === emailLower)) {
        return { success: false, message: 'Email sudah digunakan oleh akun lain.' };
      }
    }

    if (updates.username) {
      const unameLower = updates.username.trim().toLowerCase();
      if (users.some((u) => u.id !== userId && u.username && u.username.toLowerCase() === unameLower)) {
        return { success: false, message: 'Username sudah digunakan oleh akun lain.' };
      }
    }

    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          ...(updates.name !== undefined && { name: updates.name.trim() }),
          ...(updates.email !== undefined && { email: updates.email.trim().toLowerCase() }),
          ...(updates.username !== undefined && { username: updates.username.trim().toLowerCase() }),
          ...(updates.password !== undefined && { password: updates.password.trim() }),
          ...(updates.role !== undefined && { role: updates.role }),
          ...(updates.department !== undefined && { department: updates.department.trim() }),
          ...(updates.canManageIKU !== undefined && { canManageIKU: updates.canManageIKU }),
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    await StorageService.saveUsers(updatedUsers);

    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = updatedUsers.find((u) => u.id === userId);
      if (updatedCurrent) {
        setCurrentUser(updatedCurrent);
        StorageService.setCurrentUser(updatedCurrent);
      }
    }

    if (currentUser) {
      AuditLogService.logAdmin({
        action: 'USER_EDIT',
        adminUser: currentUser,
        targetUserName: target.name,
        description: `Memperbarui data akun "${target.name}"${updates.password ? ' (Termasuk pembaruan kata sandi)' : ''}.`,
        status: 'success',
      });
    }

    return { success: true, message: 'Data pengguna berhasil diperbarui.' };
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    if (currentUser && currentUser.id === userId) {
      return { success: false, message: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.' };
    }

    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    // Check if trying to delete the only admin
    if (target.role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, message: 'Sistem harus memiliki minimal satu akun Administrator.' };
      }
    }

    const filtered = users.filter((u) => u.id !== userId);
    setUsers(filtered);
    await StorageService.saveUsers(filtered);

    if (currentUser) {
      AuditLogService.logAdmin({
        action: 'USER_DELETE',
        adminUser: currentUser,
        targetUserName: target.name,
        description: `Menghapus akun pengguna "${target.name}" (${target.role.toUpperCase()}) dari sistem.`,
        status: 'warning',
      });
    }

    return { success: true, message: `Akun ${target.name} berhasil dihapus dari sistem.` };
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    await editUser(userId, { role: newRole });
  };

  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isStandardUser = role === 'user';
  const isBidang = role === 'bidang';

  // Rule constraints:
  // - "folder publik yang bisa di akeses oleh semua user kecuali user bidang"
  const canAccessPublic = isAdmin || isStandardUser;

  // - "menu manajemen surat hanya bisa di akses admin dan user tapi user bidang tidak bisa mengaksesnya"
  const canAccessSurat = isAdmin || isStandardUser;

  // - "user bidang hanya bisa melihat menu bidang dan hanya memiliki wewenang melihat dan download tidak bisa upload hapus ataupun edit yang bisa upload hapus edit hanya user dan admin"
  const canModifyBidang = isAdmin || isStandardUser;

  // "atur agar setiap user bisa merubah profil akun dan password akun kecuali akun bidang."
  const canEditProfile = currentUser?.role !== 'bidang';

  const updateOwnProfile = async (updates: {
    name?: string;
    email?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
    department?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harap login terlebih dahulu.' };
    }

    if (currentUser.role === 'bidang') {
      return {
        success: false,
        message: 'Akun Bidang memiliki otorisasi terbatas (Read-Only) dan tidak diizinkan mengubah profil akun maupun kata sandi.',
      };
    }

    if (updates.newPassword) {
      if (currentUser.password && updates.currentPassword !== undefined && updates.currentPassword !== '') {
        if (currentUser.password !== updates.currentPassword) {
          return { success: false, message: 'Kata sandi saat ini tidak cocok. Silakan periksa kembali.' };
        }
      }
    }

    return await editUser(currentUser.id, {
      name: updates.name,
      email: updates.email,
      username: updates.username,
      password: updates.newPassword || undefined,
      department: updates.department,
    });
  };

  // "admin bisa menunjuk hak akses siapa user yang bisa edit atau input menu iku"
  const canManageIKU = isAdmin || Boolean(currentUser?.canManageIKU);

  const setUserIKUAccess = (userId: string, allowed: boolean) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, canManageIKU: allowed } : u));
    setUsers(updated);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, canManageIKU: allowed });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        loginAs,
        logout,
        register,
        updateUserRole,
        addUser,
        editUser,
        deleteUser,
        isAdmin,
        isStandardUser,
        isBidang,
        canAccessPublic,
        canAccessSurat,
        canModifyBidang,
        canEditProfile,
        canManageIKU,
        setUserIKUAccess,
        updateOwnProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
