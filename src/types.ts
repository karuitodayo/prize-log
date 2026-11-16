// PRIZE LOG のデータ型定義

export type YearMonth = string; // "YYYY-MM"
export type DateString = string; // "YYYY-MM-DD"

export interface MonthlyBudget {
  yearMonth: YearMonth;
  amount: number;
}

export type OutingStatus = "active" | "ended";

export interface Outing {
  id: string;
  startedAt: string; // ISO datetime
  endedAt: string | null;
  budget: number;
  memo: string;
  status: OutingStatus;
}

export type PlayResult = "won" | "lost";

export interface PlayRecord {
  id: string;
  outingId: string;
  playDate: DateString;
  storeName: string;
  amount: number;
  result: PlayResult;
  prizeName: string;
  memo: string;
  createdAt: string; // ISO datetime
  photoId: string | null; // IndexedDBに保存した写真の参照ID（未設定はnull）
  storeId: string | null; // 関連付けた訪問店舗の参照ID（未設定はnull。v1.1以前のデータにはこの項目がない）
  machineSpotId: string | null; // 関連付けた筐体スポットの参照ID（未設定はnull。v2以前のデータにはこの項目がない）
}

// 店舗カテゴリー（任意項目）
export type StoreCategory = "arcade" | "gacha" | "other";

export interface StoreLocation {
  id: string; // storeId
  name: string; // 店舗名（必須）
  category: StoreCategory | null; // 任意
  address: string | null; // 任意
  lat: number | null; // 任意（地図上の位置）
  lng: number | null; // 任意（地図上の位置）
  memo: string;
  createdAt: string; // ISO datetime
  indoorMapImageId: string | null; // 店内配置図写真の参照ID（IndexedDB）。未設定はnull
  indoorMapImageUpdatedAt: string | null; // 配置図写真の登録・更新日時。未設定はnull
  indoorMapUrl: string | null; // 公式の店内配置図ページURL。未設定はnull
  indoorMapUrlUpdatedAt: string | null; // 公式URLの登録・更新日時。未設定はnull
  mapUrl: string | null; // 店舗登録時に貼り付けたGoogleマップ等のURL。未設定はnull
}

export interface Visit {
  id: string; // visitId
  storeId: string;
  outingId: string;
  visitDate: DateString;
}

// 筐体の種類
export type MachineType = "crane" | "gacha" | "other";

export interface MachineSpot {
  id: string;
  storeId: string;
  name: string; // スポット名（必須）
  type: MachineType; // 必須
  x: number; // 店内マップ画像内の横位置（0〜100％）
  y: number; // 店内マップ画像内の縦位置（0〜100％）
  memo: string; // 任意
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export const DATA_VERSION = 5;

export interface AppData {
  version: number;
  monthlyBudgets: MonthlyBudget[];
  outings: Outing[];
  playRecords: PlayRecord[];
  stores: StoreLocation[];
  visits: Visit[];
  machineSpots: MachineSpot[];
}

export function createEmptyData(): AppData {
  return {
    version: DATA_VERSION,
    monthlyBudgets: [],
    outings: [],
    playRecords: [],
    stores: [],
    visits: [],
    machineSpots: [],
  };
}
