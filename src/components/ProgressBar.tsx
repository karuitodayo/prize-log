import type { BudgetLevel } from "../utils/calculations";
import "./ProgressBar.css";

interface ProgressBarProps {
  rate: number; // 0..1
  level: BudgetLevel;
}

export function ProgressBar({ rate, level }: ProgressBarProps) {
  const pct = Math.round(rate * 100);
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={pct}>
      <div
        className={`progress-fill progress-${level}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
