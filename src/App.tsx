import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import type { TabKey } from "./components/BottomNav";
import { NoticeBanner } from "./components/NoticeBanner";
import { HomePage } from "./pages/Home";
import { OutingPage } from "./pages/Outing";
import { MapPage } from "./pages/Map";
import { HistoryPage } from "./pages/History";
import { SettingsPage } from "./pages/Settings";
import { currentYearMonth } from "./utils/calculations";

function AppShell() {
  const [tab, setTab] = useState<TabKey>("home");
  const { notice, clearNotice, activeOuting } = useApp();

  const [y, m] = currentYearMonth().split("-");
  const homeSubtitle = `${y}年${parseInt(m, 10)}月`;

  return (
    <div className="app-shell">
      <Header subtitle={tab === "home" ? homeSubtitle : undefined} />
      {notice && <NoticeBanner message={notice} onClose={clearNotice} />}
      <main className="app-main">
        {tab === "home" && <HomePage onNavigate={setTab} />}
        {tab === "outing" && <OutingPage />}
        {tab === "map" && <MapPage />}
        {tab === "history" && <HistoryPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
      <BottomNav
        current={tab}
        onChange={setTab}
        outingActive={!!activeOuting}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
