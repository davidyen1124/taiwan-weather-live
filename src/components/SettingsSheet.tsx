import { useEffect, useState } from "react";
import { SECTION_LABELS, SECTIONS, useStore, type SectionId, type Theme } from "../state";
import { Alert, Sheet, Symbol, type SymbolName } from "./ui";

const THEME_LABEL: Record<Theme, string> = { system: "隨系統設定", light: "亮色", dark: "暗色" };
const FEEDBACK = `mailto:support@taiwanweather.app?subject=${encodeURIComponent("天氣預報 app 建議/回報")}`;
const TERMS = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY = "https://api.taiwanweather.app/privacy_policy.html";

function Row({ icon, title, subtitle, onClick, href, chevron = true }: { icon: SymbolName; title: string; subtitle?: string; onClick?: () => void; href?: string; chevron?: boolean }) {
  const content = (
    <>
      <span className="settings-icon"><Symbol name={icon} size={26} strokeWidth={1.55} /></span>
      <span className="settings-text"><span>{title}</span>{subtitle ? <small>{subtitle}</small> : null}</span>
      {chevron ? <span className="settings-chevron"><Symbol name="chevronRight" size={16} strokeWidth={2.2} /></span> : null}
    </>
  );
  if (href) return <a className="settings-row" href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer">{content}</a>;
  return onClick ? <button type="button" className="settings-row" onClick={onClick}>{content}</button> : <div className="settings-row static">{content}</div>;
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, setPrefs } = useStore();
  const [page, setPage] = useState<"root" | "order">("root");
  const [themeAlert, setThemeAlert] = useState(false);
  useEffect(() => { if (open) setPage("root"); }, [open]);

  return (
    <Sheet open={open} onClose={onClose} label="設定" className="settings-sheet">
      <div className={`settings-pages ${page === "order" ? "pushed" : ""}`}>
        <div className="settings-page">
          <div className="settings-nav">
            <span className="glass-circle-spacer" />
            <h2>設定</h2>
            <button type="button" className="done-circle" aria-label="完成" onClick={onClose}><Symbol name="checkmark" size={24} strokeWidth={2.4} /></button>
          </div>
          <div className="settings-scroll">
            <h3>VIP 會員功能</h3>
            <div className="settings-group">
              <Row icon="listBullet" title="首頁區塊順序" onClick={() => setPage("order")} />
            </div>
            <h3>外觀</h3>
            <div className="settings-group">
              <Row icon="halfCircle" title="外觀模式" subtitle={THEME_LABEL[prefs.theme]} onClick={() => setThemeAlert(true)} />
            </div>
            <h3>聯絡我們</h3>
            <div className="settings-group">
              <Row icon="bubble" title="功能建議/意見回饋" href={FEEDBACK} />
            </div>
            <h3>關於</h3>
            <div className="settings-group">
              <Row icon="doc" title="使用者條款" href={TERMS} />
              <Row icon="hand" title="隱私權政策" href={PRIVACY} />
              <Row icon="info" title="版本" subtitle="1.7.3" chevron={false} />
            </div>
          </div>
        </div>
        <SectionOrderPage onBack={() => setPage("root")} />
      </div>
      <Alert open={themeAlert} title="背景風格" onDismiss={() => setThemeAlert(false)}
        actions={[
          ...(["system", "light", "dark"] as Theme[]).map((theme) => ({ label: THEME_LABEL[theme], checked: prefs.theme === theme, onPress: () => setPrefs({ theme }) })),
          { label: "取消" },
        ]} />
    </Sheet>
  );
}

function SectionOrderPage({ onBack }: { onBack: () => void }) {
  const { prefs, setPrefs } = useStore();
  const [revealed, setRevealed] = useState<SectionId | null>(null);
  const visible = prefs.order.filter((id) => !prefs.hidden.includes(id));
  const hidden = prefs.order.filter((id) => prefs.hidden.includes(id));

  const move = (id: SectionId, to: number) => {
    const next = visible.filter((v) => v !== id);
    next.splice(to, 0, id);
    setPrefs({ order: [...next, ...hidden] });
  };

  const startDrag = (id: SectionId, index: number, event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    const row = event.currentTarget.closest<HTMLElement>(".order-row")!;
    const pitch = row.offsetHeight;
    const startY = event.clientY;
    const onMove = (e: PointerEvent) => { row.style.transform = `translateY(${e.clientY - startY}px)`; row.classList.add("lifted"); };
    const onUp = (e: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      row.style.transform = "";
      row.classList.remove("lifted");
      const to = Math.max(0, Math.min(visible.length - 1, index + Math.round((e.clientY - startY) / pitch)));
      if (to !== index) move(id, to);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="settings-page order-page">
      <div className="settings-nav">
        <button type="button" className="glass-circle" aria-label="返回" onClick={onBack}><Symbol name="chevronLeft" size={22} strokeWidth={2.2} /></button>
        <h2>首頁區塊順序</h2>
        <button type="button" className="glass-capsule" onClick={() => setPrefs({ order: [...SECTIONS], hidden: [] })}>恢復預設</button>
      </div>
      <div className="settings-scroll">
        <h3>顯示</h3>
        <div className="settings-group order-group">
          {visible.map((id, index) => (
            <div key={id} className={`order-row ${revealed === id ? "revealed" : ""}`}>
              <button type="button" className="order-toggle remove" aria-label={`隱藏${SECTION_LABELS[id]}`} onClick={() => setRevealed(revealed === id ? null : id)}>
                <Symbol name="minusCircle" size={24} />
              </button>
              <span className="order-label">{SECTION_LABELS[id]}</span>
              <span className="order-grip" role="button" aria-label="拖曳排序" onPointerDown={(e) => startDrag(id, index, e)}><Symbol name="grip" size={26} /></span>
              <button type="button" className="order-hide" onClick={() => { setRevealed(null); setPrefs({ hidden: [...prefs.hidden, id] }); }}>隱藏</button>
            </div>
          ))}
        </div>
        <h3>隱藏</h3>
        {hidden.length ? (
          <div className="settings-group order-group">
            {hidden.map((id) => (
              <div key={id} className="order-row">
                <button type="button" className="order-toggle add" aria-label={`顯示${SECTION_LABELS[id]}`} onClick={() => setPrefs({ hidden: prefs.hidden.filter((h) => h !== id) })}>
                  <Symbol name="plusCircle" size={24} />
                </button>
                <span className="order-label">{SECTION_LABELS[id]}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
