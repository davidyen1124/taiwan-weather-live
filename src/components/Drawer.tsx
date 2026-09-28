import { useEffect, useRef, useState } from "react";
import { reading } from "../lib/api";
import type { SavedLocation } from "../lib/locations";
import { useStore, weatherKey } from "../state";
import { LocateButton } from "./AddLocationSheet";
import { Symbol } from "./ui";

export function Drawer({ open, onClose, onAdd, onSettings }: { open: boolean; onClose: () => void; onAdd: () => void; onSettings: () => void }) {
  const { locations, setLocations, setPage, weather, ensureWeather } = useStore();
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) locations.forEach((l) => ensureWeather(l));
    else setEditing(false);
  }, [open, locations, ensureWeather]);

  const remove = (index: number) => {
    const next = locations.filter((_, i) => i !== index);
    setLocations(next);
    if (!next.length) onClose();
  };

  const startDrag = (index: number, event: React.PointerEvent) => {
    event.preventDefault();
    const list = listRef.current;
    if (!list) return;
    const rows = [...list.querySelectorAll<HTMLElement>(".drawer-row")];
    const pitch = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : 87;
    const startY = event.clientY;
    let current = index;
    setDragging(index);
    const move = (e: PointerEvent) => {
      const offset = e.clientY - startY;
      rows[index].style.transform = `translateY(${offset}px)`;
      current = Math.max(0, Math.min(locations.length - 1, index + Math.round(offset / pitch)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      rows[index].style.transform = "";
      setDragging(null);
      if (current !== index) {
        const next = [...locations];
        const [item] = next.splice(index, 1);
        next.splice(current, 0, item);
        setLocations(next);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className={`drawer-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="drawer-dim" onClick={onClose} />
      <aside className={`drawer ${editing ? "editing" : ""}`} aria-label="地點列表">
        <div className="drawer-top">
          <button type="button" onClick={() => setEditing((e) => !e)}>{editing ? "完成" : "編輯"}</button>
          <button type="button" onClick={onAdd}>新增</button>
        </div>
        {!editing ? <LocateButton className="in-drawer" onLocated={onClose} /> : null}
        <div className="drawer-list" ref={listRef}>
          {locations.map((location, index) => {
            const data = weather[weatherKey(location)]?.data;
            const temp = data ? reading(data.observation?.temperature) ?? data.forecast.hourly[0]?.temperature : null;
            return (
              <div className={`drawer-row ${dragging === index ? "dragging" : ""}`} key={location.id}>
                <button type="button" className="drawer-remove" aria-label={`刪除${label(location)}`} onClick={() => remove(index)}>
                  <Symbol name="minusCircle" size={24} />
                </button>
                <button type="button" className="drawer-card" disabled={editing} onClick={() => { setPage(index); onClose(); }}>
                  <span className="drawer-name">
                    {location.kind === "mountain" ? location.name : <>{location.city}<span>{location.name}</span></>}
                  </span>
                  {location.located ? <Symbol name="locationFill" size={16} className="drawer-arrow" /> : null}
                  <span className="drawer-temp">{editing || temp == null ? "" : `${Math.round(temp)}°`}</span>
                </button>
                <span className="drawer-grip" onPointerDown={(e) => startDrag(index, e)} aria-label="拖曳排序" role="button">
                  <Symbol name="grip" size={26} />
                </span>
              </div>
            );
          })}
        </div>
        <button type="button" className="drawer-settings" aria-label="設定" onClick={onSettings}>
          <Symbol name="gear" size={26} strokeWidth={1.6} />
        </button>
      </aside>
    </div>
  );
}

const label = (l: SavedLocation) => `${l.city}${l.name}`;
