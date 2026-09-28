import { useEffect, useState } from "react";
import { fetchAdvisories, type WeatherAdvisory } from "../lib/api";
import { relativePublished } from "../lib/format";
import { Symbol, type SymbolName } from "./ui";

const TYPE_STYLE: Record<string, { icon: SymbolName; color: string }> = {
  high_temperature: { icon: "thermometerSunFill", color: "#F28C38" },
  rain: { icon: "cloudRain", color: "#2F8CF0" },
};

type Group = { type: string; title: string; latest: WeatherAdvisory; description: string };

export function AdvisoriesScreen({ onOpen }: { onOpen: (url: string, title: string) => void }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchAdvisories(controller.signal)
      .then((list) => {
        const byType = new Map<string, WeatherAdvisory[]>();
        for (const a of list) byType.set(a.type, [...(byType.get(a.type) ?? []), a]);
        setGroups([...byType.entries()].map(([type, items]) => {
          const latest = [...items].sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
          return { type, title: latest.title || latest.headline, latest, description: latest.description };
        }));
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);

  return (
    <main className="advisories">
      <h1 className="screen-title">天氣警特報</h1>
      <div className="advisory-list">
        {error ? (
          <div className="advisory-empty"><strong>資料無法載入</strong></div>
        ) : !groups ? (
          <div className="advisory-empty"><span className="spinner" /></div>
        ) : groups.length === 0 ? (
          <div className="advisory-empty"><strong>目前沒有天氣警特報</strong><span>太棒啦！天氣狀況很穩定🎉</span></div>
        ) : groups.map((group) => {
          const style = TYPE_STYLE[group.type] ?? { icon: "alertTriangleFill" as SymbolName, color: "#F2A33A" };
          return (
            <button type="button" className="advisory-card" key={group.type}
              onClick={() => group.latest.webUrl && onOpen(group.latest.webUrl, group.title)}>
              <span className="advisory-head">
                <span className="advisory-icon" style={{ background: style.color }}><Symbol name={style.icon} size={26} strokeWidth={2} /></span>
                <strong>{group.title}</strong>
                <span className="advisory-time">{relativePublished(group.latest.effectiveAt)}</span>
                <Symbol name="chevronRight" size={14} strokeWidth={2.4} className="advisory-chevron" />
              </span>
              <span className="advisory-body"><span>{group.description}</span></span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
