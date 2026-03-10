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

import React, { useState, useEffect } from "react";
import { ResizablePanel } from "./components/layout/ResizablePanel";
import { VisualCanvas } from "./components/visual/VisualCanvas";
import { JsonPanel } from "./components/editor/JsonPanel";
import { useDocumentStore } from "./store/document-store";

// 开发阶段默认 JSON，T13 实现文件打开后删除
const DEV_SAMPLE_JSON = JSON.stringify(
  {
    name: "Alice",
    age: 30,
    active: true,
    score: 98.5,
    tags: ["react", "tauri", "typescript"],
    address: {
      city: "Beijing",
      zip: "100000",
    },
    notes: null,
  },
  null,
  2
);

function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const loadFromJson = useDocumentStore((s) => s.loadFromJson);

  // 开发阶段预加载示例 JSON
  useEffect(() => {
    loadFromJson(DEV_SAMPLE_JSON, "file");
  }, [loadFromJson]);

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
        className="flex-1 overflow-hidden min-w-0 flex flex-col"
        aria-label="可视化编辑区"
      >
        {/* T05: 卡片渲染引擎 */}
        <VisualCanvas />
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
        {/* T07/T08: CodeMirror 6 双向同步 */}
        <JsonPanel />
      </ResizablePanel>
    </div>
  );
}

export default App;
