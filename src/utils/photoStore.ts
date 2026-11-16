// 獲得プライズ写真のIndexedDB保存ユーティリティ
// localStorageは容量が小さい（5〜10MB程度）ため、画像本体はIndexedDBに保存し、
// プレイ記録（localStorage側）には参照ID（photoId）のみを持たせる。

const DB_NAME = "prizelog-photos";
const STORE_NAME = "photos";
const DB_VERSION = 1;

const MAX_DIMENSION = 900; // 長辺の上限px（容量節約のため縮小）
const JPEG_QUALITY = 0.75;

export class PhotoStoreError extends Error {}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new PhotoStoreError("この端末では画像の保存に対応していません。"));
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
    img.onerror = () => reject(new PhotoStoreError("画像の読み込みに失敗しました。"));
    img.src = src;
  });
}

async function compressImageFile(file: File): Promise<Blob> {
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
    throw new PhotoStoreError("画像の変換に失敗しました。");
  }
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PhotoStoreError("画像の変換に失敗しました。"));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function makePhotoId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function savePhotoFile(file: File): Promise<string> {
  const blob = await compressImageFile(file);
  const id = makePhotoId();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function getPhotoBlob(id: string): Promise<Blob | null> {
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

export async function deletePhoto(id: string): Promise<void> {
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

export async function clearAllPhotos(): Promise<void> {
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
