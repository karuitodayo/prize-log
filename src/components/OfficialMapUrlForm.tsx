import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import "./PlayRecordForm.css";

interface OfficialMapUrlFormProps {
  initialUrl: string;
  title: string;
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function OfficialMapUrlForm({
  initialUrl,
  title,
  onSubmit,
  onCancel,
}: OfficialMapUrlFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [touched, setTouched] = useState(false);

  const trimmed = url.trim();
  const valid = trimmed.length > 0 && isValidHttpUrl(trimmed);

  const handleSubmit = () => {
    setTouched(true);
    if (!valid) return;
    onSubmit(trimmed);
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
            <label className="field-label">公式マップのURL（必須）</label>
            <input
              type="url"
              className="text-field"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              autoCapitalize="off"
              autoCorrect="off"
            />
            {touched && !valid && (
              <p className="text-danger" style={{ fontSize: 12 }}>
                {trimmed.length === 0
                  ? "URLを入力してください。"
                  : "http:// または https:// から始まる正しいURLを入力してください。"}
              </p>
            )}
            <p className="text-sub" style={{ marginTop: 6 }}>
              店舗公式サイトなどで実際に配置図を確認できたページのURLを登録してください。
            </p>
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
