import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Symbol } from "./ui";

/** Full-screen in-app browser (SFSafariViewController-style chrome). */
export function WebView({ url, title, onClose }: { url: string | null; title: string; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [key, setKey] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { setLoaded(false); }, [url, key]);
  if (!url) return null;
  const host = new URL(url).host;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, url });
      else window.open(url, "_blank", "noopener");
    } catch { /* cancelled */ }
  };
  return createPortal(
    <div className="webview" role="dialog" aria-modal aria-label={title}>
      <div className="webview-bar">
        <button type="button" className="glass-circle done" aria-label="完成" onClick={onClose}><Symbol name="checkmark" size={24} strokeWidth={2.4} /></button>
        <span className="webview-title">{loaded ? title : host}</span>
        <span className="glass-pill">
          <button type="button" aria-label="重新載入" onClick={() => setKey((k) => k + 1)}><Symbol name="reload" size={24} strokeWidth={1.6} /></button>
          <button type="button" aria-label="分享" onClick={share}><Symbol name="share" size={24} strokeWidth={1.6} /></button>
        </span>
      </div>
      <div className={`webview-progress ${loaded ? "done" : ""}`} />
      <iframe key={key} ref={frame} src={url} title={title} onLoad={() => setLoaded(true)} />
    </div>,
    document.getElementById("app-overlays") ?? document.body,
  );
}
