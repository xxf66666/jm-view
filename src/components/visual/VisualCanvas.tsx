/**
 * VisualCanvas — 可视化编辑区主体（T05）
 *
 * 功能：
 * - 从 DocumentStore 读取 root，渲染卡片列表
 * - 顶部工具栏：撤销/重做，添加根节点
 * - 空文档占位提示
 * - parse 错误提示条
 *
 * T22 接入：@tanstack/react-virtual 虚拟滚动
 * T06 接入：DnD 拖拽排序
 */

import React, { useCallback } from "react";
import { Undo2, Redo2, Plus, AlertCircle } from "lucide-react";
import { EntryCard } from "./EntryCard";
import {
  useDocumentStore,
  selectRoot,
  selectParseError,
  selectCanUndo,
  selectCanRedo,
} from "../../store/document-store";
import type { JsonEntry } from "../../types/json-ast";

export function VisualCanvas() {
  const root = useDocumentStore(selectRoot);
  const parseError = useDocumentStore(selectParseError);
  const canUndo = useDocumentStore(selectCanUndo);
  const canRedo = useDocumentStore(selectCanRedo);
  const { undo, redo, insertEntry } = useDocumentStore();

  const topLevelEntries: JsonEntry[] =
    root.kind === "scalar" ? [root.entry] : root.children;

  const handleAddRootEntry = useCallback(() => {
    insertEntry([], topLevelEntries.length, {
      key: root.kind === "array" ? String(topLevelEntries.length) : "newKey",
      value: "",
      type: "string",
    });
  }, [topLevelEntries.length, root.kind, insertEntry]);

  return (
    <div className="flex flex-col h-full">
      {/* ── 工具栏 ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
        <button
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={undo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>
        <button
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={redo}
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 size={15} />
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100"
          onClick={handleAddRootEntry}
          title="添加根节点"
        >
          <Plus size={13} />
          添加
        </button>

        <div className="ml-auto text-xs text-gray-400">
          {topLevelEntries.length > 0 && `${topLevelEntries.length} 项`}
        </div>
      </div>

      {/* ── 错误提示条 ───────────────────────────────────────────────── */}
      {parseError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700 flex-shrink-0">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* ── 卡片列表区 ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {topLevelEntries.length === 0 ? (
          <EmptyState onAdd={handleAddRootEntry} />
        ) : (
          // T22: 此处替换为 @tanstack/react-virtual 虚拟列表
          <div className="space-y-1">
            {topLevelEntries.map((entry, idx) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                path={[entry.id]}
                parentType={root.kind === "array" ? "array" : root.kind === "entries" ? "object" : "root"}
                index={idx}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 空文档占位 ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Plus size={20} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">空文档</p>
      <p className="text-xs text-gray-400 mb-4">
        打开 JSON 文件，或手动添加节点开始编辑
      </p>
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600"
        onClick={onAdd}
      >
        <Plus size={14} />
        添加第一个节点
      </button>
    </div>
  );
}
