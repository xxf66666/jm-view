/**
 * App — 三栏主布局（T03）
 *
 * 布局：
 * ┌──────────────┬────────────────────┬──────────────┐
 * │ 大纲面板      │  可视化编辑区        │ JSON 源码    │
 * │ (left panel) │  (center canvas)   │ (right panel)│
 * │  可折叠/resize│                    │ 可折叠/resize │
 * └──────────────┴────────────────────┴──────────────┘
 *
 * 完成标准（T03）：三栏可见，左/右面板折叠展开正常，拖拽 resize 正常
 */

import React, { useState } from "react";
import { ResizablePanel } from "./components/layout/ResizablePanel";

function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* ── Left: Outline Panel (F02, T04) ─────────────────────────────── */}
      <ResizablePanel
        defaultWidth={256}
        minWidth={160}
        maxWidth={400}
        resizeDirection="right"
        collapsed={leftCollapsed}
        onCollapsedChange={setLeftCollapsed}
        title="大纲"
        ariaLabel="大纲面板"
      >
        {/* T04 实现：读取 AST 渲染 key 树 */}
        <div className="p-4 text-sm text-gray-400">待 T04 实现</div>
      </ResizablePanel>

      {/* ── Center: Visual Canvas (F03, T05) ───────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto min-w-0"
        aria-label="可视化编辑区"
      >
        {/* T05 实现：根据 AST 渲染 key-value 卡片 */}
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400 select-none">
            <p className="text-2xl font-light mb-2">jm-view</p>
            <p className="text-sm">可视化编辑区 — 待 T05 实现</p>
          </div>
        </div>
      </main>

      {/* ── Right: JSON Source Panel (F09, T08) ─────────────────────────── */}
      <ResizablePanel
        defaultWidth={320}
        minWidth={200}
        maxWidth={600}
        resizeDirection="left"
        collapsed={rightCollapsed}
        onCollapsedChange={setRightCollapsed}
        title="JSON"
        ariaLabel="JSON 源码面板"
      >
        {/* T08 实现：CodeMirror 6 双向同步 */}
        <div className="p-4 text-sm text-gray-400">待 T08 实现</div>
      </ResizablePanel>
    </div>
  );
}

export default App;
