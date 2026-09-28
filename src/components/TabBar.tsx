import { Symbol } from "./ui";

export type Tab = "home" | "maps" | "advisories";

const TABS: Array<{ id: Tab; label: string; icon: "house" | "map" | "alertTriangle"; active: "houseFill" | "mapFill" | "alertTriangleFill" }> = [
  { id: "home", label: "預報", icon: "house", active: "houseFill" },
  { id: "maps", label: "圖資", icon: "map", active: "mapFill" },
  { id: "advisories", label: "警特報", icon: "alertTriangle", active: "alertTriangleFill" },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const index = TABS.findIndex((t) => t.id === tab);
  return (
    <nav className="tab-bar" aria-label="主要頁面" style={{ ["--tab-index" as string]: index }}>
      <span className="tab-highlight" aria-hidden />
      {TABS.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className={t.id === tab ? "active" : ""} onClick={() => onChange(t.id)}>
          <Symbol name={t.id === tab ? t.active : t.icon} size={28} strokeWidth={1.7} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
