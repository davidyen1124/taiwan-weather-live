import { useEffect, useRef } from "react";

const cache = new Map<string, Promise<unknown>>();
function loadAnimation(name: string) {
  if (!cache.has(name)) {
    cache.set(name, fetch(`${import.meta.env.BASE_URL}lottie/${name}.json`).then((r) => r.json()));
  }
  return cache.get(name)!;
}

/** The app's hero Lottie (250×340 comp, sky panel on the right 54%). */
export function HeroAnimation({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let destroyed = false;
    let destroy: (() => void) | undefined;
    Promise.all([import("lottie-web/build/player/lottie_light"), loadAnimation(name)])
      .then(([lottie, animationData]) => {
        if (destroyed) return;
        const animation = lottie.default.loadAnimation({
          container,
          renderer: "svg",
          loop: true,
          autoplay: !matchMedia("(prefers-reduced-motion: reduce)").matches,
          animationData,
          rendererSettings: { preserveAspectRatio: "xMaxYMax meet" },
        });
        destroy = () => animation.destroy();
      })
      .catch(() => { /* decorative */ });
    return () => {
      destroyed = true;
      destroy?.();
      container.replaceChildren();
    };
  }, [name]);
  return <div className="hero-lottie" ref={ref} aria-hidden />;
}
