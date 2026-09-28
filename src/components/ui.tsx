import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { iconUrl } from "../lib/assets";

/** Monochrome glyph from the app's asset catalog, tinted with currentColor. */
export function Glyph({ name, size = 24, width, height, className, style }: {
  name: string; size?: number; width?: number; height?: number; className?: string; style?: CSSProperties;
}) {
  const url = iconUrl(name);
  if (name === "icon_cloud_sun_day") {
    return <span aria-hidden className={`glyph-art cloud-sun ${className ?? ""}`} style={{ width: width ?? size, height: height ?? size, ...style }} />;
  }
  return (
    <span
      aria-hidden
      className={`glyph ${className ?? ""}`}
      style={{ width: width ?? size, height: height ?? size, maskImage: `url(${url})`, WebkitMaskImage: `url(${url})`, ...style }}
    />
  );
}

/** SF Symbols–style line icons drawn for the web (SF Symbols themselves are Apple-platform only). */
export function Symbol({ name, size = 22, strokeWidth = 1.9, className }: { name: SymbolName; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {SYMBOLS[name]}
    </svg>
  );
}

export type SymbolName = keyof typeof SYMBOLS;
const SYMBOLS = {
  xmark: <path d="M6 6l12 12M18 6L6 18" />,
  checkmark: <path d="M5 12.5l4.5 4.5L19 7" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M10.3 2.8h3.4l.5 2.4 1.7.8 2.1-1.3 2.4 2.4-1.3 2.1.8 1.7 2.4.5v3.4l-2.4.5-.8 1.7 1.3 2.1-2.4 2.4-2.1-1.3-1.7.8-.5 2.4h-3.4l-.5-2.4-1.7-.8-2.1 1.3-2.4-2.4 1.3-2.1-.8-1.7-2.4-.5v-3.4l2.4-.5.8-1.7-1.3-2.1 2.4-2.4 2.1 1.3 1.7-.8z" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M7 10H5.5A1.5 1.5 0 004 11.5v8A1.5 1.5 0 005.5 21h13a1.5 1.5 0 001.5-1.5v-8a1.5 1.5 0 00-1.5-1.5H17" />
    </>
  ),
  reload: <path d="M19 12a7 7 0 11-2.05-4.95M19 4.5V8h-3.5" />,
  map: (
    <>
      <path d="M3.5 6.5l5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  mapFill: <path d="M3.5 6.5l5-2.3v13.6l-5 2.3zM10 4.2l4 1.7v13.6l-4-1.7zM15.5 5.9l5-2.3v13.6l-5 2.3z" fill="currentColor" stroke="none" />,
  house: (
    <>
      <path d="M3.5 11.2L12 3.8l8.5 7.4" />
      <path d="M5.5 9.6V20h13V9.6" />
      <path d="M10 20v-5.5h4V20" fill="currentColor" />
    </>
  ),
  houseFill: (
    <>
      <path d="M2.8 11.3L12 3.3l9.2 8" strokeWidth={2} />
      <path d="M5.2 10.2L12 4.4l6.8 5.8V20.5H14.3v-5.8H9.7v5.8H5.2z" fill="currentColor" stroke="none" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M10.3 3.9L2.6 17.6A2 2 0 004.3 20.6h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 10.5v5.2M10.8 10.5H12" strokeWidth={1.8} />
      <circle cx="12" cy="7.9" r=".6" fill="currentColor" />
      <path d="M10.6 15.8h2.8" strokeWidth={1.6} />
    </>
  ),
  alertTriangleFill: (
    <>
      <path d="M10.3 3.9L2.6 17.6A2 2 0 004.3 20.6h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" fill="currentColor" />
      <g stroke="#fff"><path d="M12 10.5v5.2M10.8 10.5H12" strokeWidth={1.8} /><path d="M10.6 15.8h2.8" strokeWidth={1.6} /></g>
      <circle cx="12" cy="7.9" r="1" fill="#fff" stroke="none" />
    </>
  ),
  cloudRain: (
    <>
      <path d="M7 15.5a4 4 0 01-.4-8 5.5 5.5 0 0110.6 1.3 3.4 3.4 0 01.3 6.7z" />
      <path d="M8.5 18l-1 2.5M12 18l-1 2.5M15.5 18l-1 2.5" />
    </>
  ),
  thermometer: (
    <>
      <path d="M10 13.6V5a2 2 0 014 0v8.6a4 4 0 11-4 0z" />
      <circle cx="12" cy="16.9" r="1.6" fill="currentColor" />
      <path d="M12 16.5V9" />
      <path d="M17 5h2.5M17 8h2.5M17 11h2.5" strokeWidth={1.5} />
    </>
  ),
  thermometerSunFill: (
    <>
      <path d="M7.5 13.3V6.2a2 2 0 014 0v7.1a3.6 3.6 0 11-4 0z" fill="currentColor" stroke="none" />
      <path d="M15 4.2l.9-1.6M17.5 7.2l1.7-.6M17.6 10.8l1.6.6M13.8 13.2l.8 1.4" strokeWidth={1.8} />
      <path d="M13.3 5.6a3.3 3.3 0 011.4 6.3" strokeWidth={1.8} />
    </>
  ),
  wind: <path d="M3 9h11a2.5 2.5 0 10-2.5-2.5M3 13h15a2.5 2.5 0 11-2.5 2.5M3 17h8" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.2a4.3 4.3 0 017.5 2.6C19.5 15.4 12 20 12 20z" />,
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.5a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.2" />
      <circle cx="12" cy="16.9" r=".5" fill="currentColor" />
    </>
  ),
  crown: <path d="M4 18h16M4.5 15.5L3.5 7l5 4 3.5-6 3.5 6 5-4-1 8.5z" />,
  listBullet: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r=".9" fill="currentColor" /><circle cx="4.5" cy="12" r=".9" fill="currentColor" /><circle cx="4.5" cy="18" r=".9" fill="currentColor" />
    </>
  ),
  halfCircle: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 3.2a8.8 8.8 0 000 17.6z" fill="currentColor" />
    </>
  ),
  bubble: <path d="M4.5 5.5h15a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H10l-4.5 3.5v-3.5h-1A1.5 1.5 0 013 16V7a1.5 1.5 0 011.5-1.5z" />,
  doc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),
  hand: <path d="M9 11V5.2a1.4 1.4 0 012.8 0V10M11.8 10V3.9a1.4 1.4 0 012.8 0V10M14.6 10V5.2a1.4 1.4 0 012.8 0v7.3c0 4.6-2.7 8-6.6 8-3.2 0-4.8-1.7-6.3-4.5l-1.6-3c-.4-.8-.1-1.6.6-1.9.7-.3 1.4 0 1.8.7L9 14" />,
  info: (
    <>
      <circle cx="12" cy="5.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M9.5 10H12v10M9.5 20h5" />
    </>
  ),
  play: <path d="M8 5.2v13.6a.8.8 0 001.2.7l11-6.8a.8.8 0 000-1.4l-11-6.8A.8.8 0 008 5.2z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  minusCircle: (
    <>
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="M7 12h10" stroke="#fff" strokeWidth={2.4} />
    </>
  ),
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="M7 12h10M12 7v10" stroke="#fff" strokeWidth={2.4} />
    </>
  ),
  grip: <path d="M4 8h16M4 12h16M4 16h16" strokeWidth={1.4} />,
  sunrise: (
    <>
      <path d="M12 2.5v5M9.5 5L12 2.5 14.5 5" />
      <path d="M3 18h18M7 18a5 5 0 0110 0" />
      <path d="M4.2 13.8l1.4.8M19.8 13.8l-1.4.8M7.5 10.3l.8 1.2M16.5 10.3l-.8 1.2" />
    </>
  ),
  sunset: (
    <>
      <path d="M12 7.5v-5M9.5 5L12 7.5 14.5 5" />
      <path d="M3 18h18M7 18a5 5 0 0110 0" />
      <path d="M4.2 13.8l1.4.8M19.8 13.8l-1.4.8M7.5 10.3l.8 1.2M16.5 10.3l-.8 1.2" />
    </>
  ),
  locationFill: <path d="M20.5 3.5L3.8 10.4c-.7.3-.6 1.2.1 1.4l7 1.3 1.3 7c.2.7 1.1.8 1.4.1z" fill="currentColor" stroke="none" />,
  magnifier: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.3 15.3L20.5 20.5" />
    </>
  ),
} as const;

export function Segmented<T extends string>({ items, value, onChange, className, variant = "white" }: {
  items: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void; className?: string; variant?: "white" | "gray";
}) {
  const index = Math.max(0, items.findIndex((i) => i.value === value));
  return (
    <div className={`segmented segmented-${variant} ${className ?? ""}`} role="tablist" style={{ ["--count" as string]: items.length, ["--index" as string]: index }}>
      <span className="segmented-thumb" aria-hidden />
      {items.map((item) => (
        <button key={item.value} type="button" role="tab" aria-selected={item.value === value} className={item.value === value ? "selected" : ""} onClick={() => onChange(item.value)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function usePresence(open: boolean, duration = 380) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [open, duration]);
  return { mounted, shown };
}

const portalRoot = () => document.getElementById("app-overlays") ?? document.body;

/** iOS page sheet (large detent). */
export function Sheet({ open, onClose, children, className, label }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; label: string }) {
  const { mounted, shown } = usePresence(open);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className={`sheet-layer ${shown ? "shown" : ""}`}>
      <div className="sheet-dim" onClick={onClose} />
      <div ref={ref} className={`sheet ${className ?? ""}`} role="dialog" aria-modal aria-label={label}>
        {children}
      </div>
    </div>,
    portalRoot(),
  );
}

export function SheetHeader({ title, onClose, leading }: { title: string; onClose?: () => void; leading?: ReactNode }) {
  return (
    <div className="sheet-header">
      <div className="sheet-header-side">{leading}</div>
      <h2>{title}</h2>
      <div className="sheet-header-side end">
        {onClose ? (
          <button type="button" className="plain-close" aria-label="關閉" onClick={onClose}>
            <Symbol name="xmark" size={26} strokeWidth={1.7} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export type AlertAction = { label: string; onPress?: () => void; checked?: boolean };

/** iOS 26 alert. Two short actions sit side by side; otherwise they stack. */
export function Alert({ open, title, message, actions, onDismiss }: {
  open: boolean; title: string; message?: string; actions: AlertAction[]; onDismiss: () => void;
}) {
  const { mounted, shown } = usePresence(open, 220);
  if (!mounted) return null;
  const inline = actions.length === 2;
  return createPortal(
    <div className={`alert-layer ${shown ? "shown" : ""}`}>
      <div className="alert-dim" />
      <div className="alert" role="alertdialog" aria-modal aria-label={title}>
        <h3 className={message ? "" : "centered"}>{title}</h3>
        {message ? <p>{message}</p> : null}
        <div className={`alert-actions ${inline ? "inline" : ""}`}>
          {actions.map((action) => (
            <button key={action.label} type="button" onClick={() => { onDismiss(); action.onPress?.(); }}>
              {action.label}{action.checked ? " ✓" : ""}
            </button>
          ))}
        </div>
      </div>
    </div>,
    portalRoot(),
  );
}

export function GlassButton({ children, onClick, label, className, disabled }: { children: ReactNode; onClick?: () => void; label: string; className?: string; disabled?: boolean }) {
  return (
    <button type="button" className={`glass-button ${className ?? ""}`} aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
