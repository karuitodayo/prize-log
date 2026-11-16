import { useState } from "react";
import { Image, Trophy, Sparkles } from "lucide-react";
import { PhotoThumbnail } from "../components/PhotoThumbnail";
import { useApp } from "../context/AppContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { TabKey } from "../components/BottomNav";
import {
  currentYearMonth,
  formatYen,
  getBudgetLevel,
  getMonthlyBudgetAmount,
  getMonthlyPrizeCount,
  getMonthlySpent,
  getOutingSpent,
  getUsageRate,
} from "../utils/calculations";
import "./Home.css";

interface HomePageProps {
  onNavigate: (tab: TabKey) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { data, activeOuting, endOuting } = useApp();
  const [confirmEnd, setConfirmEnd] = useState(false);

  const yearMonth = currentYearMonth();
  const monthlyBudget = getMonthlyBudgetAmount(data, yearMonth);
  const monthlySpent = getMonthlySpent(data, yearMonth);
  const monthlyRemaining =
    monthlyBudget !== null ? monthlyBudget - monthlySpent : null;
  const monthlyLevel =
    monthlyBudget !== null ? getBudgetLevel(monthlySpent, monthlyBudget) : "normal";
  const monthlyRate =
    monthlyBudget !== null ? getUsageRate(monthlySpent, monthlyBudget) : 0;

  const prizeCount = getMonthlyPrizeCount(data, yearMonth);

  const recentRecords = [...data.playRecords]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  const outingSpent = activeOuting ? getOutingSpent(data, activeOuting.id) : 0;
  const outingRemaining = activeOuting ? activeOuting.budget - outingSpent : 0;
  const outingLevel = activeOuting
    ? getBudgetLevel(outingSpent, activeOuting.budget)
    : "normal";
  const outingRate = activeOuting
    ? getUsageRate(outingSpent, activeOuting.budget)
    : 0;

  return (
    <div>
      {/* 1. 今月あといくら使えるか */}
      <Card>
        <p className="home-card-label">今月の残り予算</p>
        {monthlyBudget === null ? (
          <>
            <p className="home-remaining-amount text-sub">未設定</p>
            <p className="text-sub">
              月間予算が未設定です。設定タブから登録できます。
            </p>
          </>
        ) : (
          <>
            <p
              className={`home-remaining-amount ${
                monthlyLevel === "over" ? "text-danger" : "text-accent"
              }`}
            >
              {formatYen(monthlyRemaining ?? 0)}
            </p>
            <div className="home-usage-row">
              <span>使用 {formatYen(monthlySpent)}</span>
              <span>／</span>
              <span>予算 {formatYen(monthlyBudget)}</span>
            </div>
            <ProgressBar rate={monthlyRate} level={monthlyLevel} />
            {monthlyLevel === "warning" && (
              <p className="home-alert-text text-yellow">予算まもなく到達</p>
            )}
            {monthlyLevel === "over" && (
              <p className="home-alert-text text-danger">
                予算を超過しています
              </p>
            )}
          </>
        )}
      </Card>

      {/* 2〜3. 今回のおでかけであといくら使えるか／プレイ記録を追加する操作 */}
      <Card>
        <div className="home-card-header-row">
          <span className="home-card-label" style={{ margin: 0 }}>
            今回のおでかけ
          </span>
          {activeOuting && (
            <span className="home-status-badge">進行中</span>
          )}
        </div>

        {!activeOuting ? (
          <>
            <p className="text-sub" style={{ marginBottom: 12 }}>
              現在おでかけ中ではありません。
            </p>
            <Button fullWidth onClick={() => onNavigate("outing")}>
              おでかけを始める
            </Button>
          </>
        ) : (
          <>
            {activeOuting.memo && (
              <p className="home-outing-memo">{activeOuting.memo}</p>
            )}
            <p
              className={`home-remaining-amount ${
                outingLevel === "over" ? "text-danger" : "text-accent"
              }`}
            >
              {formatYen(outingRemaining)}
            </p>
            <div className="home-usage-row">
              <span>使用 {formatYen(outingSpent)}</span>
              <span>／</span>
              <span>予算 {formatYen(activeOuting.budget)}</span>
            </div>
            <ProgressBar rate={outingRate} level={outingLevel} />
            {outingLevel === "warning" && (
              <p className="home-alert-text text-yellow">予算まもなく到達</p>
            )}
            {outingLevel === "over" && (
              <p className="home-alert-text text-danger">
                予算を超過しています
              </p>
            )}
            <div className="home-outing-actions">
              <Button fullWidth onClick={() => onNavigate("outing")}>
                ＋ プレイを記録
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setConfirmEnd(true)}
              >
                おでかけを終了
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* 4. 今月の獲得数（コンパクト表示） */}
      <Card className="home-compact-card">
        <div className="home-prize-row">
          <span className="home-prize-label">
            <Trophy size={16} className="text-yellow" />
            今月の獲得数
          </span>
          <span className="home-prize-value">{prizeCount}個</span>
        </div>
      </Card>

      {/* 5. 最近のプレイ履歴 */}
      <Card>
        <div className="home-card-header-row">
          <span className="home-card-label" style={{ margin: 0 }}>
            <Sparkles
              size={14}
              style={{ verticalAlign: "-2px", marginRight: 4 }}
            />
            最近のプレイ記録
          </span>
          <button
            className="home-more-link"
            onClick={() => onNavigate("history")}
          >
            もっと見る
          </button>
        </div>
        {recentRecords.length === 0 ? (
          <p className="empty-state">まだ記録がありません</p>
        ) : (
          <div className="home-record-list">
            {recentRecords.map((r) => (
              <div key={r.id} className="home-record-item">
                <div className="home-record-thumb">
                  <PhotoThumbnail
                    photoId={r.photoId}
                    fallback={<Image size={16} />}
                  />
                </div>
                <div className="home-record-info">
                  <p className="home-record-main">
                    {r.storeName || "店舗未入力"}
                  </p>
                  <p className="home-record-sub">{r.playDate}</p>
                </div>
                <div className="home-record-right">
                  <p className="home-record-amount">{formatYen(r.amount)}</p>
                  <p
                    className={
                      r.result === "won"
                        ? "home-record-result-won"
                        : "home-record-result-lost"
                    }
                  >
                    {r.result === "won"
                      ? `獲得：${r.prizeName || "プライズ"}`
                      : "未獲得"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
