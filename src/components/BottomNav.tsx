import { Home, MapPin, Map, History, Settings } from "lucide-react";
import "./BottomNav.css";

export type TabKey = "home" | "outing" | "map" | "history" | "settings";

interface BottomNavProps {
  current: TabKey;
  onChange: (tab: TabKey) => void;
  outingActive: boolean;
}

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "ホーム", icon: Home },
  { key: "outing", label: "おでかけ", icon: MapPin },
  { key: "map", label: "マップ", icon: Map },
  { key: "history", label: "履歴", icon: History },
  { key: "settings", label: "設定", icon: Settings },
];

export function BottomNav({ current, onChange, outingActive }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={`nav-item${current === key ? " nav-item-active" : ""}`}
          onClick={() => onChange(key)}
          aria-label={label}
        >
          <span className="nav-icon-wrap">
            <Icon size={22} strokeWidth={2.2} />
            {key === "outing" && outingActive && <span className="nav-dot" />}
          </span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
