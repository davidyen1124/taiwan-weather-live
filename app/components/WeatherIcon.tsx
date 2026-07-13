import { Cloud, CloudRain, CloudSun, Sun } from "lucide-react";

type Props = {
  description?: string | null;
  precipitation?: number;
  size?: number;
  className?: string;
};

export function WeatherIcon({
  description,
  precipitation = 0,
  size = 32,
  className,
}: Props) {
  const text = description ?? "";
  if (text.includes("雨") || precipitation >= 40) {
    return <CloudRain aria-hidden size={size} strokeWidth={1.8} className={className} />;
  }
  if (text.includes("晴")) {
    return <Sun aria-hidden size={size} strokeWidth={1.8} className={className} />;
  }
  if (text.includes("多雲")) {
    return <CloudSun aria-hidden size={size} strokeWidth={1.8} className={className} />;
  }
  return <Cloud aria-hidden size={size} strokeWidth={1.8} className={className} />;
}
