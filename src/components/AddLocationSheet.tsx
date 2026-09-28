import { useEffect, useMemo, useState } from "react";
import { CITIES, MOUNTAINS, normalize, type SavedLocation } from "../lib/locations";
import { useStore } from "../state";
import { Glyph, Segmented, Sheet, Symbol } from "./ui";

type Row = { key: string; kind: "header" | "item"; location?: SavedLocation; label: string; sub?: string };

function useRows(tab: "city" | "mountain", query: string) {
  return useMemo<Row[]>(() => {
    const q = normalize(query);
    const out: Row[] = [];
    if (tab === "city") {
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
  }, [tab, query]);
}

/** 定位目前位置 — the only place the site asks the browser for a location. */
export function LocateButton({ onLocated, className }: { onLocated?: () => void; className?: string }) {
  const { locateMe, locating } = useStore();
  return (
    <button type="button" className={`locate-button ${className ?? ""}`} disabled={locating}
      onClick={async () => { if (await locateMe()) onLocated?.(); }}>
      {locating ? <span className="spinner tiny" aria-hidden /> : <Symbol name="locationFill" size={18} />}
      <span>{locating ? "定位中…" : "定位目前位置"}</span>
    </button>
  );
}

function PickerList({ tab, query, onPick }: { tab: "city" | "mountain"; query: string; onPick: (l: SavedLocation) => void }) {
  const rows = useRows(tab, query);
  return (
    <div className="add-list">
      {rows.map((row) =>
        row.kind === "header" ? (
          <div key={row.key} className="add-row header">{row.label}</div>
        ) : (
          <button key={row.key} type="button" className="add-row" onClick={() => onPick(row.location!)}>
            {row.sub ? <><strong>{row.label}</strong><span>{row.sub}</span></> : row.label}
          </button>
        ),
      )}
      {!rows.length ? <div className="add-empty">找不到「{query}」</div> : null}
    </div>
  );
}

function SearchField({ tab, query, setQuery }: { tab: "city" | "mountain"; query: string; setQuery: (q: string) => void }) {
  return (
    <label className="search-field">
      <Glyph name="icon_search_magifier" size={20} />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "city" ? "例：台北市、安平區" : "例：雪山、玉山"} enterKeyHint="search" />
    </label>
  );
}

export function AddLocationSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const { addLocation } = useStore();
  const [tab, setTab] = useState<"city" | "mountain">("city");
  const [query, setQuery] = useState("");
  useEffect(() => { if (open) { setQuery(""); setTab("city"); } }, [open]);

  return (
    <Sheet open={open} onClose={onClose} label="新增地點" className="add-sheet">
      <div className="add-header">
        <button type="button" className="glass-circle" aria-label="關閉" onClick={onClose}><Symbol name="xmark" size={24} strokeWidth={1.8} /></button>
        <h2>想看哪裡的天氣？</h2>
        <span className="glass-circle-spacer" />
      </div>
      <LocateButton className="in-sheet" onLocated={onAdded} />
      <Segmented className="add-segmented" items={[{ value: "city", label: "城市" }, { value: "mountain", label: "山區" }]} value={tab} onChange={(v) => { setTab(v); setQuery(""); }} />
      <PickerList tab={tab} query={query} onPick={(l) => { addLocation(l); onAdded(); }} />
      <div className="add-search">
        <SearchField tab={tab} query={query} setQuery={setQuery} />
        <button type="button" className="search-close" aria-label={query ? "清除" : "關閉"} onClick={() => (query ? setQuery("") : onClose())}>
          <Symbol name="xmark" size={24} strokeWidth={1.6} />
        </button>
      </div>
    </Sheet>
  );
}

/** First visit (no favourites yet): pick a place, or opt in to 定位目前位置. */
export function LocationPickerPage() {
  const { addLocation } = useStore();
  const [tab, setTab] = useState<"city" | "mountain">("city");
  const [query, setQuery] = useState("");
  return (
    <main className="picker-page">
      <h1>想看哪裡的天氣？</h1>
      <p>選擇城市或山區加入我的地點，隨時查看當地天氣</p>
      <LocateButton />
      <div className="picker-search"><SearchField tab={tab} query={query} setQuery={setQuery} /></div>
      <Segmented className="add-segmented" items={[{ value: "city", label: "城市" }, { value: "mountain", label: "山區" }]} value={tab} onChange={(v) => { setTab(v); setQuery(""); }} />
      <PickerList tab={tab} query={query} onPick={addLocation} />
    </main>
  );
}
