import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PreferencesProvider } from "./components/PreferencesProvider";
import { WeatherApp } from "./components/WeatherApp";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreferencesProvider>
      <WeatherApp />
    </PreferencesProvider>
  </StrictMode>,
);
