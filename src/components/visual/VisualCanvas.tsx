/**
 * VisualCanvas — 可视化编辑区主体（T05 + T06 DnD）
 *
 * T06 DnD：顶层条目同级拖拽排序（@dnd-kit/core + @dnd-kit/sortable）
 *   - DragHandle：每张卡片左侧拖拽把手（GripVertical 图标）
 *   - 拖拽结束后 moveEntry() 更新 AST，undo 栈自动入栈
 *   - 嵌套子级暂不支持跨层拖拽（T22 扩展点）
 *
 * T22 接入：@tanstack/react-virtual 虚拟滚动
 */

import React, { useCallback } from "react";
import { Undo2, Redo2, Plus, AlertCircle } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { EntryCard } from "./EntryCard";
import {
  useDocumentStore,
  selectRoot,
  selectParseError,
  selectCanUndo,
  selectCanRedo,
} from "../../store/document-store";
import type { JsonEntry } from "../../types/json-ast";

// ── 可排序卡片包装 ────────────────────────────────────────────────────────

interface SortableEntryCardProps {
  entry: JsonEntry;
  index: number;
  parentKind: "object" | "array" | "root";
}

function SortableEntryCard({ entry, index, parentKind }: SortableEntryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1 group">
      {/* 拖拽把手 */}
      <button
        className="flex-shrink-0 mt-2.5 p-0.5 rounded opacity-0 group-hover:opacity-40 hover:!opacity-70 cursor-grab active:cursor-grabbing text-gray-400 touch-none"
        aria-label="拖拽排序"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <EntryCard
          entry={entry}
          path={[entry.id]}
          parentType={parentKind === "array" ? "array" : "object"}
          index={index}
          depth={0}
        />
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────

export function VisualCanvas() {
  const root = useDocumentStore(selectRoot);
  const parseError = useDocumentStore(selectParseError);
  const canUndo = useDocumentStore(selectCanUndo);
  const canRedo = useDocumentStore(selectCanRedo);
  const { undo, redo, insertEntry, moveEntry } = useDocumentStore();

  const [activeId, setActiveId] = React.useState<string | null>(null);

  const topLevelEntries: JsonEntry[] = React.useMemo(
    () => (root.kind === "scalar" ? [root.entry] : root.children),
    [root]
  );

  const parentKind: "object" | "array" | "root" =
    root.kind === "array" ? "array" : root.kind === "entries" ? "object" : "root";

  const handleAddRootEntry = useCallback(() => {
    insertEntry([], topLevelEntries.length, {
      key: root.kind === "array" ? String(topLevelEntries.length) : "newKey",
      value: "",
      type: "string",
    });
  }, [topLevelEntries.length, root.kind, insertEntry]);

  // ── DnD 传感器 ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 至少拖动 8px 才触发，避免与点击冲突
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIdx = topLevelEntries.findIndex((e) => e.id === active.id);
      const toIdx = topLevelEntries.findIndex((e) => e.id === over.id);
      if (fromIdx === -1 || toIdx === -1) return;

      // parentPath = [] 表示根层级
      moveEntry([], fromIdx, toIdx);
    },
    [topLevelEntries, moveEntry]
  );

  const activeEntry = activeId
    ? topLevelEntries.find((e) => e.id === activeId)
    : null;

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

      {/* ── 卡片列表区（T06 DnD） ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {topLevelEntries.length === 0 ? (
          <EmptyState onAdd={handleAddRootEntry} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={topLevelEntries.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {topLevelEntries.map((entry, idx) => (
                  <SortableEntryCard
                    key={entry.id}
                    entry={entry}
                    index={idx}
                    parentKind={parentKind}
                  />
                ))}
              </div>
            </SortableContext>

            {/* 拖拽幽灵：浮动显示被拖卡片 */}
            <DragOverlay>
              {activeEntry ? (
                <div className="opacity-90 shadow-lg rounded-lg">
                  <EntryCard
                    entry={activeEntry}
                    path={[activeEntry.id]}
                    parentType={parentKind === "array" ? "array" : "object"}
                    index={topLevelEntries.findIndex((e) => e.id === activeId)}
                    depth={0}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
