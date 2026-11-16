import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  AppData,
  MachineSpot,
  MachineType,
  Outing,
  PlayRecord,
  StoreCategory,
  StoreLocation,
  Visit,
  YearMonth,
} from "../types";
import { createEmptyData } from "../types";
import { loadAppData, saveAppData } from "../utils/storage";
import { getActiveOuting, todayDateString } from "../utils/calculations";
import { clearAllPhotos, deletePhoto } from "../utils/photoStore";
import { clearAllIndoorMaps, deleteIndoorMapImage } from "../utils/indoorMapStore";

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface NewPlayRecordInput {
  playDate: string;
  storeName: string;
  amount: number;
  result: "won" | "lost";
  prizeName: string;
  memo: string;
  photoId: string | null;
  storeId: string | null;
  machineSpotId: string | null;
}

export interface NewStoreInput {
  name: string;
  category: StoreCategory | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  memo: string;
  mapUrl: string | null;
}

export interface NewMachineSpotInput {
  name: string;
  type: MachineType;
  x: number;
  y: number;
  memo: string;
}

export interface MachineSpotEditInput {
  name: string;
  type: MachineType;
  memo: string;
}

// 同じおでかけで同じ店舗の訪問を重複登録しないようにする
function ensureVisit(
  prev: AppData,
  storeId: string,
  outingId: string,
  visitDate: string
): AppData {
  const exists = prev.visits.some(
    (v) => v.storeId === storeId && v.outingId === outingId
  );
  if (exists) return prev;
  const visit: Visit = { id: makeId(), storeId, outingId, visitDate };
  return { ...prev, visits: [...prev.visits, visit] };
}

interface AppContextValue {
  data: AppData;
  notice: string | null;
  clearNotice: () => void;
  activeOuting: Outing | null;
  setMonthlyBudget: (yearMonth: YearMonth, amount: number) => void;
  startOuting: (budget: number, memo: string) => void;
  endOuting: () => void;
  addPlayRecord: (input: NewPlayRecordInput) => void;
  updatePlayRecord: (id: string, input: NewPlayRecordInput) => void;
  deletePlayRecord: (id: string) => void;
  addStore: (input: NewStoreInput) => string;
  updateStore: (id: string, input: NewStoreInput) => void;
  deleteStore: (id: string) => void;
  setStoreIndoorMapImage: (storeId: string, imageId: string | null) => void;
  setStoreIndoorMapUrl: (storeId: string, url: string | null) => void;
  addMachineSpot: (storeId: string, input: NewMachineSpotInput) => string;
  updateMachineSpot: (id: string, input: MachineSpotEditInput) => void;
  moveMachineSpot: (id: string, x: number, y: number) => void;
  deleteMachineSpot: (id: string) => void;
  replaceAllData: (newData: AppData) => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadAppData());
  const [data, setData] = useState<AppData>(initial.current.data);
  const [notice, setNotice] = useState<string | null>(initial.current.error);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const result = saveAppData(data);
    if (!result.ok && result.error) {
      setNotice(result.error);
    }
  }, [data]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const setMonthlyBudget = useCallback((yearMonth: YearMonth, amount: number) => {
    setData((prev) => {
      const others = prev.monthlyBudgets.filter(
        (b) => b.yearMonth !== yearMonth
      );
      return {
        ...prev,
        monthlyBudgets: [...others, { yearMonth, amount }],
      };
    });
  }, []);

  const startOuting = useCallback((budget: number, memo: string) => {
    setData((prev) => {
      if (getActiveOuting(prev)) return prev;
      const newOuting: Outing = {
        id: makeId(),
        startedAt: new Date().toISOString(),
        endedAt: null,
        budget,
        memo,
        status: "active",
      };
      return { ...prev, outings: [...prev.outings, newOuting] };
    });
  }, []);

  const endOuting = useCallback(() => {
    setData((prev) => {
      const active = getActiveOuting(prev);
      if (!active) return prev;
      return {
        ...prev,
        outings: prev.outings.map((o) =>
          o.id === active.id
            ? { ...o, status: "ended", endedAt: new Date().toISOString() }
            : o
        ),
      };
    });
  }, []);

  const addPlayRecord = useCallback((input: NewPlayRecordInput) => {
    setData((prev) => {
      const active = getActiveOuting(prev);
      if (!active) return prev;
      const playDate = input.playDate || todayDateString();
      const record: PlayRecord = {
        id: makeId(),
        outingId: active.id,
        playDate,
        storeName: input.storeName.trim(),
        amount: input.amount,
        result: input.result,
        prizeName: input.prizeName.trim(),
        memo: input.memo.trim(),
        createdAt: new Date().toISOString(),
        photoId: input.photoId,
        storeId: input.storeId,
        machineSpotId: input.machineSpotId,
      };
      let next: AppData = { ...prev, playRecords: [...prev.playRecords, record] };
      if (input.storeId) {
        next = ensureVisit(next, input.storeId, active.id, playDate);
      }
      return next;
    });
  }, []);

  const updatePlayRecord = useCallback(
    (id: string, input: NewPlayRecordInput) => {
      setData((prev) => {
        const target = prev.playRecords.find((r) => r.id === id);
        let next: AppData = {
          ...prev,
          playRecords: prev.playRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  playDate: input.playDate,
                  storeName: input.storeName.trim(),
                  amount: input.amount,
                  result: input.result,
                  prizeName: input.prizeName.trim(),
                  memo: input.memo.trim(),
                  photoId: input.photoId,
                  storeId: input.storeId,
                  machineSpotId: input.machineSpotId,
                }
              : r
          ),
        };
        if (input.storeId && target) {
          next = ensureVisit(next, input.storeId, target.outingId, input.playDate);
        }
        return next;
      });
    },
    []
  );

  const deletePlayRecord = useCallback((id: string) => {
    setData((prev) => {
      const target = prev.playRecords.find((r) => r.id === id);
      if (target?.photoId) {
        void deletePhoto(target.photoId);
      }
      return {
        ...prev,
        playRecords: prev.playRecords.filter((r) => r.id !== id),
      };
    });
  }, []);

  const addStore = useCallback((input: NewStoreInput): string => {
    const id = makeId();
    const store: StoreLocation = {
      id,
      name: input.name.trim(),
      category: input.category,
      address: input.address ? input.address.trim() : null,
      lat: input.lat,
      lng: input.lng,
      memo: input.memo.trim(),
      createdAt: new Date().toISOString(),
      indoorMapImageId: null,
      indoorMapImageUpdatedAt: null,
      indoorMapUrl: null,
      indoorMapUrlUpdatedAt: null,
      mapUrl: input.mapUrl,
    };
    setData((prev) => ({ ...prev, stores: [...prev.stores, store] }));
    return id;
  }, []);

  const updateStore = useCallback((id: string, input: NewStoreInput) => {
    setData((prev) => ({
      ...prev,
      stores: prev.stores.map((s) =>
        s.id === id
          ? {
              ...s,
              name: input.name.trim(),
              category: input.category,
              address: input.address ? input.address.trim() : null,
              lat: input.lat,
              lng: input.lng,
              memo: input.memo.trim(),
              mapUrl: input.mapUrl,
            }
          : s
      ),
    }));
  }, []);

  const deleteStore = useCallback((id: string) => {
    setData((prev) => {
      const target = prev.stores.find((s) => s.id === id);
      if (target?.indoorMapImageId) {
        void deleteIndoorMapImage(target.indoorMapImageId);
      }
      const removedSpotIds = new Set(
        prev.machineSpots.filter((s) => s.storeId === id).map((s) => s.id)
      );
      return {
        ...prev,
        stores: prev.stores.filter((s) => s.id !== id),
        visits: prev.visits.filter((v) => v.storeId !== id),
        machineSpots: prev.machineSpots.filter((s) => s.storeId !== id),
        playRecords: prev.playRecords.map((r) => {
          if (r.storeId !== id) return r;
          return {
            ...r,
            storeId: null,
            machineSpotId:
              r.machineSpotId && removedSpotIds.has(r.machineSpotId)
                ? null
                : r.machineSpotId,
          };
        }),
      };
    });
  }, []);

  const setStoreIndoorMapImage = useCallback(
    (storeId: string, imageId: string | null) => {
      setData((prev) => ({
        ...prev,
        stores: prev.stores.map((s) =>
          s.id === storeId
            ? {
                ...s,
                indoorMapImageId: imageId,
                indoorMapImageUpdatedAt: new Date().toISOString(),
              }
            : s
        ),
      }));
    },
    []
  );

  const setStoreIndoorMapUrl = useCallback(
    (storeId: string, url: string | null) => {
      setData((prev) => ({
        ...prev,
        stores: prev.stores.map((s) =>
          s.id === storeId
            ? {
                ...s,
                indoorMapUrl: url,
                indoorMapUrlUpdatedAt: new Date().toISOString(),
              }
            : s
        ),
      }));
    },
    []
  );

  const addMachineSpot = useCallback(
    (storeId: string, input: NewMachineSpotInput): string => {
      const id = makeId();
      const now = new Date().toISOString();
      const spot: MachineSpot = {
        id,
        storeId,
        name: input.name.trim(),
        type: input.type,
        x: input.x,
        y: input.y,
        memo: input.memo.trim(),
        createdAt: now,
        updatedAt: now,
      };
      setData((prev) => ({ ...prev, machineSpots: [...prev.machineSpots, spot] }));
      return id;
    },
    []
  );

  const updateMachineSpot = useCallback(
    (id: string, input: MachineSpotEditInput) => {
      setData((prev) => ({
        ...prev,
        machineSpots: prev.machineSpots.map((s) =>
          s.id === id
            ? {
                ...s,
                name: input.name.trim(),
                type: input.type,
                memo: input.memo.trim(),
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
      }));
    },
    []
  );

  const moveMachineSpot = useCallback((id: string, x: number, y: number) => {
    setData((prev) => ({
      ...prev,
      machineSpots: prev.machineSpots.map((s) =>
        s.id === id ? { ...s, x, y, updatedAt: new Date().toISOString() } : s
      ),
    }));
  }, []);

  const deleteMachineSpot = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      machineSpots: prev.machineSpots.filter((s) => s.id !== id),
      playRecords: prev.playRecords.map((r) =>
        r.machineSpotId === id ? { ...r, machineSpotId: null } : r
      ),
    }));
  }, []);

  const replaceAllData = useCallback((newData: AppData) => {
    setData(newData);
  }, []);

  const resetAllData = useCallback(() => {
    void clearAllPhotos();
    void clearAllIndoorMaps();
    setData(createEmptyData());
  }, []);

  const value: AppContextValue = {
    data,
    notice,
    clearNotice,
    activeOuting: getActiveOuting(data),
    setMonthlyBudget,
    startOuting,
    endOuting,
    addPlayRecord,
    updatePlayRecord,
    deletePlayRecord,
    addStore,
    updateStore,
    deleteStore,
    setStoreIndoorMapImage,
    setStoreIndoorMapUrl,
    addMachineSpot,
    updateMachineSpot,
    moveMachineSpot,
    deleteMachineSpot,
    replaceAllData,
    resetAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
