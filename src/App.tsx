/**
 * App — 三栏主布局（T03，P0 集成验收 T10）
 *
 * 布局：
 * ┌──────────────┬────────────────────┬──────────────┐
 * │ 大纲面板      │  可视化编辑区        │ JSON 源码    │
 * │ (left panel) │  (center canvas)   │ (right panel)│
 * │  可折叠/resize│                    │ 可折叠/resize │
 * └──────────────┴────────────────────┴──────────────┘
 *
 * T10 全链路验收：
 * - 打开文件 → 卡片区渲染 → JSON 面板同步 → Undo/Redo → 保存
 * - 快捷键：Ctrl+Z(Undo) / Ctrl+Y(Redo) / Ctrl+S / Ctrl+Shift+S / Ctrl+O / Ctrl+N
 */

import React, { useState, useEffect } from "react";
import { ResizablePanel } from "./components/layout/ResizablePanel";
import { OutlinePanel } from "./components/layout/OutlinePanel";
import { VisualCanvas } from "./components/visual/VisualCanvas";
import { JsonPanel } from "./components/editor/JsonPanel";
import { useDocumentStore } from "./store/document-store";
import { useFileOps } from "./hooks/useFileOps";
import { FolderOpen, Save, FilePlus, Undo2, Redo2 } from "lucide-react";

function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const { currentPath, handleOpen, handleSave, handleSaveAs, handleNew } = useFileOps();
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const canUndo = useDocumentStore((s) => s.undoStack.length > 0);
  const canRedo = useDocumentStore((s) => s.redoStack.length > 0);

  // ── 全局键盘快捷键 ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      // Ctrl+Z — 撤销（不与输入框冲突：只在非 input/textarea 时全局触发）
      if ((e.key === "z" || e.key === "Z") && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          undo();
        }
        return;
      }

      // Ctrl+Y / Ctrl+Shift+Z — 重做
      if (
        e.key === "y" || e.key === "Y" ||
        ((e.key === "z" || e.key === "Z") && e.shiftKey)
      ) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Ctrl+S — 保存 / Ctrl+Shift+S — 另存为
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (e.shiftKey) handleSaveAs();
        else handleSave();
        return;
      }

      // Ctrl+O — 打开文件
      if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        handleOpen();
        return;
      }

      // Ctrl+N — 新建文档
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleNew();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, handleSave, handleSaveAs, handleOpen, handleNew]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* ── 菜单栏 ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-white border-b border-gray-200 flex-shrink-0">
        {/* 文件操作 */}
        <button
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100"
          onClick={handleNew}
          title="新建 (Ctrl+N)"
        >
          <FilePlus size={13} /> 新建
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100"
          onClick={handleOpen}
          title="打开 (Ctrl+O)"
        >
          <FolderOpen size={13} /> 打开
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100"
          onClick={handleSave}
          title="保存 (Ctrl+S)"
        >
          <Save size={13} /> 保存
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* 撤销/重做 */}
        <button
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={undo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={redo}
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 size={14} />
        </button>

        {/* 文件名标题 */}
        <div className="flex-1 text-center text-xs text-gray-400 truncate px-4">
          {currentPath ? currentPath.split(/[/\\]/).pop() : "未命名文档"}
        </div>
      </div>

      {/* ── 三栏布局 ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: 大纲面板 (T08/T04) */}
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
          <OutlinePanel />
        </ResizablePanel>

        {/* Center: 可视化编辑区 (T05) */}
        <main
          className="flex-1 overflow-hidden min-w-0 flex flex-col"
          aria-label="可视化编辑区"
        >
          <VisualCanvas />
        </main>

        {/* Right: JSON 源码面板 (T07) */}
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
          <JsonPanel />
        </ResizablePanel>

      </div>
    </div>
  );
}

export default App;
