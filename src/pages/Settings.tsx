import { useEffect, useRef, useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { parseImportedBackup, StorageError } from "../utils/storage";
import { currentYearMonth, getMonthlyBudgetAmount } from "../utils/calculations";
import {
  blobToDataUrl,
  dataUrlToBlob,
  getIndoorMapBlob,
  putIndoorMapImageBlob,
} from "../utils/indoorMapStore";

const APP_VERSION = "1.0.0";

export function SettingsPage() {
  const { data, setMonthlyBudget, replaceAllData, resetAllData } = useApp();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const existing = getMonthlyBudgetAmount(data, yearMonth);
  const [budgetInput, setBudgetInput] = useState<string>(
    existing !== null ? String(existing) : ""
  );

  useEffect(() => {
    setBudgetInput(existing !== null ? String(existing) : "");
  }, [existing]);
  const [savedMsg, setSavedMsg] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleYearMonthChange = (value: string) => {
    setYearMonth(value);
    const amt = getMonthlyBudgetAmount(data, value);
    setBudgetInput(amt !== null ? String(amt) : "");
  };

  const handleSaveBudget = () => {
    const n = Number(budgetInput);
    if (!Number.isFinite(n) || n < 0) return;
    setMonthlyBudget(yearMonth, Math.floor(n));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1800);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // 登録済みの店内マップ画像をBase64としてバックアップに埋め込む
      // （既にアップロード時に圧縮・容量上限済みのため、サイズは抑えられている）
      const indoorMapImages: Record<string, string> = {};
      for (const store of data.stores) {
        if (!store.indoorMapImageId) continue;
        const blob = await getIndoorMapBlob(store.indoorMapImageId);
        if (!blob) continue;
        try {
          indoorMapImages[store.indoorMapImageId] = await blobToDataUrl(blob);
        } catch {
          // 1件の変換に失敗しても他のデータのバックアップは継続する
        }
      }

      const backup = { appData: data, indoorMapImages };
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `prizelog-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = (file: File) => {
    setImportError(null);
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result);
        const { data: imported, images } = parseImportedBackup(text);
        // 先にテキストデータ（予算・プレイ記録・店舗情報等）を復元する。
        // 画像の復元に失敗しても、ここで復元済みのデータは失われない。
        replaceAllData(imported);
        for (const [id, dataUrl] of Object.entries(images)) {
          try {
            const blob = await dataUrlToBlob(dataUrl);
            await putIndoorMapImageBlob(id, blob);
          } catch {
            // 1枚の画像復元に失敗しても他の復元処理は継続する
          }
        }
      } catch (e) {
        if (e instanceof StorageError) {
          setImportError(e.message);
        } else {
          setImportError("ファイルの読み込みに失敗しました。");
        }
      } finally {
        setImporting(false);
      }
    };
    reader.onerror = () => {
      setImportError("ファイルの読み込みに失敗しました。");
      setImporting(false);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <p className="page-title">設定</p>

      <Card>
        <div className="card-header-row">
          <span className="card-title">月間予算の設定</span>
        </div>
        <div className="field-group">
          <label className="field-label">対象月</label>
          <input
            type="month"
            className="date-field"
            value={yearMonth}
            onChange={(e) => handleYearMonthChange(e.target.value)}
          />
        </div>
        <div className="field-group">
          <label className="field-label">月間予算（円）</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="text-field"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder="例：10000"
          />
        </div>
        <Button fullWidth onClick={handleSaveBudget}>
          保存する
        </Button>
        {savedMsg && (
          <p className="text-accent" style={{ marginTop: 8, fontSize: 13 }}>
            保存しました。
          </p>
        )}
      </Card>

      <Card>
        <div className="card-header-row">
          <span className="card-title">データのバックアップ</span>
        </div>
        <p className="text-sub" style={{ marginBottom: 12 }}>
          端末やブラウザを変更する場合、データが消える場合に備えてバックアップを取っておくことをおすすめします。
        </p>
        <p className="text-sub" style={{ marginBottom: 12 }}>
          ※ 店内マップ（公式URL・配置図写真）はこのバックアップに含まれます。獲得プライズの写真はこれまで通り含まれません（端末内のみに保存されます）。
        </p>
        <Button
          fullWidth
          variant="secondary"
          onClick={() => void handleExport()}
          disabled={exporting}
        >
          <Download size={16} /> {exporting ? "書き出し中..." : "JSONでエクスポート"}
        </Button>
        <div style={{ marginTop: 10 }}>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload size={16} /> {importing ? "復元中..." : "JSONから復元する"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {importError && (
          <p className="text-danger" style={{ marginTop: 8, fontSize: 13 }}>
            {importError}
          </p>
        )}
      </Card>

      <Card>
        <div className="card-header-row">
          <span className="card-title">データの削除</span>
        </div>
        <p className="text-sub" style={{ marginBottom: 12 }}>
          すべてのおでかけ・プレイ記録・予算設定を削除します。元に戻せません。
        </p>
        <Button fullWidth variant="danger" onClick={() => setConfirmReset(true)}>
          <Trash2 size={16} /> 全データをリセット
        </Button>
      </Card>

      <Card>
        <div className="card-header-row">
          <span className="card-title">アプリ情報</span>
        </div>
        <p className="text-sub">PRIZE LOG</p>
        <p className="text-sub">バージョン {APP_VERSION}</p>
      </Card>

      {confirmReset && (
        <ConfirmDialog
          title="全データをリセットしますか？"
          message={"この操作は取り消せません。\nすべての予算・おでかけ・プレイ記録が削除されます。"}
          confirmLabel="削除する"
          onConfirm={() => {
            resetAllData();
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
