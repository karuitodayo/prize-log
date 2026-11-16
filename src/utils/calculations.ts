import type {
  AppData,
  MachineSpot,
  Outing,
  PlayRecord,
  StoreLocation,
  YearMonth,
} from "../types";

export function getYearMonth(dateStr: string): YearMonth {
  return dateStr.slice(0, 7);
}

export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentYearMonth(): YearMonth {
  return todayDateString().slice(0, 7);
}

export function getActiveOuting(data: AppData): Outing | null {
  return data.outings.find((o) => o.status === "active") ?? null;
}

export function getMonthlyBudgetAmount(
  data: AppData,
  yearMonth: YearMonth
): number | null {
  const b = data.monthlyBudgets.find((b) => b.yearMonth === yearMonth);
  return b ? b.amount : null;
}

export function getMonthlySpent(data: AppData, yearMonth: YearMonth): number {
  return data.playRecords
    .filter((r) => getYearMonth(r.playDate) === yearMonth)
    .reduce((sum, r) => sum + r.amount, 0);
}

export function getMonthlyPrizeCount(
  data: AppData,
  yearMonth: YearMonth
): number {
  return data.playRecords.filter(
    (r) => getYearMonth(r.playDate) === yearMonth && r.result === "won"
  ).length;
}

export function getOutingSpent(data: AppData, outingId: string): number {
  return data.playRecords
    .filter((r) => r.outingId === outingId)
    .reduce((sum, r) => sum + r.amount, 0);
}

export function getOutingPrizeCount(data: AppData, outingId: string): number {
  return data.playRecords.filter(
    (r) => r.outingId === outingId && r.result === "won"
  ).length;
}

export function getOutingRecords(
  data: AppData,
  outingId: string
): PlayRecord[] {
  return data.playRecords
    .filter((r) => r.outingId === outingId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type BudgetLevel = "normal" | "warning" | "over";

export function getBudgetLevel(spent: number, budget: number): BudgetLevel {
  if (budget <= 0) return spent > 0 ? "over" : "normal";
  const rate = spent / budget;
  if (rate >= 1) return "over";
  if (rate >= 0.8) return "warning";
  return "normal";
}

export function getUsageRate(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 1 : 0;
  return Math.min(spent / budget, 1);
}

// 店舗ごとの訪問回数（同じおでかけでの重複登録はVisit作成時点で防いでいるため単純集計でよい）
export function getStoreVisitCount(data: AppData, storeId: string): number {
  return data.visits.filter((v) => v.storeId === storeId).length;
}

export function getStoreLastVisitDate(
  data: AppData,
  storeId: string
): string | null {
  const dates = data.visits
    .filter((v) => v.storeId === storeId)
    .map((v) => v.visitDate);
  if (dates.length === 0) return null;
  return dates.reduce((latest, d) => (d > latest ? d : latest));
}

export function getStoreSpent(data: AppData, storeId: string): number {
  return data.playRecords
    .filter((r) => r.storeId === storeId)
    .reduce((sum, r) => sum + r.amount, 0);
}

export function getStorePrizeCount(data: AppData, storeId: string): number {
  return data.playRecords.filter(
    (r) => r.storeId === storeId && r.result === "won"
  ).length;
}

export function getStoreRecords(data: AppData, storeId: string): PlayRecord[] {
  return data.playRecords
    .filter((r) => r.storeId === storeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface StoreWithStats {
  store: StoreLocation;
  visitCount: number;
  lastVisitDate: string | null;
  spent: number;
  prizeCount: number;
}

export function getStoresWithStats(data: AppData): StoreWithStats[] {
  return data.stores.map((store) => ({
    store,
    visitCount: getStoreVisitCount(data, store.id),
    lastVisitDate: getStoreLastVisitDate(data, store.id),
    spent: getStoreSpent(data, store.id),
    prizeCount: getStorePrizeCount(data, store.id),
  }));
}

export function getMachineSpotsForStore(
  data: AppData,
  storeId: string
): MachineSpot[] {
  return data.machineSpots
    .filter((s) => s.storeId === storeId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getSpotRecords(data: AppData, spotId: string): PlayRecord[] {
  return data.playRecords
    .filter((r) => r.machineSpotId === spotId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// 将来的な集計拡張（累計使用金額・獲得数・最終プレイ日）に備えた土台。
// 現時点ではスポット詳細画面で必須ではないため、必要になった時点で利用する。
export interface MachineSpotStats {
  spot: MachineSpot;
  spent: number;
  prizeCount: number;
  lastPlayDate: string | null;
}

export function getMachineSpotStats(
  data: AppData,
  spotId: string
): MachineSpotStats | null {
  const spot = data.machineSpots.find((s) => s.id === spotId);
  if (!spot) return null;
  const records = getSpotRecords(data, spotId);
  const spent = records.reduce((sum, r) => sum + r.amount, 0);
  const prizeCount = records.filter((r) => r.result === "won").length;
  const lastPlayDate =
    records.length > 0
      ? records.map((r) => r.playDate).reduce((a, b) => (b > a ? b : a))
      : null;
  return { spot, spent, prizeCount, lastPlayDate };
}

export function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export function formatYearMonthLabel(yearMonth: YearMonth): string {
  const [, m] = yearMonth.split("-");
  return `${parseInt(m, 10)}月`;
}
