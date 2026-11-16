import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, X } from "lucide-react";
import { Button } from "./Button";
import type { StoreCategory, StoreLocation } from "../types";
import { pickerPinIcon } from "../utils/mapIcon";
import { isValidHttpUrl } from "./OfficialMapUrlForm";
import { extractLatLngFromMapUrl } from "../utils/googleMaps";
import "./StoreForm.css";

export interface StoreFormValues {
  name: string;
  category: StoreCategory | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  memo: string;
  mapUrl: string | null;
}

interface StoreFormProps {
  initial?: StoreLocation;
  title: string;
  onSubmit: (values: StoreFormValues) => void;
  onCancel: () => void;
}

const DEFAULT_CENTER: [number, number] = [35.681236, 139.767125]; // 東京駅付近（初期表示用の既定値）

const CATEGORY_OPTIONS: { value: StoreCategory | ""; label: string }[] = [
  { value: "", label: "未設定" },
  { value: "arcade", label: "ゲームセンター" },
  { value: "gacha", label: "ガチャガチャ・カプセルトイ" },
  { value: "other", label: "その他" },
];

export function StoreForm({
  initial,
  title,
  onSubmit,
  onCancel,
}: StoreFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<StoreCategory | "">(
    initial?.category ?? ""
  );
  const [address, setAddress] = useState(initial?.address ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initial?.lat !== undefined &&
      initial?.lat !== null &&
      initial?.lng !== undefined &&
      initial?.lng !== null
      ? { lat: initial.lat, lng: initial.lng }
      : null
  );
  const [touched, setTouched] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapUrlInput, setMapUrlInput] = useState(initial?.mapUrl ?? "");
  const [mapUrlNotice, setMapUrlNotice] = useState<string | null>(null);

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // 地図上にピンを置く/動かす共通処理。タップ・現在地・URLからの自動設定のいずれからも呼ぶ
  const placeMarkerOn = (map: L.Map, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: pickerPinIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current?.getLatLng();
        if (ll) setPosition({ lat: ll.lat, lng: ll.lng });
      });
    }
    setPosition({ lat, lng });
  };

  useEffect(() => {
    if (!mapElRef.current) return;
    try {
      const center = position
        ? [position.lat, position.lng]
        : DEFAULT_CENTER;
      const map = L.map(mapElRef.current, {
        center: center as [number, number],
        zoom: position ? 15 : 12,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      if (position) {
        placeMarkerOn(map, position.lat, position.lng);
      }

      map.on("click", (e: L.LeafletMouseEvent) => {
        placeMarkerOn(map, e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    } catch {
      setMapError(true);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseCurrentLocation = () => {
    setLocateError(null);
    if (!("geolocation" in navigator)) {
      setLocateError("この端末では位置情報を利用できません。");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
          placeMarkerOn(mapRef.current, latitude, longitude);
        } else {
          setPosition({ lat: latitude, lng: longitude });
        }
      },
      () => {
        setLocating(false);
        setLocateError(
          "現在地を取得できませんでした。位置情報の利用を許可しているか確認してください。"
        );
      }
    );
  };

  const handleMapUrlBlur = () => {
    const trimmed = mapUrlInput.trim();
    if (!trimmed) {
      setMapUrlNotice(null);
      return;
    }
    if (!isValidHttpUrl(trimmed)) {
      setMapUrlNotice(
        "http:// または https:// から始まる正しいURLを入力してください。"
      );
      return;
    }
    const coords = extractLatLngFromMapUrl(trimmed);
    if (coords) {
      if (mapRef.current) {
        mapRef.current.setView([coords.lat, coords.lng], 16);
        placeMarkerOn(mapRef.current, coords.lat, coords.lng);
      } else {
        setPosition(coords);
      }
      setMapUrlNotice(
        "URLから位置を自動的に設定しました。ピンをドラッグして微調整もできます。"
      );
    } else {
      setMapUrlNotice(
        "このURL形式からは位置を自動取得できませんでした（短縮URLなど）。必要であれば地図をタップして設定してください。"
      );
    }
  };

  const handleClearPosition = () => {
    setPosition(null);
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  };

  const nameValid = name.trim().length > 0;
  const mapUrlTrimmed = mapUrlInput.trim();
  const mapUrlValid = !mapUrlTrimmed || isValidHttpUrl(mapUrlTrimmed);

  const handleSubmit = () => {
    setTouched(true);
    if (!nameValid || !mapUrlValid) return;
    onSubmit({
      name: name.trim(),
      category: category === "" ? null : category,
      address: address.trim() ? address.trim() : null,
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
      memo: memo.trim(),
      mapUrl: mapUrlTrimmed || null,
    });
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box form-box" onClick={(e) => e.stopPropagation()}>
        <div className="form-box-header">
          <h3 className="dialog-title">{title}</h3>
          <button className="notice-close" onClick={onCancel} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="form-box-body">
          <div className="field-group">
            <label className="field-label">店舗名（必須）</label>
            <input
              type="text"
              className="text-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：〇〇ゲームセンター"
            />
            {touched && !nameValid && (
              <p className="text-danger" style={{ fontSize: 12 }}>
                店舗名を入力してください。
              </p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">店舗の種類（任意）</label>
            <select
              className="select-field"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as StoreCategory | "")
              }
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">住所（任意）</label>
            <input
              type="text"
              className="text-field"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例：東京都千代田区〇〇1-1"
            />
          </div>

          <div className="field-group">
            <label className="field-label">GoogleマップのURL（任意）</label>
            <input
              type="url"
              className="text-field"
              value={mapUrlInput}
              onChange={(e) => {
                setMapUrlInput(e.target.value);
                setMapUrlNotice(null);
              }}
              onBlur={handleMapUrlBlur}
              placeholder="https://maps.google.com/..."
              autoCapitalize="off"
              autoCorrect="off"
            />
            <p className="text-sub" style={{ marginTop: 6 }}>
              店舗の場所のGoogleマップURLを貼り付けると、位置が自動的に設定されます（地図をタップしてピンを置く必要はありません）。
            </p>
            {touched && !mapUrlValid && (
              <p className="text-danger" style={{ fontSize: 12 }}>
                http:// または https:// から始まる正しいURLを入力してください。
              </p>
            )}
            {mapUrlNotice && (
              <p className="text-accent" style={{ fontSize: 12 }}>
                {mapUrlNotice}
              </p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">地図上の位置（任意）</label>
            <p className="text-sub" style={{ marginTop: -4, marginBottom: 4 }}>
              URLから自動設定されなかった場合は、地図をタップするか、ピンをドラッグして位置を指定することもできます。
            </p>
            {mapError ? (
              <p className="text-danger" style={{ fontSize: 13 }}>
                地図の読み込みに失敗しました。位置情報なしでも登録できます。
              </p>
            ) : (
              <div ref={mapElRef} className="store-form-map" />
            )}
            <div className="store-form-map-actions">
              <button
                type="button"
                className="icon-btn"
                onClick={handleUseCurrentLocation}
                disabled={locating}
              >
                <Crosshair size={16} />
                {locating ? "取得中..." : "現在地を使う"}
              </button>
              {position && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleClearPosition}
                >
                  位置をクリア
                </button>
              )}
            </div>
            {position ? (
              <p className="text-sub" style={{ marginTop: 6 }}>
                緯度 {position.lat.toFixed(5)} / 経度 {position.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-sub" style={{ marginTop: 6 }}>
                位置は未設定です。
              </p>
            )}
            {locateError && (
              <p className="text-danger" style={{ fontSize: 12 }}>
                {locateError}
              </p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">メモ（任意）</label>
            <textarea
              className="textarea-field"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            キャンセル
          </Button>
          <Button fullWidth onClick={handleSubmit}>
            保存する
          </Button>
        </div>
      </div>
    </div>
  );
}
