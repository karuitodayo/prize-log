import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import type { MachineSpot, MachineType } from "../types";
import "./PlayRecordForm.css";

export interface MachineSpotFormValues {
  name: string;
  type: MachineType;
  memo: string;
}

interface MachineSpotFormProps {
  initial?: MachineSpot;
  title: string;
  onSubmit: (values: MachineSpotFormValues) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: MachineType; label: string }[] = [
  { value: "crane", label: "クレーンゲーム" },
  { value: "gacha", label: "ガチャガチャ" },
  { value: "other", label: "その他" },
];

export function MachineSpotForm({
  initial,
  title,
  onSubmit,
  onCancel,
}: MachineSpotFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<MachineType>(initial?.type ?? "crane");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [touched, setTouched] = useState(false);

  const nameValid = name.trim().length > 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!nameValid) return;
    onSubmit({ name: name.trim(), type, memo: memo.trim() });
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
            <label className="field-label">スポット名（必須）</label>
            <input
              type="text"
              className="text-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：入口横のクレーンゲーム"
            />
            {touched && !nameValid && (
              <p className="text-danger" style={{ fontSize: 12 }}>
                スポット名を入力してください。
              </p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">筐体の種類（必須）</label>
            <div className="result-toggle-row">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`result-toggle-btn${
                    type === opt.value ? " active-won" : ""
                  }`}
                  onClick={() => setType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
