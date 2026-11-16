import { useRef, useState } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Pencil,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card } from "./Card";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { IndoorMapImage } from "./IndoorMapImage";
import { OfficialMapUrlForm, isValidHttpUrl } from "./OfficialMapUrlForm";
import {
  IndoorMapStoreError,
  isAcceptedIndoorMapFile,
  saveIndoorMapImage,
} from "../utils/indoorMapStore";
import "./IndoorMapView.css";

interface IndoorMapViewProps {
  storeId: string;
  onBack: () => void;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "未登録";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "未登録";
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IndoorMapView({ storeId, onBack }: IndoorMapViewProps) {
  const { data, setStoreIndoorMapImage, setStoreIndoorMapUrl } = useApp();
  const store = data.stores.find((s) => s.id === storeId);

  const [showUrlForm, setShowUrlForm] = useState(false);
  const [confirmDeleteUrl, setConfirmDeleteUrl] = useState(false);
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [missingImage, setMissingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!store) {
    return (
      <div>
        <button className="store-detail-back" onClick={onBack}>
          <ChevronLeft size={18} /> 戻る
        </button>
        <p className="empty-state">この店舗は削除されました。</p>
      </div>
    );
  }

  const hasUrl = !!store.indoorMapUrl;
  const hasImage = !!store.indoorMapImageId && !missingImage;
  const hasNothing = !hasUrl && !store.indoorMapImageId;

  const handleOpenOfficialMap = () => {
    if (!store.indoorMapUrl || !isValidHttpUrl(store.indoorMapUrl)) return;
    window.open(store.indoorMapUrl, "_blank", "noopener,noreferrer");
  };

  const handleSaveUrl = (url: string) => {
    setStoreIndoorMapUrl(storeId, url);
    setShowUrlForm(false);
  };

  const handleDeleteUrlConfirmed = () => {
    setStoreIndoorMapUrl(storeId, null);
    setConfirmDeleteUrl(false);
  };

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (!isAcceptedIndoorMapFile(file)) {
      setUploadError("JPEG・PNG・WebP形式の画像を選択してください。");
      return;
    }
    setUploading(true);
    try {
      const newId = await saveIndoorMapImage(file);
      // 既存のプレイ記録・店舗データには一切影響させず、画像参照のみを更新する
      setStoreIndoorMapImage(storeId, newId);
      setMissingImage(false);
    } catch (e) {
      setUploadError(
        e instanceof IndoorMapStoreError
          ? e.message
          : "画像の保存に失敗しました。既存の記録には影響していません。"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImageConfirmed = () => {
    setStoreIndoorMapImage(storeId, null);
    setConfirmDeleteImage(false);
    setMissingImage(false);
  };

  return (
    <div>
      <button className="store-detail-back" onClick={onBack}>
        <ChevronLeft size={18} /> 店舗詳細に戻る
      </button>

      <p className="page-title">{store.name}｜店内マップ</p>

      {hasNothing ? (
        <Card>
          <p className="text-sub" style={{ textAlign: "center", marginBottom: 14 }}>
            店内マップがまだ登録されていません
          </p>
          <div className="indoor-map-empty-actions">
            <Button fullWidth onClick={() => setShowUrlForm(true)}>
              公式マップのURLを登録
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => fileInputRef.current?.click()}
            >
              配置図の写真を登録
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <p className="card-title" style={{ marginBottom: 8 }}>
              公式マップ
            </p>
            {hasUrl ? (
              <>
                <p className="indoor-map-url-text">{store.indoorMapUrl}</p>
                <p className="text-sub" style={{ marginBottom: 10 }}>
                  登録・更新日：{formatDateTime(store.indoorMapUrlUpdatedAt)}
                </p>
                <Button fullWidth onClick={handleOpenOfficialMap}>
                  <ExternalLink size={16} /> 公式マップを開く
                </Button>
                <div className="record-actions">
                  <button className="icon-btn" onClick={() => setShowUrlForm(true)}>
                    <Pencil size={16} /> 編集
                  </button>
                  <button
                    className="icon-btn icon-btn-danger"
                    onClick={() => setConfirmDeleteUrl(true)}
                  >
                    <Trash2 size={16} /> 削除
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sub" style={{ marginBottom: 10 }}>
                  公式マップは未登録です
                </p>
                <Button fullWidth variant="secondary" onClick={() => setShowUrlForm(true)}>
                  公式マップのURLを登録
                </Button>
              </>
            )}
          </Card>

          <Card>
            <p className="card-title" style={{ marginBottom: 8 }}>
              登録した配置図
            </p>
            {hasImage ? (
              <>
                <IndoorMapImage
                  imageId={store.indoorMapImageId}
                  onClick={() => setZoomOpen(true)}
                  onMissing={() => setMissingImage(true)}
                >
                  <span className="indoor-map-zoom-hint">
                    <ZoomIn size={14} /> タップして拡大
                  </span>
                </IndoorMapImage>
                <p className="text-sub" style={{ margin: "10px 0" }}>
                  最終更新日：{formatDateTime(store.indoorMapImageUpdatedAt)}
                </p>
                <div className="indoor-map-actions-row">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload size={16} /> 画像を変更
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => setConfirmDeleteImage(true)}
                  >
                    <Trash2 size={16} /> 削除
                  </Button>
                </div>
              </>
            ) : (
              <>
                {missingImage && (
                  <p className="text-danger" style={{ fontSize: 13, marginBottom: 8 }}>
                    登録されていた配置図画像が見つかりませんでした。再度登録してください。
                  </p>
                )}
                <p className="text-sub" style={{ marginBottom: 10 }}>
                  配置図の写真は未登録です
                </p>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "登録中..." : "配置図の写真を登録"}
                </Button>
              </>
            )}
            <p className="text-sub" style={{ marginTop: 10 }}>
              ※ 店内の掲示物の撮影は、各店舗のルールに従ってください。
            </p>
            {uploadError && (
              <p className="text-danger" style={{ fontSize: 13, marginTop: 8 }}>
                {uploadError}
              </p>
            )}
          </Card>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          void handleFileSelected(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {showUrlForm && (
        <OfficialMapUrlForm
          title={hasUrl ? "公式マップURLを編集" : "公式マップのURLを登録"}
          initialUrl={store.indoorMapUrl ?? ""}
          onCancel={() => setShowUrlForm(false)}
          onSubmit={handleSaveUrl}
        />
      )}

      {confirmDeleteUrl && (
        <ConfirmDialog
          title="公式マップのURLを削除しますか？"
          message="登録したURLを削除します。この操作は取り消せません。"
          confirmLabel="削除する"
          onConfirm={handleDeleteUrlConfirmed}
          onCancel={() => setConfirmDeleteUrl(false)}
        />
      )}

      {confirmDeleteImage && (
        <ConfirmDialog
          title="配置図の写真を削除しますか？"
          message="登録した画像を削除します。この操作は取り消せません。"
          confirmLabel="削除する"
          onConfirm={handleDeleteImageConfirmed}
          onCancel={() => setConfirmDeleteImage(false)}
        />
      )}

      {zoomOpen && store.indoorMapImageId && (
        <div className="image-lightbox" onClick={() => setZoomOpen(false)}>
          <button
            className="image-lightbox-close"
            onClick={() => setZoomOpen(false)}
            aria-label="閉じる"
          >
            <X size={22} />
          </button>
          <IndoorMapImage
            imageId={store.indoorMapImageId}
            className="image-lightbox-content"
          />
        </div>
      )}
    </div>
  );
}
