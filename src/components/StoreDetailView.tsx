import { ChevronLeft, Map as MapIcon, Trophy } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card } from "./Card";
import { Button } from "./Button";
import { formatYen, getStoresWithStats } from "../utils/calculations";
import "./StoreDetailView.css";

interface StoreDetailViewProps {
  storeId: string;
  onBack: () => void;
  onOpenIndoorMap: () => void;
}

export function StoreDetailView({
  storeId,
  onBack,
  onOpenIndoorMap,
}: StoreDetailViewProps) {
  const { data } = useApp();
  const item = getStoresWithStats(data).find((s) => s.store.id === storeId);

  if (!item) {
    return (
      <div>
        <button className="store-detail-back" onClick={onBack}>
          <ChevronLeft size={18} /> 戻る
        </button>
        <p className="empty-state">この店舗は削除されました。</p>
      </div>
    );
  }

  const { store, visitCount, spent, prizeCount } = item;

  const hasUrl = !!store.indoorMapUrl;
  const hasImage = !!store.indoorMapImageId;
  let indoorMapStatus = "未登録";
  if (hasUrl && hasImage) indoorMapStatus = "公式マップあり・配置図写真あり";
  else if (hasUrl) indoorMapStatus = "公式マップあり";
  else if (hasImage) indoorMapStatus = "配置図写真あり";

  return (
    <div>
      <button className="store-detail-back" onClick={onBack}>
        <ChevronLeft size={18} /> 行ったお店に戻る
      </button>

      <p className="page-title">店舗詳細</p>

      <Card>
        <p className="store-detail-name">{store.name}</p>
        {store.address && <p className="text-sub">{store.address}</p>}

        <div className="store-card-stats" style={{ marginTop: 12 }}>
          <div>
            <span className="store-card-stat-label">訪問回数</span>
            <span className="store-card-stat-value">{visitCount}回</span>
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
      </Card>

      <Button fullWidth onClick={onOpenIndoorMap}>
        <MapIcon size={18} /> 店内マップを見る
      </Button>
      <p className="text-sub" style={{ textAlign: "center", marginTop: 8 }}>
        店内マップ：{indoorMapStatus}
      </p>
    </div>
  );
}
