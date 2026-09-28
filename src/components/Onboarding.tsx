import { useRef, useState } from "react";
import { artUrl } from "../lib/assets";

const PAGES = [
  { art: "onboarding_image_1", title: "使用氣象署資料", body: "比內建準很多！\n精準預報、空氣品質、體感溫度，一個 App 全部掌握！" },
  { art: "onboarding_image_4", title: "桌面小工具", body: "不用開 App\n天氣預報、空氣品質即時掌握" },
  { art: "onboarding_image_2", title: "7 天預報", body: "天氣趨勢提前規劃，不怕突然下雨！" },
  { art: "onboarding_image_3", title: "空氣品質監測", body: "使用台灣政府在地測站資料，準確好用！\n戶外活動提前安排" },
];

export function Onboarding({ onLocate, onManual }: { onLocate: () => void; onManual: () => void }) {
  const [page, setPage] = useState(0);
  const [step, setStep] = useState<"intro" | "location">("intro");
  const scroller = useRef<HTMLDivElement>(null);

  const go = (index: number) => {
    scroller.current?.scrollTo({ left: index * scroller.current.clientWidth, behavior: "smooth" });
    setPage(index);
  };

  if (step === "location") {
    return (
      <div className="onboarding location-step">
        <div className="onboarding-page">
          <img className="onboarding-art" src={artUrl("onboarding_image_location")} alt="" />
          <h1>開啟定位服務，給你準確預報</h1>
          <p>{"根據您目前位置提供最新天氣資訊\n僅用於當下查詢，我們不會儲存或追蹤你的位置"}</p>
        </div>
        <div className="onboarding-actions">
          <button type="button" className="onboarding-button" onClick={onLocate}>開始使用</button>
          <button type="button" className="onboarding-link" onClick={onManual}>先手動搜尋城市</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div className="onboarding-pages" ref={scroller} onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {PAGES.map((p) => (
          <div className="onboarding-page" key={p.art}>
            <img className="onboarding-art" src={artUrl(p.art)} alt="" />
            <span className="onboarding-dots-space" />
            <h1>{p.title}</h1>
            <p>{p.body}</p>
          </div>
        ))}
      </div>
      <div className="onboarding-dots" aria-hidden>
        {PAGES.map((p, i) => <span key={p.art} className={i === page ? "active" : ""} />)}
      </div>
      <div className="onboarding-actions">
        <button type="button" className="onboarding-button" onClick={() => (page < PAGES.length - 1 ? go(page + 1) : setStep("location"))}>
          {page < PAGES.length - 1 ? "繼續" : "開始使用"}
        </button>
      </div>
    </div>
  );
}
