// 店内マップ画像のIndexedDB保存ユーティリティ
// プライズ写真（photoStore.ts）とは別のデータベースに分離し、
// 既存の写真保存処理に影響を与えないようにしている。
// localStorage側（StoreLocation）には参照ID（indoorMapImageId）のみを持たせる。

const DB_NAME = "prizelog-indoor-maps";
const STORE_NAME = "maps";
const DB_VERSION = 1;

const MAX_DIMENSION = 1600; // 長辺の上限px（文字やレイアウトの判読性を優先）
const JPEG_QUALITY = 0.85;
const MAX_BLOB_BYTES = 5 * 1024 * 1024; // 圧縮後も万一大きい場合の安全弁
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export class IndoorMapStoreError extends Error {}

export function isAcceptedIndoorMapFile(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(
        new IndoorMapStoreError("この端末では画像の保存に対応していません。")
      );
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new IndoorMapStoreError("画像の読み込みに失敗しました。"));
    img.src = src;
  });
}

async function compressIndoorMapFile(file: File): Promise<Blob> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(dataUrl);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new IndoorMapStoreError("画像の変換に失敗しました。");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new IndoorMapStoreError("画像の変換に失敗しました。"));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  if (blob.size > MAX_BLOB_BYTES) {
    throw new IndoorMapStoreError(
      "画像の容量が大きすぎるため保存できませんでした。別の画像をお試しください。"
    );
  }
  return blob;
}

function makeIndoorMapId(): string {
  return `indoor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveIndoorMapImage(file: File): Promise<string> {
  if (!isAcceptedIndoorMapFile(file)) {
    throw new IndoorMapStoreError(
      "JPEG・PNG・WebP形式の画像を選択してください。"
    );
  }
  const blob = await compressIndoorMapFile(file);
  const id = makeIndoorMapId();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function getIndoorMapBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteIndoorMapImage(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 削除失敗は致命的ではないため無視する（容量を多少消費するだけ）
  }
}

export async function clearAllIndoorMaps(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

// JSONバックアップへの画像埋め込み用：Blob ⇔ data URL 変換
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

// バックアップ復元時：採番済みのID（元のindoorMapImageIdと同じ値）でそのまま書き戻す
export async function putIndoorMapImageBlob(
  id: string,
  blob: Blob
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
