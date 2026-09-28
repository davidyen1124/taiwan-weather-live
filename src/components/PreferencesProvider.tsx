
import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PREFERENCES, parsePreferences, type Preferences } from "../lib/preferences";

const PreferenceContext = createContext({
  preferences: DEFAULT_PREFERENCES,
  update: (_: Partial<Preferences>) => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setPreferences(parsePreferences(JSON.parse(localStorage.getItem("taiwan-weather.preferences.v1") ?? "null"))); }
    catch { /* Unavailable storage should not prevent using weather. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("taiwan-weather.preferences.v1", JSON.stringify(preferences)); } catch { /* Session-only preferences remain usable. */ }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = preferences.theme === "system" ? media.matches ? "dark" : "light" : preferences.theme; };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences, ready]);
  return <PreferenceContext.Provider value={{ preferences, update: patch => setPreferences(p => parsePreferences({ ...p, ...patch })) }}>{children}</PreferenceContext.Provider>;
}

export const usePreferences = () => useContext(PreferenceContext);
