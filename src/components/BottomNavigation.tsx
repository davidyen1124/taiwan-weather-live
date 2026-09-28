
import { House, Map, TriangleAlert } from "lucide-react";

export type RootView = "home" | "radar" | "advisories";

type Props = {
  active: RootView;
  onNavigate: (view: RootView) => void;
};

const ITEMS = [
  { id: "home", label: "預報", Icon: House },
  { id: "radar", label: "圖資", Icon: Map },
  { id: "advisories", label: "警特報", Icon: TriangleAlert },
] as const;

export function BottomNavigation({ active, onNavigate }: Props) {
  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          type="button"
          key={id}
          className={active === id ? "active" : ""}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onNavigate(id)}
        >
          <span>
            <Icon
              size={25}
              strokeWidth={active === id ? 2.35 : 2}
              fill={active === id ? "currentColor" : "none"}
            />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
