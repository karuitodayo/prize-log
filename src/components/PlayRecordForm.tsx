import { useEffect, useRef, useState } from "react";
import { Camera, Trophy, X } from "lucide-react";
import { Button } from "./Button";
import { AmountInput } from "./AmountInput";
import { PhotoThumbnail } from "./PhotoThumbnail";
import type { PlayRecord, PlayResult } from "../types";
import { todayDateString } from "../utils/calculations";
import { deletePhoto, savePhotoFile } from "../utils/photoStore";
import { useApp } from "../context/AppContext";
import "./PlayRecordForm.css";

export interface PlayRecordFormValues {
  playDate: string;
  storeName: string;
  amount: number;
  result: PlayResult;
  prizeName: string;
  memo: string;
  photoId: string | null;
  storeId: string | null;
  machineSpotId: string | null;
}

interface PlayRecordFormProps {
  initial?: PlayRecord;
  title: string;
  onSubmit: (values: PlayRecordFormValues) => void;
  onCancel: () => void;
}

export function PlayRecordForm({
  initial,
  title,
  onSubmit,
  onCancel,
}: PlayRecordFormProps) {
  const { data, addStore } = useApp();
  const [playDate, setPlayDate] = useState(initial?.playDate ?? todayDateString());
  const [storeName, setStoreName] = useState(initial?.storeName ?? "");
  const [storeId, setStoreId] = useState<string | null>(initial?.storeId ?? null);
  const [machineSpotId, setMachineSpotId] = useState<string | null>(
    initial?.machineSpotId ?? null
  );
  const [amount, setAmount] = useState<number | "">(initial?.amount ?? "");
  const [result, setResult] = useState<PlayResult>(initial?.result ?? "lost");
  const [prizeName, setPrizeName] = useState(initial?.prizeName ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [touched, setTouched] = useState(false);

  const [existingPhotoId] = useState<string | null>(initial?.photoId ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const amountValid = typeof amount === "number" && amount >= 1;
  const hasPhoto = !!pendingPreviewUrl || (!!existingPhotoId && !removeExisting);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const handleFileChange = (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("画像ファイルを選択してください。");
      return;
    }
    setPendingFile(file);
    setRemoveExisting(false);
  };

  const handleRemovePhoto = () => {
    setPendingFile(null);
    setRemoveExisting(true);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!amountValid || !playDate) return;

    setSaving(true);
    let photoId: string | null = existingPhotoId;
    try {
      if (pendingFile) {
        const newId = await savePhotoFile(pendingFile);
        if (existingPhotoId) {
          await deletePhoto(existingPhotoId);
        }
        photoId = newId;
      } else if (removeExisting && existingPhotoId) {
        await deletePhoto(existingPhotoId);
        photoId = null;
      }
    } catch {
      setPhotoError("写真の保存に失敗しました。記録は写真なしで保存されます。");
      photoId = removeExisting ? null : existingPhotoId;
    }
    setSaving(false);

    onSubmit({
      playDate,
      storeName,
      amount: amount as number,
      result,
      prizeName,
      memo,
      photoId,
      storeId,
      machineSpotId,
    });
  };

  const sortedStores = [...data.stores].sort((a, b) =>
    a.name.localeCompare(b.name, "ja")
  );

  const spotsForStore = storeId
    ? data.machineSpots.filter((s) => s.storeId === storeId)
    : [];

  const handleSelectStore = (value: string) => {
    // 店舗を変更した場合は、別店舗の筐体スポット選択を解除する
    setMachineSpotId(null);
    if (!value) {
      setStoreId(null);
      return;
    }
    setStoreId(value);
    const store = data.stores.find((s) => s.id === value);
    if (store) setStoreName(store.name);
  };

  const handleRegisterCurrentStoreName = () => {
    const name = storeName.trim();
    if (!name) return;
    const newId = addStore({
      name,
      category: null,
      address: null,
      lat: null,
      lng: null,
      memo: "",
      mapUrl: null,
    });
    setStoreId(newId);
    setMachineSpotId(null);
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog-box form-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="form-box-header">
          <h3 className="dialog-title">{title}</h3>
          <button className="notice-close" onClick={onCancel} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="form-box-body">
          <div className="field-group">
            <label className="field-label">プレイ日</label>
            <input
              type="date"
              className="date-field"
              value={playDate}
              onChange={(e) => setPlayDate(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">店舗名（任意）</label>
            <input
              type="text"
              className="text-field"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                setStoreId(null);
                setMachineSpotId(null);
              }}
              placeholder="例：〇〇ゲームセンター"
            />
          </div>

          <div className="field-group">
            <label className="field-label">訪問店舗（任意・マップと連携）</label>
            <select
              className="select-field"
              value={storeId ?? ""}
              onChange={(e) => handleSelectStore(e.target.value)}
            >
              <option value="">登録済みの店舗から選ぶ</option>
              {sortedStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {!storeId && storeName.trim() && (
              <button
                type="button"
                className="photo-picker-replace-link"
                onClick={handleRegisterCurrentStoreName}
              >
                「{storeName.trim()}」をマップ用に新規登録する
              </button>
            )}
            {storeId && (
              <p className="text-accent" style={{ fontSize: 12, marginTop: -2 }}>
                この店舗はマップの訪問履歴に記録されます。
              </p>
            )}
          </div>

          {storeId && (
            <div className="field-group">
              <label className="field-label">筐体スポット（任意）</label>
              {spotsForStore.length === 0 ? (
                <p className="text-sub" style={{ marginTop: -2 }}>
                  この店舗にはまだ筐体スポットが登録されていません。マップの店舗詳細から登録できます。
                </p>
              ) : (
                <select
                  className="select-field"
                  value={machineSpotId ?? ""}
                  onChange={(e) => setMachineSpotId(e.target.value || null)}
                >
                  <option value="">選択しない</option>
                  {spotsForStore.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <AmountInput
            label="使用金額"
            value={amount}
            onChange={setAmount}
          />
          {touched && !amountValid && (
            <p className="text-danger" style={{ marginTop: -10, marginBottom: 14, fontSize: 12 }}>
              1円以上の金額を入力してください。
            </p>
          )}

          <div className="field-group">
            <label className="field-label">結果</label>
            <div className="result-toggle-row">
              <button
                type="button"
                className={`result-toggle-btn${
                  result === "won" ? " active-won" : ""
                }`}
                onClick={() => setResult("won")}
              >
                <Trophy size={16} /> 獲得
              </button>
              <button
                type="button"
                className={`result-toggle-btn${
                  result === "lost" ? " active-lost" : ""
                }`}
                onClick={() => setResult("lost")}
              >
                未獲得
              </button>
            </div>
          </div>

          {result === "won" && (
            <div className="field-group">
              <label className="field-label">プライズ名（任意）</label>
              <input
                type="text"
                className="text-field"
                value={prizeName}
                onChange={(e) => setPrizeName(e.target.value)}
                placeholder="例：〇〇ぬいぐるみ"
              />
            </div>
          )}

          <div className="field-group">
            <label className="field-label">写真（任意）</label>
            <div className="photo-picker">
              <button
                type="button"
                className="photo-picker-box"
                onClick={() => fileInputRef.current?.click()}
                aria-label="写真を選択"
              >
                {pendingPreviewUrl ? (
                  <img
                    src={pendingPreviewUrl}
                    alt=""
                    className="photo-picker-img"
                  />
                ) : (
                  <PhotoThumbnail
                    photoId={!removeExisting ? existingPhotoId : null}
                    className="photo-picker-img"
                    fallback={
                      <span className="photo-picker-placeholder">
                        <Camera size={20} />
                        写真を追加
                      </span>
                    }
                  />
                )}
              </button>
              {hasPhoto && (
                <button
                  type="button"
                  className="photo-picker-remove"
                  onClick={handleRemovePhoto}
                  aria-label="写真を削除"
                >
                  <X size={14} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
            </div>
            {hasPhoto && (
              <button
                type="button"
                className="photo-picker-replace-link"
                onClick={() => fileInputRef.current?.click()}
              >
                写真を変更する
              </button>
            )}
            {photoError && (
              <p className="text-danger" style={{ fontSize: 12 }}>
                {photoError}
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
          <Button fullWidth onClick={handleSubmit} disabled={saving}>
            {saving ? "保存中..." : "保存する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
