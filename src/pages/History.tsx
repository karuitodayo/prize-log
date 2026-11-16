import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trophy, Pencil, Trash2, Image } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card } from "../components/Card";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PhotoThumbnail } from "../components/PhotoThumbnail";
import { PlayRecordForm } from "../components/PlayRecordForm";
import type { PlayRecordFormValues } from "../components/PlayRecordForm";
import type { PlayRecord } from "../types";
import {
  formatYen,
  getMonthlyPrizeCount,
  getMonthlySpent,
  getYearMonth,
} from "../utils/calculations";
import "./History.css";

type HistoryTab = "records" | "prizes";

function shiftYearMonth(yearMonth: string, diff: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + diff, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}`;
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}

export function HistoryPage() {
  const { data, updatePlayRecord, deletePlayRecord } = useApp();
  const [tab, setTab] = useState<HistoryTab>("records");
  const [yearMonth, setYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingRecord, setEditingRecord] = useState<PlayRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlayRecord | null>(null);

  const monthlySpent = getMonthlySpent(data, yearMonth);
  const monthlyPrizeCount = getMonthlyPrizeCount(data, yearMonth);

  const monthRecords = useMemo(
    () =>
      data.playRecords.filter((r) => getYearMonth(r.playDate) === yearMonth),
    [data.playRecords, yearMonth]
  );

  const groupedByOuting = useMemo(() => {
    const map = new Map<string, PlayRecord[]>();
    for (const r of monthRecords) {
      const list = map.get(r.outingId) ?? [];
      list.push(r);
      map.set(r.outingId, list);
    }
    const groups = Array.from(map.entries()).map(([outingId, records]) => {
      const outing = data.outings.find((o) => o.id === outingId);
      const sorted = [...records].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
      const wonCount = records.filter((r) => r.result === "won").length;
      return { outingId, outing, records: sorted, totalAmount, wonCount };
    });
    groups.sort((a, b) => {
      const aDate = a.outing?.startedAt ?? "";
      const bDate = b.outing?.startedAt ?? "";
      return bDate.localeCompare(aDate);
    });
    return groups;
  }, [monthRecords, data.outings]);

  const allPrizes = useMemo(
    () =>
      [...data.playRecords]
        .filter((r) => r.result === "won")
        .sort((a, b) => b.playDate.localeCompare(a.playDate)),
    [data.playRecords]
  );

  return (
    <div>
      <p className="page-title">履歴</p>

      <div className="tab-row">
        <button
          className={`tab-btn${tab === "records" ? " tab-btn-active" : ""}`}
          onClick={() => setTab("records")}
        >
          プレイ履歴
        </button>
        <button
          className={`tab-btn${tab === "prizes" ? " tab-btn-active" : ""}`}
          onClick={() => setTab("prizes")}
        >
          獲得プライズ
        </button>
      </div>

      {tab === "records" && (
        <>
          <div className="month-switch">
            <button
              className="icon-btn"
              onClick={() => setYearMonth((v) => shiftYearMonth(v, -1))}
              aria-label="前の月"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="month-switch-label">
              {formatMonthLabel(yearMonth)}
            </span>
            <button
              className="icon-btn"
              onClick={() => setYearMonth((v) => shiftYearMonth(v, 1))}
              aria-label="次の月"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <Card>
            <div className="history-summary-row">
              <div>
                <p className="history-summary-label">今月の使用金額</p>
                <p className="history-summary-amount">
                  {formatYen(monthlySpent)}
                </p>
              </div>
              <div>
                <p className="history-summary-label" style={{ textAlign: "right" }}>
                  今月の獲得数
                </p>
                <p className="history-summary-count">{monthlyPrizeCount}個</p>
              </div>
            </div>
          </Card>

          {groupedByOuting.length === 0 ? (
            <p className="empty-state">この月の記録はありません</p>
          ) : (
            groupedByOuting.map(
              ({ outingId, outing, records, totalAmount, wonCount }) => (
                <Card key={outingId}>
                  <div className="history-outing-header">
                    <span className="history-outing-title">
                      {outing
                        ? new Date(outing.startedAt).toLocaleDateString(
                            "ja-JP",
                            { month: "numeric", day: "numeric" }
                          )
                        : "おでかけ"}
                      {outing?.memo ? `｜${outing.memo}` : ""}
                    </span>
                    {outing?.status === "active" && (
                      <span className="history-outing-status">進行中</span>
                    )}
                  </div>
                  <div className="history-outing-stats">
                    <span>使用合計：{formatYen(totalAmount)}</span>
                    <span>獲得数：{wonCount}個</span>
                  </div>
                  <div className="history-record-list">
                    {records.map((r) => (
                      <div key={r.id} className="history-record-item">
                        <div className="history-record-top">
                          <div className="history-record-thumb">
                            <PhotoThumbnail
                              photoId={r.photoId}
                              fallback={<Image size={16} />}
                            />
                          </div>
                          <p
                            className={`history-record-main ${
                              r.result === "won"
                                ? "history-record-won"
                                : "history-record-lost"
                            }`}
                          >
                            {r.result === "won"
                              ? `獲得：${r.prizeName || "プライズ"}`
                              : "未獲得"}
                          </p>
                          <p className="history-record-amount">
                            {formatYen(r.amount)}
                          </p>
                        </div>
                        {r.machineSpotId && (
                          <p className="text-sub" style={{ marginTop: 2 }}>
                            筐体：
                            {data.machineSpots.find((s) => s.id === r.machineSpotId)
                              ?.name ?? "削除済み"}
                          </p>
                        )}
                        <div className="record-actions">
                          <button
                            className="icon-btn"
                            onClick={() => setEditingRecord(r)}
                          >
                            <Pencil size={16} /> 編集
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 size={16} /> 削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            )
          )}
        </>
      )}

      {tab === "prizes" && (
        <>
          {allPrizes.length === 0 ? (
            <p className="empty-state">まだ獲得したプライズがありません</p>
          ) : (
            allPrizes.map((r) => {
              const outing = data.outings.find((o) => o.id === r.outingId);
              return (
                <Card key={r.id}>
                  <div className="history-prize-row">
                    <div className="history-prize-placeholder">
                      <PhotoThumbnail
                        photoId={r.photoId}
                        fallback={<Image size={22} />}
                      />
                    </div>
                    <div className="history-prize-info">
                      <p className="history-prize-name">
                        <Trophy size={14} className="text-yellow" />
                        {r.prizeName || "プライズ名未入力"}
                      </p>
                      <p className="history-prize-meta">{r.playDate}</p>
                      <p className="history-prize-meta">
                        {r.storeName || "店舗未入力"}
                        {outing?.memo ? `（${outing.memo}）` : ""}
                      </p>
                      <p className="history-prize-amount">
                        {formatYen(r.amount)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </>
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
    </div>
  );
}
