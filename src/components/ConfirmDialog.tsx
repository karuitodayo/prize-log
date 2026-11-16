import { Button } from "./Button";
import "./ConfirmDialog.css";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "削除する",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            キャンセル
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            fullWidth
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
