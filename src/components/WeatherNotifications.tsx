import { useEffect, useRef } from "react";
import { fetchWeatherAdvisories, type WeatherBundle } from "../lib/weather";
import { usePreferences } from "./PreferencesProvider";

export function forecastDigest(data: WeatherBundle) {
  const day = data.forecast.daily[0];
  return { title: `${data.forecast.city ?? ""} ${data.forecast.locationName} 天氣摘要`, body: day ? `${day.maxTemperature}°／${day.minTemperature}° · ${day.weatherDescription} · 降雨機率 ${day.precipitationProbability}%` : "最新天氣資料已更新" };
}

export function WeatherNotifications({ data }: { data: WeatherBundle | null }) {
  const { preferences } = usePreferences();
  const latest = useRef(data); latest.current = data;
  const sent = useRef(new Set<string>());
  useEffect(() => {
    if (!preferences.digest && !preferences.advisoryNotifications) return;
    const controller = new AbortController();
    let lastAdvisoryCheck = 0;
    const notify = (id: string, title: string, body: string) => {
      if (sent.current.has(id)) return;
      try { if (localStorage.getItem(`taiwan-weather.notice.${id}`)) return; } catch { /* Session deduplication still works. */ }
      const notice = new Notification(title, { body, tag: id });
      notice.onclick = () => { window.focus(); notice.close(); };
      sent.current.add(id);
      try { localStorage.setItem(`taiwan-weather.notice.${id}`, "sent"); } catch { /* No persistent storage. */ }
    };
    const tick = async () => {
      if (!latest.current || !("Notification" in window) || Notification.permission !== "granted") return;
      const d = latest.current;
      const now = new Date();
      const localTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (preferences.digest && localTime === preferences.digestTime) {
        const message = forecastDigest(d);
        try { notify(`digest-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`, message.title, message.body); } catch { /* Some mobile browsers only support service-worker notifications. */ }
      }
      if (preferences.advisoryNotifications && Date.now() - lastAdvisoryCheck > 300000) {
        lastAdvisoryCheck = Date.now();
        try {
          const notices = await fetchWeatherAdvisories(controller.signal);
          if (controller.signal.aborted) return;
          for (const item of notices.filter(a => a.areas.some(area => area.locationId === d.forecast.locationId))) {
            if (new Date(item.expiresAt).getTime() > Date.now()) notify(`advisory-${item.id}`, item.title, item.description);
          }
        } catch { /* The advisory screen exposes refresh errors separately. */ }
      }
    };
    void tick(); const timer = window.setInterval(() => void tick(), 30000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [preferences.digest, preferences.digestTime, preferences.advisoryNotifications]);
  return null;
}
