import { AlertTriangle, X } from "lucide-react";
import "./NoticeBanner.css";

interface NoticeBannerProps {
  message: string;
  onClose: () => void;
}

export function NoticeBanner({ message, onClose }: NoticeBannerProps) {
  return (
    <div className="notice-banner">
      <AlertTriangle size={18} />
      <span className="notice-text">{message}</span>
      <button className="notice-close" onClick={onClose} aria-label="閉じる">
        <X size={16} />
      </button>
    </div>
  );
}
