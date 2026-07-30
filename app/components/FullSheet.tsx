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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [title]);

  return (
    <div className={`sheet-backdrop ${presentation === "drawer" ? "drawer-backdrop" : ""}`}>
      <section
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
