import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageItem, SuratItem, StorageScope, User, IKUItem, PeriodeRPJMD, TujuanSasaranItem } from '../types';
import { StorageService } from '../services/storageService';
import { AuditLogService } from '../services/auditLogService';
import { useAuth } from './AuthContext';

interface StorageContextType {
  items: StorageItem[];
  suratList: SuratItem[];
  ikuList: IKUItem[];
  // Tujuan & Sasaran RPJMD 5 Tahunan
  tujuanSasaranList: TujuanSasaranItem[];
  periodeList: PeriodeRPJMD[];
  activePeriode: PeriodeRPJMD;
  setActivePeriode: (periode: PeriodeRPJMD) => void;
  addTujuanSasaran: (data: Omit<TujuanSasaranItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateTujuanSasaran: (id: string, updates: Partial<TujuanSasaranItem>) => Promise<boolean>;
  deleteTujuanSasaran: (id: string) => Promise<boolean>;
  addPeriode: (data: Omit<PeriodeRPJMD, 'id' | 'createdAt'>) => Promise<boolean>;
  updatePeriode: (id: string, updates: Partial<PeriodeRPJMD>) => Promise<boolean>;
  deletePeriode: (id: string) => Promise<boolean>;
  createFolder: (
    name: string,
    parentId: string | null,
    scope: StorageScope,
    targetOwner?: User,
    bidangCategory?: string
  ) => Promise<{ success: boolean; message?: string }>;
  uploadFiles: (
    files: File[],
    parentId: string | null,
    scope: StorageScope,
    targetOwner?: User,
    bidangCategory?: string
  ) => Promise<{ success: boolean; count: number }>;
  deleteItem: (id: string) => Promise<boolean>;
  renameItem: (id: string, newName: string) => boolean;
  toggleStar: (id: string) => void;
  // Surat operations
  addSurat: (
    data: Omit<SuratItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'creatorName'>,
    file?: File | null
  ) => Promise<boolean>;
  updateSurat: (id: string, updates: Partial<SuratItem>, file?: File | null) => Promise<boolean>;
  deleteSurat: (id: string) => Promise<boolean>;
  // IKU (Indikator Kinerja Utama) operations
  addIKU: (data: Omit<IKUItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateIKU: (id: string, updates: Partial<IKUItem>) => Promise<boolean>;
  deleteIKU: (id: string) => Promise<boolean>;
  updateVisi: (tahun: number, newVisi: string) => Promise<boolean>;
  deleteVisi: (tahun: number) => Promise<boolean>;
  // Quota & counts
  getStorageUsage: (userId?: string) => { usedBytes: number; totalBytes: number; fileCount: number };
  resetAllData: () => void;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<StorageItem[]>(() => StorageService.getItems());
  const [suratList, setSuratList] = useState<SuratItem[]>(() => StorageService.getSuratList());
  const [ikuList, setIKUList] = useState<IKUItem[]>(() => StorageService.getIKUList());
  const [periodeList, setPeriodeList] = useState<PeriodeRPJMD[]>(() => StorageService.getPeriodeList());
  const [activePeriode, setActivePeriode] = useState<PeriodeRPJMD>(() => {
    const list = StorageService.getPeriodeList();
    return list.find((p) => p.isAktif) || list[0];
  });
  const [tujuanSasaranList, setTujuanSasaranList] = useState<TujuanSasaranItem[]>(() =>
    StorageService.getTujuanSasaranList()
  );
  const { currentUser, isAdmin, canModifyBidang } = useAuth();

  // On mount: sync all items, surat, iku from server database
  useEffect(() => {
    let isMounted = true;
    StorageService.syncWithServer().then((synced) => {
      if (isMounted && synced) {
        if (Array.isArray(synced.items)) setItems(synced.items);
        if (Array.isArray(synced.suratList)) setSuratList(synced.suratList);
        if (Array.isArray(synced.ikuList)) setIKUList(synced.ikuList);
        if (Array.isArray(synced.periodeList) && synced.periodeList.length > 0) {
          setPeriodeList(synced.periodeList);
          const active = synced.periodeList.find((p: any) => p.isAktif) || synced.periodeList[0];
          if (active) setActivePeriode(active);
        }
        if (Array.isArray(synced.tujuanSasaranList)) setTujuanSasaranList(synced.tujuanSasaranList);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const isInitialMount = React.useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    StorageService.saveItems(items);
  }, [items]);

  useEffect(() => {
    if (!isInitialMount.current) {
      StorageService.saveSuratList(suratList);
    }
  }, [suratList]);

  useEffect(() => {
    if (!isInitialMount.current) {
      StorageService.saveIKUList(ikuList);
    }
  }, [ikuList]);

  useEffect(() => {
    if (!isInitialMount.current) {
      StorageService.savePeriodeList(periodeList);
    }
  }, [periodeList]);

  useEffect(() => {
    if (!isInitialMount.current) {
      StorageService.saveTujuanSasaranList(tujuanSasaranList);
    }
  }, [tujuanSasaranList]);

  // Create folder
  const createFolder = async (
    name: string,
    parentId: string | null,
    scope: StorageScope,
    targetOwner?: User,
    bidangCategory?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: 'Nama folder tidak boleh kosong.' };
    }

    if (!currentUser) {
      return { success: false, message: 'Harap login terlebih dahulu.' };
    }

    // Role verification
    if (scope === 'bidang' && !canModifyBidang) {
      return { success: false, message: 'User bidang hanya memiliki akses baca dan unduh.' };
    }

    if (scope === 'public' && currentUser.role === 'bidang') {
      return { success: false, message: 'User bidang tidak diizinkan mengakses folder publik.' };
    }

    const owner = targetOwner && isAdmin ? targetOwner : currentUser;

    const newFolder: StorageItem = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      type: 'folder',
      size: 0,
      parentId,
      scope,
      ownerId: owner.id,
      ownerName: owner.name,
      ownerEmail: owner.email,
      bidangCategory: bidangCategory || (scope === 'bidang' ? 'Bidang PME' : undefined),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => [newFolder, ...prev]);

    if (currentUser) {
      AuditLogService.logFile({
        action: 'FOLDER_CREATE',
        user: currentUser,
        fileName: newFolder.name,
        scope,
        status: 'success',
      });
    }

    return { success: true };
  };

  // Upload files
  const uploadFiles = async (
    files: File[],
    parentId: string | null,
    scope: StorageScope,
    targetOwner?: User,
    bidangCategory?: string
  ): Promise<{ success: boolean; count: number }> => {
    if (!currentUser || files.length === 0) {
      return { success: false, count: 0 };
    }

    if (scope === 'bidang' && !canModifyBidang) {
      return { success: false, count: 0 };
    }

    const owner = targetOwner && isAdmin ? targetOwner : currentUser;

    const MAX_LIMIT = 500 * 1024 * 1024;
    const validFiles = files.filter((f) => f.size <= MAX_LIMIT);
    if (validFiles.length === 0) {
      return { success: false, count: 0 };
    }

    const readAsDataURL = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        if (file.size <= 50 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        } else {
          resolve('');
        }
      });
    };

    (window as any).__EPMPED_IS_UPLOADING__ = true;
    try {
      const newItems: StorageItem[] = [];

      for (const file of validFiles) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let dataUrl = '';
        try {
          dataUrl = await readAsDataURL(file);
        } catch (err) {
          console.error('Error reading file', err);
        }

        const item: StorageItem = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: 'file',
          extension: ext,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          parentId,
          scope,
          ownerId: owner.id,
          ownerName: owner.name,
          ownerEmail: owner.email,
          bidangCategory: bidangCategory || (scope === 'bidang' ? 'Bidang PME' : undefined),
          dataUrl: dataUrl || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newItems.push(item);
      }

      setItems((prev) => [...newItems, ...prev]);

      if (currentUser) {
        newItems.forEach((item) => {
          AuditLogService.logFile({
            action: 'FILE_UPLOAD',
            user: currentUser,
            fileName: item.name,
            scope: item.scope,
            fileSize: item.size,
            status: 'success',
          });
        });
      }

      return { success: true, count: newItems.length };
    } finally {
      (window as any).__EPMPED_IS_UPLOADING__ = false;
    }
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    if (!currentUser) return false;

    const targetItem = items.find((i) => i.id === id);

    // Find all item IDs to delete (recursively if folder)
    const toDeleteIds = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const item of items) {
        if (item.parentId && toDeleteIds.has(item.parentId) && !toDeleteIds.has(item.id)) {
          toDeleteIds.add(item.id);
          added = true;
        }
      }
    }

    setItems((prev) => prev.filter((item) => !toDeleteIds.has(item.id)));

    if (currentUser && targetItem) {
      AuditLogService.logFile({
        action: 'FILE_DELETE',
        user: currentUser,
        fileName: targetItem.name,
        scope: targetItem.scope,
        status: 'warning',
      });
    }

    return true;
  };

  const renameItem = (id: string, newName: string): boolean => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, name: trimmed, updatedAt: new Date().toISOString() } : item
      )
    );
    return true;
  };

  const toggleStar = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    );
  };

  // Surat Operations
  const addSurat = async (
    data: Omit<SuratItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'creatorName'>,
    file?: File | null
  ): Promise<boolean> => {
    if (!currentUser) return false;

    let fileUrl: string | undefined = undefined;
    let fileName = data.fileName;
    let fileSize = data.fileSize;
    let fileExtension = data.fileExtension;

    if (file) {
      fileName = file.name;
      fileSize = file.size;
      fileExtension = file.name.split('.').pop()?.toLowerCase();
      try {
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } catch {
        fileUrl = undefined;
      }
    }

    const newSurat: SuratItem = {
      ...data,
      id: `surat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fileName,
      fileSize,
      fileExtension,
      fileUrl,
      createdBy: currentUser.id,
      creatorName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextSuratList = [newSurat, ...suratList];
    setSuratList(nextSuratList);

    AuditLogService.logSurat({
      action: 'SURAT_INPUT',
      user: currentUser,
      nomorSurat: newSurat.nomorSurat,
      perihal: newSurat.perihal,
      status: 'success',
    });

    return true;
  };

  const updateSurat = async (
    id: string,
    updates: Partial<SuratItem>,
    file?: File | null
  ): Promise<boolean> => {
    let fileUrl = updates.fileUrl;
    let fileName = updates.fileName;
    let fileSize = updates.fileSize;
    let fileExtension = updates.fileExtension;

    if (file) {
      fileName = file.name;
      fileSize = file.size;
      fileExtension = file.name.split('.').pop()?.toLowerCase();
      try {
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } catch {
        fileUrl = undefined;
      }
    }

    const nextSuratList = suratList.map((s) => {
      if (s.id !== id) return s;
      return {
        ...s,
        ...updates,
        ...(file ? { fileName, fileSize, fileExtension, fileUrl } : {}),
        updatedAt: new Date().toISOString(),
      };
    });

    setSuratList(nextSuratList);

    if (currentUser) {
      const targetSurat = suratList.find((s) => s.id === id);
      AuditLogService.logSurat({
        action: 'SURAT_UPDATE',
        user: currentUser,
        nomorSurat: targetSurat?.nomorSurat,
        perihal: targetSurat?.perihal,
        status: 'success',
      });
    }

    return true;
  };

  const deleteSurat = async (id: string): Promise<boolean> => {
    const targetSurat = suratList.find((s) => s.id === id);
    const nextSuratList = suratList.filter((s) => s.id !== id);
    setSuratList(nextSuratList);

    if (currentUser && targetSurat) {
      AuditLogService.logSurat({
        action: 'SURAT_DELETE',
        user: currentUser,
        nomorSurat: targetSurat.nomorSurat,
        perihal: targetSurat.perihal,
        status: 'warning',
      });
    }

    return true;
  };

  const getStorageUsage = (userId?: string) => {
    let relevantItems = items;
    if (userId) {
      relevantItems = items.filter((item) => item.ownerId === userId && item.scope === 'private');
    }
    const usedBytes = relevantItems
      .filter((i) => i.type === 'file')
      .reduce((acc, curr) => acc + (curr.size || 0), 0);

    const totalBytes = 500 * 1024 * 1024 * 1024; // 500 GB default storage quota
    const fileCount = relevantItems.filter((i) => i.type === 'file').length;

    return { 
      usedBytes, 
      totalBytes, 
      fileCount
    };
  };

  const addIKU = async (data: Omit<IKUItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    const newItem: IKUItem = {
      ...data,
      id: `iku_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setIKUList((prev) => [newItem, ...prev]);
    return true;
  };

  const updateIKU = async (id: string, updates: Partial<IKUItem>): Promise<boolean> => {
    setIKUList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      )
    );
    return true;
  };

  const deleteIKU = async (id: string): Promise<boolean> => {
    setIKUList((prev) => prev.filter((item) => item.id !== id));
    return true;
  };

  const updateVisi = async (tahun: number, newVisi: string): Promise<boolean> => {
    setIKUList((prev) =>
      prev.map((item) =>
        item.tahun === tahun ? { ...item, visi: newVisi, updatedAt: new Date().toISOString() } : item
      )
    );
    return true;
  };

  const deleteVisi = async (tahun: number): Promise<boolean> => {
    setIKUList((prev) =>
      prev.map((item) =>
        item.tahun === tahun ? { ...item, visi: 'Belum Ditentukan (Visi Dihapus)', updatedAt: new Date().toISOString() } : item
      )
    );
    return true;
  };

  // Tujuan & Sasaran CRUD
  const addTujuanSasaran = async (
    data: Omit<TujuanSasaranItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> => {
    const newItem: TujuanSasaranItem = {
      ...data,
      id: `ts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTujuanSasaranList((prev) => [newItem, ...prev]);
    return true;
  };

  const updateTujuanSasaran = async (
    id: string,
    updates: Partial<TujuanSasaranItem>
  ): Promise<boolean> => {
    setTujuanSasaranList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      )
    );
    return true;
  };

  const deleteTujuanSasaran = async (id: string): Promise<boolean> => {
    setTujuanSasaranList((prev) => prev.filter((item) => item.id !== id));
    return true;
  };

  // Periode RPJMD CRUD
  const addPeriode = async (data: Omit<PeriodeRPJMD, 'id' | 'createdAt'>): Promise<boolean> => {
    const newPeriode: PeriodeRPJMD = {
      ...data,
      id: `periode_${data.tahunMulai}_${data.tahunSelesai}_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    if (newPeriode.isAktif) {
      setPeriodeList((prev) => [newPeriode, ...prev.map((p) => ({ ...p, isAktif: false }))]);
      setActivePeriode(newPeriode);
    } else {
      setPeriodeList((prev) => [newPeriode, ...prev]);
    }
    return true;
  };

  const updatePeriode = async (id: string, updates: Partial<PeriodeRPJMD>): Promise<boolean> => {
    setPeriodeList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          if (activePeriode.id === id) setActivePeriode(updated);
          return updated;
        }
        if (updates.isAktif) {
          return { ...p, isAktif: false };
        }
        return p;
      })
    );
    return true;
  };

  const deletePeriode = async (id: string): Promise<boolean> => {
    if (periodeList.length <= 1) {
      throw new Error('Minimal harus ada satu periode RPJMD dalam sistem.');
    }
    const remaining = periodeList.filter((p) => p.id !== id);
    setPeriodeList(remaining);
    if (activePeriode.id === id) {
      setActivePeriode(remaining[0]);
    }
    return true;
  };

  const resetAllData = () => {
    StorageService.resetToDefault();
    setItems(StorageService.getItems());
    setSuratList(StorageService.getSuratList());
    setIKUList(StorageService.getIKUList());
    const restoredPeriodes = StorageService.getPeriodeList();
    setPeriodeList(restoredPeriodes);
    setTujuanSasaranList(StorageService.getTujuanSasaranList());
    setActivePeriode(restoredPeriodes.find((p) => p.isAktif) || restoredPeriodes[0]);
  };

  return (
    <StorageContext.Provider
      value={{
        items,
        suratList,
        ikuList,
        tujuanSasaranList,
        periodeList,
        activePeriode,
        setActivePeriode,
        addTujuanSasaran,
        updateTujuanSasaran,
        deleteTujuanSasaran,
        addPeriode,
        updatePeriode,
        deletePeriode,
        createFolder,
        uploadFiles,
        deleteItem,
        renameItem,
        toggleStar,
        addSurat,
        updateSurat,
        deleteSurat,
        addIKU,
        updateIKU,
        deleteIKU,
        updateVisi,
        deleteVisi,
        getStorageUsage,
        resetAllData,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}
