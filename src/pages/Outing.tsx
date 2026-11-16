import { useState } from "react";
import { Image, Plus, Pencil, Trash2, Trophy } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PhotoThumbnail } from "../components/PhotoThumbnail";
import { PlayRecordForm } from "../components/PlayRecordForm";
import type { PlayRecordFormValues } from "../components/PlayRecordForm";
import { AmountInput } from "../components/AmountInput";
import type { PlayRecord } from "../types";
import {
  formatYen,
  getBudgetLevel,
  getOutingPrizeCount,
  getOutingRecords,
  getOutingSpent,
  getUsageRate,
} from "../utils/calculations";
import "./Outing.css";

export function OutingPage() {
  const {
    data,
    activeOuting,
    startOuting,
    endOuting,
    addPlayRecord,
    updatePlayRecord,
    deletePlayRecord,
  } = useApp();

  const [startBudget, setStartBudget] = useState<number | "">("");
  const [startMemo, setStartMemo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PlayRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlayRecord | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (!activeOuting) {
    const canStart = typeof startBudget === "number" && startBudget >= 0;
    return (
      <div>
        <p className="page-title">おでかけを始める</p>
        <Card>
          <AmountInput
            label="今回の予算"
            value={startBudget}
            onChange={setStartBudget}
          />
          <div className="field-group">
            <label className="field-label">メモ（任意）</label>
            <textarea
              className="textarea-field"
              value={startMemo}
              onChange={(e) => setStartMemo(e.target.value)}
              placeholder="例：〇〇モールのゲームセンターへ"
            />
          </div>
          <Button
            fullWidth
            disabled={!canStart}
            onClick={() => {
              startOuting(startBudget as number, startMemo);
              setStartBudget("");
              setStartMemo("");
            }}
          >
            おでかけ開始
          </Button>
        </Card>
      </div>
    );
  }

  const spent = getOutingSpent(data, activeOuting.id);
  const remaining = activeOuting.budget - spent;
  const level = getBudgetLevel(spent, activeOuting.budget);
  const rate = getUsageRate(spent, activeOuting.budget);
  const prizeCount = getOutingPrizeCount(data, activeOuting.id);
  const records = getOutingRecords(data, activeOuting.id);

  return (
    <div>
      <p className="page-title">おでかけ中</p>

      <Card>
        <p className="outing-card-header">
          今回のおでかけ{activeOuting.memo ? `｜${activeOuting.memo}` : ""}
        </p>
        <p
          className={`outing-remaining-amount ${
            level === "over" ? "text-danger" : "text-accent"
          }`}
        >
          残り {formatYen(remaining)}
        </p>
        <div className="outing-usage-row">
          <span>使用 {formatYen(spent)}</span>
          <span>／</span>
          <span>予算 {formatYen(activeOuting.budget)}</span>
        </div>
        <ProgressBar rate={rate} level={level} />
        {level === "warning" && (
          <p className="outing-alert-text text-yellow">予算まもなく到達</p>
        )}
        {level === "over" && (
          <p className="outing-alert-text text-danger">予算を超過しています</p>
        )}
        <p className="outing-prize-row">
          <Trophy size={14} className="text-yellow" />
          獲得数 {prizeCount}個
        </p>
      </Card>

      <Button fullWidth onClick={() => setShowForm(true)}>
        <Plus size={18} /> プレイを記録
      </Button>

      <div style={{ marginTop: 18 }}>
        <p className="card-title" style={{ marginBottom: 10 }}>
          今回のプレイ履歴
        </p>
        {records.length === 0 ? (
          <p className="empty-state">まだ記録がありません</p>
        ) : (
          <div className="outing-record-list">
            {records.map((r) => (
              <Card key={r.id} className="outing-record-card">
                <div className="outing-record-top">
                  <div className="outing-record-thumb">
                    <PhotoThumbnail
                      photoId={r.photoId}
                      fallback={<Image size={18} />}
                    />
                  </div>
                  <div className="outing-record-info">
                    <p className="outing-record-main">
                      {r.storeName || "店舗未入力"}
                    </p>
                    <p className="outing-record-sub">{r.playDate}</p>
                    {r.machineSpotId && (
                      <p className="outing-record-sub">
                        筐体：
                        {data.machineSpots.find((s) => s.id === r.machineSpotId)
                          ?.name ?? "削除済み"}
                      </p>
                    )}
                    {r.memo && <p className="outing-record-sub">{r.memo}</p>}
                  </div>
                  <div className="outing-record-right">
                    <p className="outing-record-amount">
                      {formatYen(r.amount)}
                    </p>
                    <p
                      className={
                        r.result === "won"
                          ? "outing-record-result-won"
                          : "outing-record-result-lost"
                      }
                    >
                      {r.result === "won"
                        ? `獲得：${r.prizeName || "プライズ"}`
                        : "未獲得"}
                    </p>
                  </div>
                </div>
                <div className="record-actions">
                  <button
                    className="icon-btn"
                    onClick={() => setEditingRecord(r)}
                    aria-label="編集"
                  >
                    <Pencil size={16} /> 編集
                  </button>
                  <button
                    className="icon-btn icon-btn-danger"
                    onClick={() => setDeleteTarget(r)}
                    aria-label="削除"
                  >
                    <Trash2 size={16} /> 削除
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        fullWidth
        onClick={() => setConfirmEnd(true)}
        style={{ marginTop: 14 }}
      >
        おでかけを終了する
      </Button>

      {showForm && (
        <PlayRecordForm
          title="プレイ記録を追加"
          onCancel={() => setShowForm(false)}
          onSubmit={(values: PlayRecordFormValues) => {
            addPlayRecord(values);
            setShowForm(false);
          }}
        />
      )}

      {editingRecord && (
        <PlayRecordForm
          title="プレイ記録を編集"
          initial={editingRecord}
          onCancel={() => setEditingRecord(null)}
          onSubmit={(values: PlayRecordFormValues) => {
            updatePlayRecord(editingRecord.id, values);
            setEditingRecord(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="記録を削除しますか？"
          message="この操作は取り消せません。"
          confirmLabel="削除する"
          onConfirm={() => {
            deletePlayRecord(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {confirmEnd && (
        <ConfirmDialog
          title="おでかけを終了しますか？"
          message="終了すると記録の追加はできなくなります。履歴には残ります。"
          confirmLabel="終了する"
          danger={false}
          onConfirm={() => {
            endOuting();
            setConfirmEnd(false);
          }}
          onCancel={() => setConfirmEnd(false)}
        />
      )}
    </div>
  );
}
