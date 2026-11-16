import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ChevronRight,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Trophy,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StoreForm } from "../components/StoreForm";
import type { StoreFormValues } from "../components/StoreForm";
import { StoreDetailView } from "../components/StoreDetailView";
import { IndoorMapView } from "../components/IndoorMapView";
import type { StoreLocation } from "../types";
import { formatYen, getStoresWithStats } from "../utils/calculations";
import type { StoreWithStats } from "../utils/calculations";
import { storePinIcon } from "../utils/mapIcon";
import {
  buildCategoryQuery,
  buildGoogleMapsPlaceUrl,
  buildGoogleMapsSearchUrl,
  openExternal,
} from "../utils/googleMaps";
import type { StoreSearchCategory } from "../utils/googleMaps";
import "./Map.css";

type MapSubTab = "search" | "visited";
type VisitedView = "list" | "detail" | "indoor";

const DEFAULT_CENTER: [number, number] = [35.681236, 139.767125];

const CATEGORY_LABEL: Record<string, string> = {
  arcade: "ゲームセンター",
  gacha: "ガチャガチャ・カプセルトイ",
  other: "その他",
};

export function MapPage() {
  const { data, addStore, updateStore, deleteStore } = useApp();
  const [subTab, setSubTab] = useState<MapSubTab>("search");
  const [visitedView, setVisitedView] = useState<VisitedView>("list");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const handleSelectTab = (tab: MapSubTab) => {
    setSubTab(tab);
    setVisitedView("list");
    setSelectedStoreId(null);
  };

  return (
    <div>
      {visitedView === "list" && (
        <>
          <p className="page-title">マップ</p>
          <div className="tab-row">
            <button
              className={`tab-btn${subTab === "search" ? " tab-btn-active" : ""}`}
              onClick={() => handleSelectTab("search")}
            >
              <Search size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              お店を探す
            </button>
            <button
              className={`tab-btn${subTab === "visited" ? " tab-btn-active" : ""}`}
              onClick={() => handleSelectTab("visited")}
            >
              行ったお店
            </button>
          </div>
        </>
      )}

      <div style={{ display: subTab === "search" && visitedView === "list" ? "block" : "none" }}>
        <StoreSearchPanel />
      </div>
      <div style={{ display: subTab === "visited" ? "block" : "none" }}>
        {visitedView === "list" && (
          <VisitedStoresPanel
            active={subTab === "visited"}
            data={data}
            addStore={addStore}
            updateStore={updateStore}
            deleteStore={deleteStore}
            onOpenDetail={(storeId) => {
              setSelectedStoreId(storeId);
              setVisitedView("detail");
            }}
          />
        )}
        {visitedView === "detail" && selectedStoreId && (
          <StoreDetailView
            storeId={selectedStoreId}
            onBack={() => setVisitedView("list")}
            onOpenIndoorMap={() => setVisitedView("indoor")}
          />
        )}
        {visitedView === "indoor" && selectedStoreId && (
          <IndoorMapView
            storeId={selectedStoreId}
            onBack={() => setVisitedView("detail")}
          />
        )}
      </div>
    </div>
  );
}

function StoreSearchPanel() {
  const [category, setCategory] = useState<StoreSearchCategory>("arcade");
  const [keyword, setKeyword] = useState("");
  const [useNearMe, setUseNearMe] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const canSearch = category !== "keyword" || keyword.trim().length > 0;

  const handleSearch = () => {
    const query = buildCategoryQuery(category, keyword);
    if (!query) return;
    setLocateError(null);

    if (useNearMe && "geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          const url = buildGoogleMapsSearchUrl(query, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          openExternal(url);
        },
        () => {
          setLocating(false);
          setLocateError(
            "現在地を取得できなかったため、現在地なしで検索します。"
          );
          openExternal(buildGoogleMapsSearchUrl(query, null));
        }
      );
      return;
    }
    openExternal(buildGoogleMapsSearchUrl(query, null));
  };

  return (
    <div>
      <Card>
        <p className="card-title" style={{ marginBottom: 10 }}>
          探したい店舗カテゴリーを選ぶ
        </p>
        <div className="store-category-row">
          <button
            type="button"
            className={`result-toggle-btn${
              category === "arcade" ? " active-won" : ""
            }`}
            onClick={() => setCategory("arcade")}
          >
            ゲームセンター
          </button>
          <button
            type="button"
            className={`result-toggle-btn${
              category === "gacha" ? " active-won" : ""
            }`}
            onClick={() => setCategory("gacha")}
          >
            ガチャガチャ
          </button>
        </div>
        <button
          type="button"
          className={`result-toggle-btn store-keyword-btn${
            category === "keyword" ? " active-won" : ""
          }`}
          onClick={() => setCategory("keyword")}
        >
          キーワードで探す
        </button>

        {category === "keyword" && (
          <div className="field-group" style={{ marginTop: 12 }}>
            <input
              type="text"
              className="text-field"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例：クレーンゲーム 渋谷"
            />
          </div>
        )}

        <label className="store-nearme-row">
          <input
            type="checkbox"
            checked={useNearMe}
            onChange={(e) => setUseNearMe(e.target.checked)}
          />
          現在地の近くで探す（任意）
        </label>

        <Button
          fullWidth
          disabled={!canSearch || locating}
          onClick={handleSearch}
          style={{ marginTop: 12 }}
        >
          {locating ? (
            <>
              <Loader2 size={16} className="spin" /> 現在地を取得中...
            </>
          ) : (
            <>
              <ExternalLink size={16} /> Googleマップで探す
            </>
          )}
        </Button>
        {locateError && (
          <p className="text-danger" style={{ fontSize: 12, marginTop: 8 }}>
            {locateError}
          </p>
        )}
        <p className="text-sub" style={{ marginTop: 10 }}>
          Googleマップが別タブ（アプリ）で開きます。気になるお店が見つかったら、「行ったお店」タブから登録できます。
        </p>
      </Card>
    </div>
  );
}

interface VisitedStoresPanelProps {
  active: boolean;
  data: ReturnType<typeof useApp>["data"];
  addStore: ReturnType<typeof useApp>["addStore"];
  updateStore: ReturnType<typeof useApp>["updateStore"];
  deleteStore: ReturnType<typeof useApp>["deleteStore"];
  onOpenDetail: (storeId: string) => void;
}

function VisitedStoresPanel({
  active,
  data,
  addStore,
  updateStore,
  deleteStore,
  onOpenDetail,
}: VisitedStoresPanelProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const fitDoneRef = useRef(false);
  const [mapError, setMapError] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreLocation | null>(null);

  const storesWithStats = useMemo(() => getStoresWithStats(data), [data]);

  const sortedStores = useMemo(() => {
    return [...storesWithStats].sort((a, b) => {
      if (a.lastVisitDate && b.lastVisitDate) {
        return b.lastVisitDate.localeCompare(a.lastVisitDate);
      }
      if (a.lastVisitDate) return -1;
      if (b.lastVisitDate) return 1;
      return a.store.name.localeCompare(b.store.name, "ja");
    });
  }, [storesWithStats]);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    try {
      const map = L.map(mapElRef.current, {
        center: DEFAULT_CENTER,
        zoom: 11,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    } catch {
      setMapError(true);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      fitDoneRef.current = false;
    };
  }, []);

  // タブ切り替えで表示された直後はコンテナ幅が0で初期化されているため、
  // 表示状態に戻ったタイミングでサイズを再計算する
  useEffect(() => {
    if (!active) return;
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;

    for (const [id, marker] of markers) {
      if (!data.stores.some((s) => s.id === id)) {
        map.removeLayer(marker);
        markers.delete(id);
      }
    }

    const points: [number, number][] = [];
    for (const store of data.stores) {
      if (store.lat === null || store.lng === null) continue;
      points.push([store.lat, store.lng]);
      let marker = markers.get(store.id);
      if (!marker) {
        marker = L.marker([store.lat, store.lng], { icon: storePinIcon }).addTo(
          map
        );
        marker.on("click", () => {
          setHighlightId(store.id);
          const el = document.getElementById(`store-card-${store.id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        markers.set(store.id, marker);
      } else {
        marker.setLatLng([store.lat, store.lng]);
      }
      marker.bindTooltip(store.name, { direction: "top", offset: [0, -22] });
    }

    if (points.length > 0 && !fitDoneRef.current) {
      map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
      fitDoneRef.current = true;
    }
  }, [data.stores]);

  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightId]);

  const handleAddSubmit = (values: StoreFormValues) => {
    addStore(values);
    setShowAddForm(false);
  };

  const handleEditSubmit = (values: StoreFormValues) => {
    if (editingStore) updateStore(editingStore.id, values);
    setEditingStore(null);
  };

  return (
    <div>
      <Card className="map-card">
        {mapError ? (
          <p className="text-danger" style={{ padding: 12 }}>
            地図の読み込みに失敗しました。下の店舗一覧は確認できます。
          </p>
        ) : (
          <div ref={mapElRef} className="visited-map" />
        )}
      </Card>

      <Button fullWidth onClick={() => setShowAddForm(true)}>
        <Plus size={18} /> 店舗を登録
      </Button>

      <div style={{ marginTop: 18 }}>
        <p className="card-title" style={{ marginBottom: 10 }}>
          登録した店舗一覧
        </p>
        {sortedStores.length === 0 ? (
          <p className="empty-state">
            まだ店舗が登録されていません。「店舗を登録」から追加できます。
          </p>
        ) : (
          <div className="store-list">
            {sortedStores.map((item) => (
              <StoreCard
                key={item.store.id}
                item={item}
                highlighted={highlightId === item.store.id}
                onEdit={() => setEditingStore(item.store)}
                onDelete={() => setDeleteTarget(item.store)}
                onOpenDetail={() => onOpenDetail(item.store.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <StoreForm
          title="店舗を登録"
          onCancel={() => setShowAddForm(false)}
          onSubmit={handleAddSubmit}
        />
      )}

      {editingStore && (
        <StoreForm
          title="店舗情報を編集"
          initial={editingStore}
          onCancel={() => setEditingStore(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="店舗を削除しますか？"
          message={
            "この店舗の登録情報と訪問履歴が削除されます。\nこれまでのプレイ記録（金額・獲得数）は削除されません。"
          }
          confirmLabel="削除する"
          onConfirm={() => {
            deleteStore(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function StoreCard({
  item,
  highlighted,
  onEdit,
  onDelete,
  onOpenDetail,
}: {
  item: StoreWithStats;
  highlighted: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}) {
  const { store, visitCount, lastVisitDate, spent, prizeCount } = item;
  const hasPosition = store.lat !== null && store.lng !== null;

  return (
    <Card
      id={`store-card-${store.id}`}
      className={`store-card${highlighted ? " store-card-highlight" : ""}`}
    >
      <div className="store-card-header">
        <span className="store-card-name">{store.name}</span>
        {store.category && (
          <span className="store-card-badge">
            {CATEGORY_LABEL[store.category]}
          </span>
        )}
      </div>
      {store.address && <p className="text-sub">{store.address}</p>}
      {!hasPosition && (
        <p className="text-sub store-card-noposition">位置は未設定です</p>
      )}

      <div className="store-card-stats">
        <div>
          <span className="store-card-stat-label">訪問回数</span>
          <span className="store-card-stat-value">{visitCount}回</span>
        </div>
        <div>
          <span className="store-card-stat-label">最後の訪問</span>
          <span className="store-card-stat-value">
            {lastVisitDate ?? "記録なし"}
          </span>
        </div>
        <div>
          <span className="store-card-stat-label">累計使用金額</span>
          <span className="store-card-stat-value">{formatYen(spent)}</span>
        </div>
        <div>
          <span className="store-card-stat-label">
            <Trophy size={12} className="text-yellow" /> 獲得数
          </span>
          <span className="store-card-stat-value">{prizeCount}個</span>
        </div>
      </div>

      {store.memo && <p className="text-sub store-card-memo">{store.memo}</p>}

      <button className="store-card-detail-link" onClick={onOpenDetail}>
        店舗詳細・店内マップを見る <ChevronRight size={16} />
      </button>

      <div className="record-actions">
        <button className="icon-btn" onClick={onEdit}>
          <Pencil size={16} /> 編集
        </button>
        <button
          className="icon-btn"
          onClick={() => openExternal(buildGoogleMapsPlaceUrl(store))}
        >
          <ExternalLink size={16} /> マップ
        </button>
        <button className="icon-btn icon-btn-danger" onClick={onDelete}>
          <Trash2 size={16} /> 削除
        </button>
      </div>
    </Card>
  );
}
