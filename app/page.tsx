import { WeatherApp } from "./components/WeatherApp";
import { PreferencesProvider } from "./components/PreferencesProvider";

export default function Home() {
  return <PreferencesProvider><WeatherApp /></PreferencesProvider>;
}
