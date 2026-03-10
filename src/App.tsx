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
import { OutlinePanel } from "./components/layout/OutlinePanel";
import { VisualCanvas } from "./components/visual/VisualCanvas";
import { JsonPanel } from "./components/editor/JsonPanel";
import { useDocumentStore } from "./store/document-store";
import { useFileOps } from "./hooks/useFileOps";
import { FolderOpen, Save, FilePlus } from "lucide-react";

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
  const { currentPath, handleOpen, handleSave, handleSaveAs, handleNew } = useFileOps();

  // 开发阶段预加载示例 JSON
  useEffect(() => {
    loadFromJson(DEV_SAMPLE_JSON, "file");
  }, [loadFromJson]);

  // Ctrl+S 保存 / Ctrl+Shift+S 另存为 / Ctrl+O 打开
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (e.shiftKey) handleSaveAs();
        else handleSave();
      }
      if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        handleOpen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, handleSaveAs, handleOpen]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* ── 菜单栏（T13 文件操作） ────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100"
          onClick={handleNew}
          title="新建 (Ctrl+N)"
        >
          <FilePlus size={13} /> 新建
        </button>
        <button
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100"
          onClick={handleOpen}
          title="打开 (Ctrl+O)"
        >
          <FolderOpen size={13} /> 打开
        </button>
        <button
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100"
          onClick={handleSave}
          title="保存 (Ctrl+S)"
        >
          <Save size={13} /> 保存
        </button>
        <div className="flex-1 text-center text-xs text-gray-400 truncate px-4">
          {currentPath
            ? currentPath.split(/[/\\]/).pop()
            : "未命名文档"}
        </div>
      </div>

      {/* ── 三栏布局 ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
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
        {/* T08（sprint）/ T04（MVF）：大纲面板 */}
        <OutlinePanel />
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
      </div>{/* end 三栏布局 */}
    </div>
  );
}

export default App;
