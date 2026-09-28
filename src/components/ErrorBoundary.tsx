import { Component, type ReactNode } from "react";

/** Keeps one failing screen (or a stale lazy chunk after a redeploy) from blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode; className?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={this.props.className ?? "state-screen"}>
        <div className="state-body">
          <strong>資料無法載入</strong>
          <button type="button" className="pill-button" onClick={() => location.reload()}>重新整理</button>
        </div>
      </div>
    );
  }
}
