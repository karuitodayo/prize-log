// Googleマップを外部で開くためのURL生成ユーティリティ
// APIキー不要・無料で使える検索リンク形式のみを使用する

export type StoreSearchCategory = "arcade" | "gacha" | "keyword";

export function buildCategoryQuery(
  category: StoreSearchCategory,
  keyword: string
): string {
  if (category === "arcade") return "ゲームセンター";
  if (category === "gacha") return "ガチャガチャ カプセルトイ";
  return keyword.trim();
}

export function buildGoogleMapsSearchUrl(
  query: string,
  near: { lat: number; lng: number } | null
): string {
  const q = encodeURIComponent(query);
  if (near) {
    // near指定時はGoogleマップの座標付き検索URL形式を使う（APIキー不要）
    return `https://www.google.com/maps/search/${q}/@${near.lat},${near.lng},14z`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function buildGoogleMapsPlaceUrl(place: {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  mapUrl?: string | null;
}): string {
  // 登録時に貼り付けられたURLがあれば、生成したクエリより優先してそのまま開く
  if (place.mapUrl) return place.mapUrl;
  if (place.lat !== null && place.lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  }
  const q = encodeURIComponent(place.address || place.name);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// GoogleマップのURLに緯度経度が埋め込まれている場合は、それを抽出する
// （短縮URL=maps.app.goo.gl等はリダイレクト解決が必要なため非対応。その場合はnullを返す）
export function extractLatLngFromMapUrl(
  url: string
): { lat: number; lng: number } | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const clamp = (lat: number, lng: number) =>
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
      ? { lat, lng }
      : null;

  // 例: /maps/@35.6895,139.6917,15z や /maps/place/.../@35.6895,139.6917,17z/...
  const atMatch = parsed.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return clamp(parseFloat(atMatch[1]), parseFloat(atMatch[2]));
  }

  // 例: ?q=35.6895,139.6917 / ?query=35.6895,139.6917 / ?ll=35.6895,139.6917
  for (const key of ["q", "query", "ll"]) {
    const value = parsed.searchParams.get(key);
    if (!value) continue;
    const m = value.match(/^(-?\d+\.\d+),(-?\d+\.\d+)$/);
    if (m) return clamp(parseFloat(m[1]), parseFloat(m[2]));
  }

  return null;
}

export function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
