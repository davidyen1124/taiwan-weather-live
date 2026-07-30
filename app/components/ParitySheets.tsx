"use client";

import {
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  Clock3,
  GripVertical,
  LocateFixed,
  MapPin,
  Mountain,
  Navigation,
  Plus,
  Search,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  DISTRICT_LOCATIONS,
  MOUNTAIN_LOCATIONS,
  locationDisplayName,
  type SavedWeatherLocation,
  type SearchableWeatherLocation,
} from "../lib/locations";
import type { WeatherBundle } from "../lib/weather";
import { FullSheet } from "./FullSheet";
import type { SheetName } from "./WeatherHome";

type Props = {
  active: SheetName | null;
  data: WeatherBundle;
  locations: SavedWeatherLocation[];
  selectedLocationId: string;
  onClose: () => void;
  onNavigate: (sheet: SheetName) => void;
  onSelectLocation: (location: SavedWeatherLocation) => void;
  onAddLocation: (location: SavedWeatherLocation) => void;
  onRemoveLocation: (id: string) => void;
  onMoveLocation: (id: string, direction: -1 | 1) => void;
};

type LocationManagerProps = Omit<Props, "active" | "onAddLocation">;

function LocationManagerSheet({
  data,
  locations,
  selectedLocationId,
  onClose,
  onNavigate,
  onSelectLocation,
  onRemoveLocation,
  onMoveLocation,
}: LocationManagerProps) {
  const [editing, setEditing] = useState(false);
  const currentName = `${data.forecast.city ?? data.observation.county} ${data.forecast.locationName ?? data.observation.township}`;

  return (
    <FullSheet
      title="我目前的位置"
      onClose={onClose}
      className="locations-sheet"
      headerAction={
        locations.length ? (
          <button
            type="button"
            className="sheet-text-action"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "完成" : "編輯"}
          </button>
        ) : null
      }
    >
      <button
        type="button"
        className="add-location-button"
        onClick={() => onNavigate("location-search")}
      >
        <span>
          <Plus size={22} />
        </span>
        <div>
          <strong>新增位置</strong>
          <small>搜尋全台鄉鎮與 151 座山</small>
        </div>
      </button>

      <div className="locations-title-row">
        <h3>已儲存的位置</h3>
        <span>{locations.length} 個</span>
      </div>

      {locations.length ? (
        <div className={`saved-location-list ${editing ? "is-editing" : ""}`}>
          {locations.map((location, index) => {
            const selected = location.id === selectedLocationId;
            return (
              <div
                className={`saved-location-row ${selected ? "selected" : ""}`}
                key={location.id}
              >
                {editing ? <GripVertical className="location-grip" size={21} /> : null}
                <button
                  type="button"
                  className="saved-location-main"
                  onClick={() => onSelectLocation(location)}
                >
                  <span className="location-kind-icon">
                    {location.kind === "current" ? (
                      <LocateFixed size={21} />
                    ) : location.kind === "mountain" ? (
                      <Mountain size={21} />
                    ) : (
                      <MapPin size={21} />
                    )}
                  </span>
                  <span>
                    <strong>
                      {location.kind === "current"
                        ? selected
                          ? currentName
                          : "我目前的位置"
                        : locationDisplayName(location)}
                    </strong>
                    <small>
                      {location.kind === "current"
                        ? "目前位置"
                        : location.kind === "mountain"
                          ? "山岳預報"
                          : "鄉鎮預報"}
                    </small>
                  </span>
                  {selected ? (
                    <span className="selected-location-indicator">
                      <Check size={16} /> 顯示中
                    </span>
                  ) : (
                    <Navigation size={18} />
                  )}
                </button>

                {editing ? (
                  <div className="location-edit-controls">
                    <button
                      type="button"
                      aria-label={`上移${location.name}`}
                      disabled={index === 0}
                      onClick={() => onMoveLocation(location.id, -1)}
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label={`下移${location.name}`}
                      disabled={index === locations.length - 1}
                      onClick={() => onMoveLocation(location.id, 1)}
                    >
                      <ArrowDown size={17} />
                    </button>
                    <button
                      type="button"
                      className="remove-location-button"
                      aria-label={`移除${location.name}`}
                      onClick={() => onRemoveLocation(location.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="locations-empty-state">
          <MapPin size={34} />
          <strong>尚未加入位置</strong>
          <span>你可以加入常用地點，也能重新加入目前位置。</span>
          <button type="button" onClick={() => onNavigate("location-search")}>
            新增第一個位置
          </button>
        </div>
      )}

      <p className="location-storage-note">
        點按「編輯」即可移除位置或調整顯示順序。
      </p>
    </FullSheet>
  );
}

function LocationSearchSheet({
  locations,
  onClose,
  onNavigate,
  onAddLocation,
}: Pick<Props, "locations" | "onClose" | "onNavigate" | "onAddLocation">) {
  const [category, setCategory] = useState<"district" | "mountain">("district");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const savedIds = useMemo(
    () => new Set(locations.map((location) => location.id)),
    [locations],
  );

  const results = useMemo(() => {
    const source =
      category === "district" ? DISTRICT_LOCATIONS : MOUNTAIN_LOCATIONS;
    const normalized = deferredQuery
      .trim()
      .replaceAll("臺", "台")
      .replaceAll(/\s+/g, "");
    if (!normalized) return source.slice(0, category === "district" ? 40 : 151);
    return source
      .filter((location) => location.searchText.includes(normalized))
      .slice(0, 100);
  }, [category, deferredQuery]);

  function addLocation(location: SearchableWeatherLocation) {
    if (savedIds.has(location.id)) return;
    onAddLocation({
      id: location.id,
      name: location.name,
      city: location.city,
      kind: location.kind,
      coordinates: location.coordinates,
    });
    onNavigate("locations");
  }

  return (
    <FullSheet
      title="新增位置"
      onClose={onClose}
      className="location-search-sheet"
      headerAction={
        <button
          type="button"
          className="sheet-text-action"
          onClick={() => onNavigate("locations")}
        >
          返回
        </button>
      }
    >
      <label className="location-search-field">
        <Search size={20} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={category === "district" ? "搜尋縣市或鄉鎮" : "搜尋山名，例如：中央尖山"}
          autoComplete="off"
        />
      </label>

      <div className="segmented-control location-category-tabs">
        <button
          type="button"
          className={category === "district" ? "active" : ""}
          onClick={() => setCategory("district")}
        >
          城市與鄉鎮
        </button>
        <button
          type="button"
          className={category === "mountain" ? "active" : ""}
          onClick={() => setCategory("mountain")}
        >
          151 座山
        </button>
      </div>

      <button
        type="button"
        className={`current-location-search-row ${savedIds.has("current-location") ? "saved" : ""}`}
        disabled={savedIds.has("current-location")}
        onClick={() => {
          onAddLocation({
            id: "current-location",
            name: "目前位置",
            city: "使用裝置定位",
            kind: "current",
            coordinates: null,
          });
          onNavigate("locations");
        }}
      >
        <span><LocateFixed size={21} /></span>
        <div><strong>目前位置</strong><small>使用瀏覽器定位</small></div>
        {savedIds.has("current-location") ? <Check size={19} /> : <Plus size={19} />}
      </button>

      <div className="search-result-heading">
        <strong>{query ? "搜尋結果" : category === "district" ? "所有地區" : "山岳地點"}</strong>
        <span>{results.length} 筆</span>
      </div>

      <div className="location-search-results">
        {results.map((location) => {
          const saved = savedIds.has(location.id);
          return (
            <button
              type="button"
              key={location.id}
              disabled={saved}
              onClick={() => addLocation(location)}
            >
              <span className="result-icon">
                {location.kind === "mountain" ? <Mountain size={20} /> : <MapPin size={20} />}
              </span>
              <span>
                <strong>{location.name}</strong>
                <small>{location.city} · {location.kind === "mountain" ? "山岳預報" : "鄉鎮預報"}</small>
              </span>
              {saved ? <Check size={18} /> : <Plus size={18} />}
            </button>
          );
        })}
      </div>

      {!results.length ? (
        <div className="search-no-results">
          <Search size={28} />
          <strong>找不到「{query}」</strong>
          <span>試試縣市、鄉鎮或山岳的完整名稱。</span>
        </div>
      ) : null}
    </FullSheet>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`native-switch ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function NotificationSettingsSheet({ onClose }: Pick<Props, "onClose">) {
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [liveActivityEnabled, setLiveActivityEnabled] = useState(true);
  const [digestTime, setDigestTime] = useState("07:30");

  return (
    <FullSheet title="通知設定" onClose={onClose} className="settings-sheet">
      <div className="settings-section">
        <h3>天氣摘要</h3>
        <div className="settings-group">
          <div className="settings-row">
            <span className="settings-icon blue"><Bell size={19} /></span>
            <div>
              <strong>每日天氣摘要</strong>
              <small>在指定時間顯示今日天氣</small>
            </div>
            <Toggle
              checked={digestEnabled}
              onChange={setDigestEnabled}
              label="每日天氣摘要"
            />
          </div>
          <label className={`settings-row ${digestEnabled ? "" : "disabled"}`}>
            <span className="settings-icon orange"><Clock3 size={19} /></span>
            <div><strong>通知時間</strong></div>
            <input
              type="time"
              value={digestTime}
              disabled={!digestEnabled}
              onChange={(event) => setDigestTime(event.target.value)}
            />
          </label>
        </div>
        <p>開啟後，瀏覽器會依照你的通知權限顯示天氣摘要。</p>
      </div>

      <div className="settings-section">
        <h3>即時資訊</h3>
        <div className="settings-group">
          <div className="settings-row">
            <span className="settings-icon purple"><Smartphone size={19} /></span>
            <div>
              <strong>即時動態</strong>
              <small>在支援的裝置上顯示最新天氣</small>
            </div>
            <Toggle
              checked={liveActivityEnabled}
              onChange={setLiveActivityEnabled}
              label="即時動態"
            />
          </div>
        </div>
      </div>

      <div className="notification-preview">
        <span>天氣預報</span>
        <strong>早安，今天 30°／25°</strong>
        <p>白天多雲，午後有短暫雷陣雨，出門記得帶傘。</p>
      </div>
    </FullSheet>
  );
}

export function ParitySheets(props: Props) {
  if (props.active === "locations") {
    return <LocationManagerSheet {...props} />;
  }
  if (props.active === "location-search") {
    return <LocationSearchSheet {...props} />;
  }
  if (props.active === "notifications") {
    return <NotificationSettingsSheet onClose={props.onClose} />;
  }
  return null;
}
