/**
 * OutlinePanel — 大纲面板（T08，sprint 编号；对应 MVF T04）
 *
 * 设计原则：
 * - **严格只读**：不写 Store，无任何 dispatch 操作
 * - 只渲染第一层 key；嵌套 object/array 显示折叠图标
 * - 点击节点：`scrollIntoView({ behavior: 'smooth', block: 'nearest' })` 跳转卡片
 * - 面板内展开/折叠是本地 UI 状态，不影响 DocumentStore
 *
 * 完成标准（T08）：点击大纲节点，中间区域正确滚动定位
 */

import React, { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Braces, List } from "lucide-react";
import { useDocumentStore, selectRoot } from "../../store/document-store";
import type { JsonEntry, JsonType } from "../../types/json-ast";

// ── 类型图标 ─────────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: JsonType }) {
  switch (type) {
    case "object":
      return <Braces size={12} className="text-orange-400 flex-shrink-0" />;
    case "array":
      return <List size={12} className="text-purple-400 flex-shrink-0" />;
    case "string":
      return <span className="text-[10px] font-bold text-green-600 flex-shrink-0 w-3 text-center">S</span>;
    case "number":
      return <span className="text-[10px] font-bold text-blue-600 flex-shrink-0 w-3 text-center">N</span>;
    case "boolean":
      return <span className="text-[10px] font-bold text-purple-600 flex-shrink-0 w-3 text-center">B</span>;
    case "null":
      return <span className="text-[10px] font-bold text-gray-400 flex-shrink-0 w-3 text-center">∅</span>;
    default:
      return null;
  }
}

// ── 大纲节点（一级） ──────────────────────────────────────────────────────

interface OutlineNodeProps {
  entry: JsonEntry;
  /** 当前在面板内是否已展开（本地 UI 状态，最多一级） */
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}

function OutlineNode({ entry, expanded, onToggleExpand }: OutlineNodeProps) {
  const isContainer = entry.type === "object" || entry.type === "array";
  const children = isContainer ? (entry.value as JsonEntry[]) : [];
  const hasChildren = children.length > 0;

  /** 点击节点 → 滚动到对应卡片 */
  const handleClick = useCallback(() => {
    const el = document.getElementById(entry.id);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entry.id]);

  const label = entry.key || <span className="italic text-gray-300">（空 key）</span>;

  return (
    <li>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer select-none group"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        aria-label={`跳转到 ${entry.key}`}
      >
        {/* 展开/折叠子节点（仅限面板内一级展开） */}
        {isContainer && hasChildren ? (
          <button
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0 leading-none"
            onClick={(e) => {
              e.stopPropagation(); // 不触发 scrollIntoView
              onToggleExpand(entry.id);
            }}
            aria-label={expanded ? "收起" : "展开"}
            tabIndex={-1}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        <TypeIcon type={entry.type} />

        <span
          className="text-xs font-mono text-gray-700 truncate flex-1"
          title={entry.key}
        >
          {label}
        </span>

        {/* 容器：显示子项数 */}
        {isContainer && (
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {children.length}
          </span>
        )}
      </div>

      {/* 面板内一级展开：显示直接子节点（只读，不可再展开） */}
      {isContainer && expanded && hasChildren && (
        <ul className="ml-4 border-l border-gray-100 pl-1 space-y-0">
          {children.map((child) => (
            <li key={child.id}>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer select-none"
                onClick={() => {
                  const el = document.getElementById(child.id);
                  el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const el = document.getElementById(child.id);
                    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }
                }}
                aria-label={`跳转到 ${child.key}`}
              >
                <span className="w-3 flex-shrink-0" />
                <TypeIcon type={child.type} />
                <span
                  className="text-[11px] font-mono text-gray-500 truncate flex-1"
                  title={child.key}
                >
                  {child.key || <span className="italic text-gray-300">（空）</span>}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ── OutlinePanel ──────────────────────────────────────────────────────────

export function OutlinePanel() {
  const root = useDocumentStore(selectRoot);

  /** 面板内展开状态（本地 UI，不进 Store）：Set<entryId> */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 取第一层节点
  const topLevel: JsonEntry[] =
    root.kind === "entries" || root.kind === "array" ? root.children : [];

  if (topLevel.length === 0) {
    return (
      <div className="px-4 py-6 text-xs text-gray-400 text-center">
        文档为空
      </div>
    );
  }

  return (
    <nav aria-label="文档大纲" className="overflow-y-auto h-full">
      <ul className="py-1 space-y-0">
        {topLevel.map((entry) => (
          <OutlineNode
            key={entry.id}
            entry={entry}
            expanded={expandedIds.has(entry.id)}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </ul>
    </nav>
  );
}
