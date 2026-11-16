import {
  DATA_VERSION,
  createEmptyData,
} from "../types";
import type {
  AppData,
  MachineSpot,
  MonthlyBudget,
  Outing,
  PlayRecord,
  StoreLocation,
  Visit,
} from "../types";

const STORAGE_KEY = "prizelog.data";

export class StorageError extends Error {}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidMonthlyBudget(v: unknown): v is MonthlyBudget {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.yearMonth) &&
    /^\d{4}-\d{2}$/.test(o.yearMonth) &&
    isFiniteNumber(o.amount) &&
    o.amount >= 0
  );
}

function isValidOuting(v: unknown): v is Outing {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.startedAt) &&
    (o.endedAt === null || isNonEmptyString(o.endedAt)) &&
    isFiniteNumber(o.budget) &&
    o.budget >= 0 &&
    typeof o.memo === "string" &&
    (o.status === "active" || o.status === "ended")
  );
}

function isValidPlayRecord(v: unknown): v is PlayRecord {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.outingId) &&
    isNonEmptyString(o.playDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.playDate) &&
    typeof o.storeName === "string" &&
    isFiniteNumber(o.amount) &&
    o.amount >= 1 &&
    (o.result === "won" || o.result === "lost") &&
    typeof o.prizeName === "string" &&
    typeof o.memo === "string" &&
    isNonEmptyString(o.createdAt) &&
    (o.photoId === undefined ||
      o.photoId === null ||
      isNonEmptyString(o.photoId)) &&
    (o.storeId === undefined ||
      o.storeId === null ||
      isNonEmptyString(o.storeId)) &&
    (o.machineSpotId === undefined ||
      o.machineSpotId === null ||
      isNonEmptyString(o.machineSpotId))
  );
}

function isValidStoreCategory(v: unknown): boolean {
  return v === "arcade" || v === "gacha" || v === "other";
}

function isValidStoreLocation(v: unknown): v is StoreLocation {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    typeof o.name === "string" &&
    (o.category === null || isValidStoreCategory(o.category)) &&
    (o.address === null || typeof o.address === "string") &&
    (o.lat === null || isFiniteNumber(o.lat)) &&
    (o.lng === null || isFiniteNumber(o.lng)) &&
    typeof o.memo === "string" &&
    isNonEmptyString(o.createdAt) &&
    (o.indoorMapImageId === undefined ||
      o.indoorMapImageId === null ||
      isNonEmptyString(o.indoorMapImageId)) &&
    (o.indoorMapImageUpdatedAt === undefined ||
      o.indoorMapImageUpdatedAt === null ||
      isNonEmptyString(o.indoorMapImageUpdatedAt)) &&
    // indoorMapUpdatedAt はv1.2以前の旧フィールド名（読み込み時のみ許容し、normalizeDataで移行する）
    (o.indoorMapUpdatedAt === undefined ||
      o.indoorMapUpdatedAt === null ||
      isNonEmptyString(o.indoorMapUpdatedAt)) &&
    (o.indoorMapUrl === undefined ||
      o.indoorMapUrl === null ||
      isNonEmptyString(o.indoorMapUrl)) &&
    (o.indoorMapUrlUpdatedAt === undefined ||
      o.indoorMapUrlUpdatedAt === null ||
      isNonEmptyString(o.indoorMapUrlUpdatedAt)) &&
    (o.mapUrl === undefined || o.mapUrl === null || isNonEmptyString(o.mapUrl))
  );
}

function isValidVisit(v: unknown): v is Visit {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.storeId) &&
    isNonEmptyString(o.outingId) &&
    isNonEmptyString(o.visitDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.visitDate)
  );
}

function isValidMachineType(v: unknown): boolean {
  return v === "crane" || v === "gacha" || v === "other";
}

function isValidMachineSpot(v: unknown): v is MachineSpot {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.storeId) &&
    typeof o.name === "string" &&
    isValidMachineType(o.type) &&
    isFiniteNumber(o.x) &&
    o.x >= 0 &&
    o.x <= 100 &&
    isFiniteNumber(o.y) &&
    o.y >= 0 &&
    o.y <= 100 &&
    typeof o.memo === "string" &&
    isNonEmptyString(o.createdAt) &&
    isNonEmptyString(o.updatedAt)
  );
}

export function validateAppData(v: unknown): v is AppData {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (!isFiniteNumber(o.version)) return false;
  if (!Array.isArray(o.monthlyBudgets)) return false;
  if (!Array.isArray(o.outings)) return false;
  if (!Array.isArray(o.playRecords)) return false;
  if (!o.monthlyBudgets.every(isValidMonthlyBudget)) return false;
  if (!o.outings.every(isValidOuting)) return false;
  if (!o.playRecords.every(isValidPlayRecord)) return false;
  // stores / visits はv1.1以前のデータには存在しないため、無い場合のみ許容する
  if (o.stores !== undefined) {
    if (!Array.isArray(o.stores)) return false;
    if (!o.stores.every(isValidStoreLocation)) return false;
  }
  if (o.visits !== undefined) {
    if (!Array.isArray(o.visits)) return false;
    if (!o.visits.every(isValidVisit)) return false;
  }
  // machineSpots はv2以前のデータには存在しないため、無い場合のみ許容する
  if (o.machineSpots !== undefined) {
    if (!Array.isArray(o.machineSpots)) return false;
    if (!o.machineSpots.every(isValidMachineSpot)) return false;
  }
  return true;
}

// 旧バージョンのデータ（stores/visits/machineSpots/storeId/machineSpotId/
// indoorMapImageId等が存在しない）を現行のデータ構造へ後方互換の形で補完する
function normalizeData(data: AppData): AppData {
  return {
    ...data,
    version: DATA_VERSION,
    stores: (data.stores ?? []).map((s) => {
      // v1.3以前は indoorMapUpdatedAt という名前だったため、新フィールド名へ移行する
      const legacy = s as unknown as { indoorMapUpdatedAt?: string | null };
      return {
        ...s,
        indoorMapImageId: s.indoorMapImageId ?? null,
        indoorMapImageUpdatedAt:
          s.indoorMapImageUpdatedAt ?? legacy.indoorMapUpdatedAt ?? null,
        indoorMapUrl: s.indoorMapUrl ?? null,
        indoorMapUrlUpdatedAt: s.indoorMapUrlUpdatedAt ?? null,
        mapUrl: s.mapUrl ?? null,
      };
    }),
    visits: data.visits ?? [],
    machineSpots: data.machineSpots ?? [],
    playRecords: data.playRecords.map((r) => ({
      ...r,
      photoId: r.photoId ?? null,
      storeId: r.storeId ?? null,
      machineSpotId: r.machineSpotId ?? null,
    })),
  };
}

export function loadAppData(): { data: AppData; error: string | null } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { data: createEmptyData(), error: null };
    }
    const parsed = JSON.parse(raw);
    if (!validateAppData(parsed)) {
      return {
        data: createEmptyData(),
        error:
          "保存データの形式が正しくないため、初期状態で起動しました。",
      };
    }
    return { data: normalizeData(parsed), error: null };
  } catch {
    return {
      data: createEmptyData(),
      error: "保存データの読み込みに失敗したため、初期状態で起動しました。",
    };
  }
}

export function saveAppData(data: AppData): { ok: boolean; error: string | null } {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error:
        "データの保存に失敗しました。ブラウザの空き容量を確認してください。",
    };
  }
}

// バックアップファイルの形式:
// 新形式（画像込み）: { appData: AppData, indoorMapImages?: Record<imageId, dataURL> }
// 旧形式（画像なし。従来のエクスポートとの後方互換）: AppDataそのもの
export interface ImportedBackup {
  data: AppData;
  images: Record<string, string>;
}

const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,/;

export function parseImportedBackup(text: string): ImportedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new StorageError("JSONファイルの形式が正しくありません。");
  }

  let rawData: unknown = parsed;
  let rawImages: unknown;
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "appData" in (parsed as Record<string, unknown>)
  ) {
    const envelope = parsed as Record<string, unknown>;
    rawData = envelope.appData;
    rawImages = envelope.indoorMapImages;
  }

  if (!validateAppData(rawData)) {
    throw new StorageError("データの内容が想定した形式と一致しません。");
  }
  if ((rawData as AppData).version > DATA_VERSION) {
    throw new StorageError(
      "このアプリより新しい形式のバックアップです。アプリを更新してから復元してください。"
    );
  }
  // version が現行より古い場合は normalizeData で新形式へ補完する（後方互換）
  const data = normalizeData(rawData as AppData);

  // 画像は形式が正しいものだけを採用し、不正なエントリがあってもテキストデータの復元は継続する
  const images: Record<string, string> = {};
  if (rawImages !== null && typeof rawImages === "object") {
    for (const [id, value] of Object.entries(rawImages as Record<string, unknown>)) {
      if (typeof value === "string" && DATA_URL_PATTERN.test(value)) {
        images[id] = value;
      }
    }
  }

  return { data, images };
}
