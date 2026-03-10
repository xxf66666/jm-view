/**
 * App — 主布局（T03，T10~T25 集成）
 *
 * ┌───────────────────────────────────────────────────────┐
 * │  菜单栏（文件操作 + Undo/Redo + 导入导出 + 主题切换）    │
 * ├───────────────────────────────────────────────────────┤
 * │  标签栏 TabBar（T14）                                   │
 * ├──────────────┬─────────────────────┬──────────────────┤
 * │ 大纲面板      │  可视化编辑区         │ JSON 源码        │
 * │              │  SearchPanel (T17)  │ ValidationPanel  │
 * └──────────────┴─────────────────────┴──────────────────┘
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ResizablePanel } from "./components/layout/ResizablePanel";
import { TabBar } from "./components/layout/TabBar";
import { OutlinePanel } from "./components/layout/OutlinePanel";
import { VisualCanvas } from "./components/visual/VisualCanvas";
import { JsonPanel } from "./components/editor/JsonPanel";
import { CrashRecoveryDialog } from "./components/CrashRecoveryDialog";
import { LargeFileProgress } from "./components/LargeFileProgress";
import { ThemeToggle } from "./components/ThemeToggle";
import { SearchPanel } from "./components/search/SearchPanel";
import { useDocumentStore } from "./store/document-store";
import { useTabStore } from "./store/tab-store";
import { useShortcutStore } from "./store/shortcut-store";
import { useFileOps } from "./hooks/useFileOps";
import { useDraftAutosave } from "./hooks/useDraftAutosave";
import { useLargeFileLoader } from "./hooks/useLargeFileLoader";
import { useStartupFile } from "./hooks/useStartupFile";
import { exportToMarkdown } from "./utils/markdown-export";
import { importFromMarkdown } from "./utils/markdown-import";
import { exportToHtml } from "./utils/html-export";
import { exportToPdf } from "./utils/pdf-export";
import { isTauri, invoke } from "./utils/ipc";
// 注册所有 :: 块插件（side-effect import，必须在 EntryCard 渲染前执行）
import "./components/blocks";
import {
  FolderOpen, Save, FilePlus, Undo2, Redo2,
  FileDown, FileUp, Globe, FileText
} from "lucide-react";

function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { currentPath, handleOpen, handleSave, handleSaveAs } = useFileOps();
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const canUndo = useDocumentStore((s) => s.undoStack.length > 0);
  const canRedo = useDocumentStore((s) => s.redoStack.length > 0);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const root = useDocumentStore((s) => s.root);
  const loadFromJson = useDocumentStore((s) => s.loadFromJson);

  const updateActiveTabMeta = useTabStore((s) => s.updateActiveTabMeta);
  const openTab = useTabStore((s) => s.openTab);
  const newTab = useTabStore((s) => s.newTab);

  const { matches: shortcutMatches } = useShortcutStore();
  const { state: largeFileState, cancel: cancelLargeFile } = useLargeFileLoader();

  // T16 草稿自动保存
  useDraftAutosave(currentPath);
  // T25 命令行启动参数
  useStartupFile();

  // 文件打开同步到 TabManager
  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentPath && currentPath !== prevPathRef.current) {
      prevPathRef.current = currentPath;
      const content = useDocumentStore.getState().jsonString;
      const title = currentPath.split(/[/\\]/).pop() ?? "文件";
      openTab(currentPath, content, title);
    }
  }, [currentPath, openTab]);

  useEffect(() => {
    updateActiveTabMeta({ isDirty });
  }, [isDirty, updateActiveTabMeta]);

  // ── T18 导出 Markdown ────────────────────────────────────────────────────
  const handleExportMarkdown = useCallback(async () => {
    const { markdown, attachments } = exportToMarkdown(root);
    if (isTauri()) {
      try {
        const savePath = await invoke<string>("fs_save_file_as", {
          content: markdown,
        });
        // 写附件（同目录）
        const dir = savePath.replace(/[/\\][^/\\]+$/, "");
        for (const att of attachments) {
          const attPath = `${dir}/${att.path}`;
          await invoke<void>("fs_write_binary", {
            path: attPath,
            base64: att.base64,
          }).catch(() => {/* 附件写入失败不阻塞主流程 */});
        }
      } catch {/* 用户取消 */}
    } else {
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "export.md"; a.click();
      URL.revokeObjectURL(url);
    }
  }, [root]);

  // ── T19 导入 Markdown ────────────────────────────────────────────────────
  const handleImportMarkdown = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".md,.markdown";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        const { root: newRoot, warnings } = importFromMarkdown(text);
        const json = JSON.stringify(
          newRoot.kind === "scalar"
            ? { [newRoot.entry.key]: newRoot.entry.value }
            : Object.fromEntries(newRoot.children.map((c) => [c.key, c.value])),
          null, 2
        );
        loadFromJson(json, "file");
        if (warnings.length > 0) console.info("[importMarkdown] warnings:", warnings);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadFromJson]);

  // ── T23 导出 HTML ────────────────────────────────────────────────────────
  const handleExportHtml = useCallback(() => {
    const title = currentPath?.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? "export";
    const html = exportToHtml(root, title);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title}.html`; a.click();
    URL.revokeObjectURL(url);
  }, [root, currentPath]);

  // ── T24 导出 PDF ─────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(() => {
    const title = currentPath?.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? "export";
    exportToPdf(root, title);
  }, [root, currentPath]);

  // ── 全局键盘快捷键（T20 shortcut-store）────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shortcutMatches(e, "undo")) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); undo(); }
        return;
      }
      if (shortcutMatches(e, "redo")) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); redo(); }
        return;
      }
      if (shortcutMatches(e, "save")) { e.preventDefault(); handleSave(); return; }
      if (shortcutMatches(e, "saveAs")) { e.preventDefault(); handleSaveAs(); return; }
      if (shortcutMatches(e, "open")) { e.preventDefault(); handleOpen(); return; }
      if (shortcutMatches(e, "new")) { e.preventDefault(); newTab(); return; }
      if (shortcutMatches(e, "search") || shortcutMatches(e, "replace")) {
        e.preventDefault(); setSearchOpen(true); return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, handleSave, handleSaveAs, handleOpen, newTab, shortcutMatches]);

  const displayName = currentPath ? currentPath.split(/[/\\]/).pop() : "未命名文档";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* T16 崩溃恢复 */}
      <CrashRecoveryDialog />
      {/* T22 大文件进度 */}
      <LargeFileProgress state={largeFileState} onCancel={cancelLargeFile} />

      {/* ── 菜单栏 ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex-wrap">
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={newTab} title="新建 (Ctrl+N)">
          <FilePlus size={13} /> 新建
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={handleOpen} title="打开 (Ctrl+O)">
          <FolderOpen size={13} /> 打开
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={handleSave} title="保存 (Ctrl+S)">
          <Save size={13} /> 保存
        </button>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />

        {/* T18/T19 导入导出 MD */}
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={handleImportMarkdown} title="导入 Markdown（T19）">
          <FileUp size={13} /> 导入 MD
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={handleExportMarkdown} title="导出 Markdown（T18）">
          <FileDown size={13} /> MD
        </button>
        {/* T23 HTML */}
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={handleExportHtml} title="导出 HTML（T23）">
          <Globe size={13} /> HTML
        </button>
        {/* T24 PDF */}
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700" onClick={handleExportPdf} title="导出 PDF（T24）">
          <FileText size={13} /> PDF
        </button>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
        <button className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed" onClick={undo} disabled={!canUndo} title="撤销"><Undo2 size={14} /></button>
        <button className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed" onClick={redo} disabled={!canRedo} title="重做"><Redo2 size={14} /></button>

        <div className="flex-1 text-center text-xs text-gray-400 dark:text-gray-500 truncate px-2">
          {isDirty && <span className="text-blue-500 mr-1">●</span>}
          {displayName}
        </div>

        {/* T21 主题切换 */}
        <ThemeToggle />
      </div>

      {/* T14 标签栏 */}
      <TabBar />

      {/* ── 三栏布局 ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        <ResizablePanel defaultWidth={256} minWidth={160} maxWidth={400} resizeDirection="right"
          collapsed={leftCollapsed} onCollapsedChange={setLeftCollapsed} title="大纲" ariaLabel="大纲面板">
          <OutlinePanel />
        </ResizablePanel>

        <main className="flex-1 overflow-hidden min-w-0 flex flex-col relative" aria-label="可视化编辑区">
          <VisualCanvas />
          {/* T17 搜索面板（浮层） */}
          {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
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
