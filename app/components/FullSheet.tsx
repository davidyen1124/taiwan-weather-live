"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type Props = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  presentation?: "sheet" | "drawer";
  headerAction?: React.ReactNode;
  closePosition?: "left" | "right";
};

export function FullSheet({
  title,
  children,
  onClose,
  className = "",
  presentation = "sheet",
  headerAction,
  closePosition = "left",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? []);
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog?.addEventListener("keydown", keydown);
    return () => { dialog?.removeEventListener("keydown", keydown); if (previous?.isConnected) previous.focus(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [title]);

  return (
    <div className={`sheet-backdrop ${presentation === "drawer" ? "drawer-backdrop" : ""}`}>
      <section
        ref={dialogRef}
        className={`detail-sheet ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className={`sheet-header close-${closePosition}`}>
          <button
            className="sheet-close-button"
            type="button"
            onClick={onClose}
            aria-label={`關閉${title}`}
          >
            <X size={27} />
          </button>
          <h2>{title}</h2>
          <div className="sheet-header-actions">
            {headerAction}
          </div>
        </header>
        <div className="sheet-scroll" ref={scrollRef}>
          {children}
        </div>
      </section>
    </div>
  );
}
