import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES, CURRENT_LOCATION, MOUNTAINS, normalize, type SavedLocation } from "../lib/locations";
import { useStore } from "../state";
import { Glyph, Segmented, Sheet, Symbol } from "./ui";

type Row = { key: string; kind: "header" | "item"; location?: SavedLocation; label: string; sub?: string };

export function AddLocationSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const { locations, addLocation, locate } = useStore();
  const [tab, setTab] = useState<"city" | "mountain">("city");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQuery(""); setTab("city"); } }, [open]);

  const rows = useMemo<Row[]>(() => {
    const q = normalize(query);
    const out: Row[] = [];
    if (tab === "city") {
      if (!locations.some((l) => l.kind === "current") && (!q || normalize("我目前的位置目前位置").includes(q))) {
        out.push({ key: "current", kind: "item", location: CURRENT_LOCATION, label: "我目前的位置" });
      }
      for (const city of CITIES) {
        const matches = city.districts.filter((d) => !q || normalize(`${d.city}${d.name}`).includes(q));
        if (!q) out.push({ key: city.name, kind: "header", label: city.name });
        for (const d of matches) out.push({ key: d.id, kind: "item", location: d, label: `${d.city}, ${d.name}` });
      }
    } else {
      for (const m of MOUNTAINS) {
        if (!q || normalize(`${m.name}${m.city}`).includes(q)) out.push({ key: m.id, kind: "item", location: m, label: m.name, sub: m.city });
      }
    }
    return out;
  }, [tab, query, locations]);

  const choose = (location: SavedLocation) => {
    if (location.kind === "current") locate();
    addLocation(location);
    onAdded();
  };

  return (
    <Sheet open={open} onClose={onClose} label="新增地點" className="add-sheet">
      <div className="add-header">
        <button type="button" className="glass-circle" aria-label="關閉" onClick={onClose}><Symbol name="xmark" size={24} strokeWidth={1.8} /></button>
        <h2>想看哪裡的天氣？</h2>
        <span className="glass-circle-spacer" />
      </div>
      <Segmented className="add-segmented" items={[{ value: "city", label: "城市" }, { value: "mountain", label: "山區" }]} value={tab} onChange={(v) => { setTab(v); setQuery(""); }} />
      <div className="add-list">
        {rows.map((row) =>
          row.kind === "header" ? (
            <div key={row.key} className="add-row header">{row.label}</div>
          ) : (
            <button key={row.key} type="button" className="add-row" onClick={() => choose(row.location!)}>
              {row.sub ? <><strong>{row.label}</strong><span>{row.sub}</span></> : row.label}
            </button>
          ),
        )}
      </div>
      <div className="add-search">
        <label className="search-field">
          <Glyph name="icon_search_magifier" size={20} />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "city" ? "例：台北市、安平區" : "例：雪山、玉山"} enterKeyHint="search" />
        </label>
        <button type="button" className="search-close" aria-label={query ? "清除" : "關閉"} onClick={() => (query ? setQuery("") : onClose())}>
          <Symbol name="xmark" size={24} strokeWidth={1.6} />
        </button>
      </div>
    </Sheet>
  );
}
