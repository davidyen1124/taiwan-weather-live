import { lazy, Suspense, useCallback, useState } from "react";
import { AddLocationSheet } from "./components/AddLocationSheet";
import { AdvisoriesScreen } from "./components/Advisories";
import { Drawer } from "./components/Drawer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HourlySheet, WeekSheet } from "./components/ForecastSheets";
import { HomeScreen } from "./components/Home";
import { Onboarding } from "./components/Onboarding";
import { SettingsSheet } from "./components/SettingsSheet";
import { TabBar, type Tab } from "./components/TabBar";
import { Alert } from "./components/ui";
import { WebView } from "./components/WebView";
import { useStore, weatherKey } from "./state";

const MapsScreen = lazy(() => import("./components/Maps").then((m) => ({ default: m.MapsScreen })));

type Overlay = "drawer" | "add" | "settings" | "week" | "hourly" | "aqi-help" | null;

export function App() {
  const { prefs, setPrefs, locations, page, weather, locate } = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [web, setWeb] = useState<{ url: string; title: string } | null>(null);

  const location = locations[Math.min(page, locations.length - 1)];
  const data = location ? weather[weatherKey(location)]?.data : undefined;
  const close = useCallback(() => setOverlay(null), []);

  if (!prefs.onboarded) {
    return (
      <div className="app">
        <Onboarding
          onLocate={() => { locate(); setPrefs({ onboarded: true }); }}
          onManual={() => { setPrefs({ onboarded: true }); setOverlay("add"); }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="screens">
        <div className="screen" hidden={tab !== "home"}>
          <HomeScreen
            openDrawer={() => setDrawerOpen(true)}
            openWeek={() => setOverlay("week")}
            openHourly={() => setOverlay("hourly")}
            openAqiHelp={() => setOverlay("aqi-help")}
            openAddLocation={() => setOverlay("add")}
          />
        </div>
        {tab === "maps" ? <div className="screen"><ErrorBoundary><Suspense fallback={null}><MapsScreen /></Suspense></ErrorBoundary></div> : null}
        {tab === "advisories" ? <div className="screen"><AdvisoriesScreen onOpen={(url, title) => setWeb({ url, title })} /></div> : null}
      </div>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onAdd={() => setOverlay("add")} onSettings={() => setOverlay("settings")} />
      <TabBar tab={tab} onChange={(next) => { setTab(next); setDrawerOpen(false); }} />
      <WeekSheet open={overlay === "week"} onClose={close} data={data} />
      <HourlySheet open={overlay === "hourly"} onClose={close} data={data} />
      <AddLocationSheet open={overlay === "add"} onClose={close} onAdded={() => { setOverlay(null); }} />
      <SettingsSheet open={overlay === "settings"} onClose={close} />
      <Alert open={overlay === "aqi-help"} title="空氣品質建議" message="本資訊僅針對「空氣品質」提供建議，並未納入是否下雨等其他天氣因素。" actions={[{ label: "了解" }]} onDismiss={close} />
      <WebView url={web?.url ?? null} title={web?.title ?? ""} onClose={() => setWeb(null)} />
    </div>
  );
}
