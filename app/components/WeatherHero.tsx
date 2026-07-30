"use client";

import { useEffect, useMemo, useRef } from "react";

function taipeiHour(isoDate: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).formatToParts(new Date(isoDate));
  return Number(parts.find((part) => part.type === "hour")?.value ?? 12);
}

function animationName(description: string, observedAt: string) {
  const rainy = /雨|雷|陣雨/.test(description);
  const cloudy = /陰|雲/.test(description);
  const clear = /晴/.test(description);
  const hour = taipeiHour(observedAt);
  const night = hour >= 18 || hour < 6;

  if (rainy) return "lottie-top-rainy";
  if (night && clear && cloudy) return "lottie-top-partly-clear";
  if (night) return "lottie-top-moon";
  if (clear && cloudy) return "lottie-top-partly-cloudy";
  if (clear) return "lottie-top-sun";
  return "lottie-top-cloudy";
}

export function WeatherHero({
  description,
  observedAt,
}: {
  description: string;
  observedAt: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const assetName = useMemo(
    () => animationName(description, observedAt),
    [description, observedAt],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const controller = new AbortController();
    let destroy: (() => void) | undefined;

    Promise.all([
      import("lottie-web/build/player/lottie_light"),
      fetch(`/native-weather/${assetName}.json`, {
        signal: controller.signal,
      }).then((response) => response.json()),
    ])
      .then(([module, animationData]) => {
        if (controller.signal.aborted) return;
        const animation = module.default.loadAnimation({
          container,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        });
        destroy = () => animation.destroy();
      })
      .catch(() => {
        // The native artwork is decorative; weather data remains fully usable.
      });

    return () => {
      controller.abort();
      destroy?.();
      container.replaceChildren();
    };
  }, [assetName]);

  return <div className="hero-art native-weather-art" ref={containerRef} aria-hidden />;
}
