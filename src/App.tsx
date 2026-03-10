/**
 * App — 三栏主布局（T03，P0-T14-T15-T16 集成）
 *
 * 布局：
 * ┌─────────────────────────────────────────────────────┐
 * │  菜单栏（文件操作 + Undo/Redo）                       │
 * ├─────────────────────────────────────────────────────┤
 * │  标签栏 TabBar（T14 多标签页）                        │
 * ├──────────────┬────────────────────┬──────────────────┤
 * │ 大纲面板      │  可视化编辑区        │ JSON 源码        │
 * └──────────────┴────────────────────┴──────────────────┘
 *
 * T14 多标签页、T15 校验、T16 草稿恢复
 */

import React, { useState, useEffect } from "react";
import { ResizablePanel } from "./components/layout/ResizablePanel";
import { TabBar } from "./components/layout/TabBar";
import { OutlinePanel } from "./components/layout/OutlinePanel";
import { VisualCanvas } from "./components/visual/VisualCanvas";
import { JsonPanel } from "./components/editor/JsonPanel";
import { CrashRecoveryDialog } from "./components/CrashRecoveryDialog";
import { useDocumentStore } from "./store/document-store";
import { useTabStore } from "./store/tab-store";
import { useFileOps } from "./hooks/useFileOps";
import { useDraftAutosave } from "./hooks/useDraftAutosave";
// 注册所有 :: 块插件（side-effect import，必须在 EntryCard 渲染前执行）
import "./components/blocks";
import { FolderOpen, Save, FilePlus, Undo2, Redo2 } from "lucide-react";

function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const { currentPath, handleOpen, handleSave, handleSaveAs } = useFileOps();
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const canUndo = useDocumentStore((s) => s.undoStack.length > 0);
  const canRedo = useDocumentStore((s) => s.redoStack.length > 0);
  const isDirty = useDocumentStore((s) => s.isDirty);

  // T14：标签页元数据同步
  const updateActiveTabMeta = useTabStore((s) => s.updateActiveTabMeta);
  const openTab = useTabStore((s) => s.openTab);
  const newTab = useTabStore((s) => s.newTab);

  // T16：草稿自动保存
  useDraftAutosave(currentPath);

  // 文件打开时同步到 Tab Manager
  const prevPathRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (currentPath && currentPath !== prevPathRef.current) {
      prevPathRef.current = currentPath;
      const content = useDocumentStore.getState().jsonString;
      const title = currentPath.split(/[/\\]/).pop() ?? "文件";
      openTab(currentPath, content, title);
    }
  }, [currentPath, openTab]);

  // isDirty 同步到当前 Tab
  useEffect(() => {
    updateActiveTabMeta({ isDirty });
  }, [isDirty, updateActiveTabMeta]);

  // ── 全局键盘快捷键 ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      if ((e.key === "z" || e.key === "Z") && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); undo(); }
        return;
      }
      if (e.key === "y" || e.key === "Y" || ((e.key === "z" || e.key === "Z") && e.shiftKey)) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); redo(); }
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        e.shiftKey ? handleSaveAs() : handleSave();
        return;
      }
      if (e.key === "o" || e.key === "O") { e.preventDefault(); handleOpen(); return; }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); newTab(); return; }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, handleSave, handleSaveAs, handleOpen, newTab]);

  const displayName = currentPath ? currentPath.split(/[/\\]/).pop() : "未命名文档";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* T16 崩溃恢复对话框 */}
      <CrashRecoveryDialog />

      {/* ── 菜单栏 ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-white border-b border-gray-200 flex-shrink-0">
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100" onClick={newTab} title="新建 (Ctrl+N)">
          <FilePlus size={13} /> 新建
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100" onClick={handleOpen} title="打开 (Ctrl+O)">
          <FolderOpen size={13} /> 打开
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100" onClick={handleSave} title="保存 (Ctrl+S)">
          <Save size={13} /> 保存
        </button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed" onClick={undo} disabled={!canUndo} title="撤销 (Ctrl+Z)">
          <Undo2 size={14} />
        </button>
        <button className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed" onClick={redo} disabled={!canRedo} title="重做 (Ctrl+Y)">
          <Redo2 size={14} />
        </button>
        <div className="flex-1 text-center text-xs text-gray-400 truncate px-4">
          {isDirty && <span className="text-blue-500 mr-1">●</span>}
          {displayName}
        </div>
      </div>

      {/* T14 标签栏 */}
      <TabBar />

      {/* ── 三栏布局 ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <ResizablePanel defaultWidth={256} minWidth={160} maxWidth={400} resizeDirection="right"
          collapsed={leftCollapsed} onCollapsedChange={setLeftCollapsed} title="大纲" ariaLabel="大纲面板">
          <OutlinePanel />
        </ResizablePanel>

        <main className="flex-1 overflow-hidden min-w-0 flex flex-col" aria-label="可视化编辑区">
          <VisualCanvas />
        </main>

        <ResizablePanel defaultWidth={320} minWidth={200} maxWidth={600} resizeDirection="left"
          collapsed={rightCollapsed} onCollapsedChange={setRightCollapsed} title="JSON" ariaLabel="JSON 源码面板">
          <JsonPanel />
        </ResizablePanel>
      </div>
    </div>
  );
}

export default App;
