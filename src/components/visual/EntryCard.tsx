/**
 * EntryCard — 单个 JSON 节点的卡片渲染（T05 基础版）
 *
 * 支持：
 * - 所有 6 种 JSON 类型渲染
 * - key / value 内联编辑
 * - 复制 / 剪切 / 删除 操作
 * - object / array 折叠展开
 * - 嵌套子节点递归渲染
 *
 * T06 接入：DnD 拖拽排序（@dnd-kit）
 * T07 接入：类型角标切换（int/float）
 * T09 接入：`::` 特殊块渲染
 */

import React, { useState, useRef, useCallback, KeyboardEvent } from "react";
import { ChevronRight, ChevronDown, Copy, Scissors, Trash2, Plus } from "lucide-react";
import { TypeBadge } from "./TypeBadge";
import { BlockDispatcher } from "../blocks/BlockRegistry";
import { isBlockString } from "../blocks/utils";
import { useDocumentStore } from "../../store/document-store";
import type { JsonEntry, JsonPath, JsonType } from "../../types/json-ast";

// ── 剪贴板（模块级，跨组件共享） ─────────────────────────────────────────
// T11（斜杠命令）实现粘贴时消费此变量；此处先声明 write 端

// eslint-disable-next-line prefer-const
export let clipboard: JsonEntry | null = null;

// ── Props ─────────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: JsonEntry;
  /** 从根到此节点的 id 路径 */
  path: JsonPath;
  /** 父节点类型（影响 key 的显示方式：array 元素用序号，object 用 key） */
  parentType?: "object" | "array" | "root";
  /** 同级排序索引（array 元素显示） */
  index?: number;
  /** 节点深度（用于缩进） */
  depth?: number;
}

export function EntryCard({
  entry,
  path,
  parentType = "object",
  index = 0,
  depth = 0,
}: EntryCardProps) {
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [keyDraft, setKeyDraft] = useState(entry.key);
  const [valueDraft, setValueDraft] = useState(
    typeof entry.value === "string" ||
    typeof entry.value === "number" ||
    typeof entry.value === "boolean"
      ? String(entry.value)
      : ""
  );

  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const { updateEntryKey, updateEntryValue, deleteEntry, insertEntry, toggleCollapsed } =
    useDocumentStore();

  const isContainer = entry.type === "object" || entry.type === "array";
  const children = isContainer ? (entry.value as JsonEntry[]) : [];

  // ── Key 编辑 ─────────────────────────────────────────────────────────

  const commitKeyEdit = useCallback(() => {
    setIsEditingKey(false);
    if (keyDraft !== entry.key) {
      updateEntryKey(path, keyDraft);
    }
  }, [keyDraft, entry.key, path, updateEntryKey]);

  const onKeyInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitKeyEdit();
    if (e.key === "Escape") {
      setKeyDraft(entry.key);
      setIsEditingKey(false);
    }
  };

  // ── Value 编辑 ────────────────────────────────────────────────────────

  const commitValueEdit = useCallback(() => {
    setIsEditingValue(false);
    // 短路：值未变化，避免 onBlur + onChange 双重触发无效 dispatch
    if (valueDraft === String(entry.value ?? "")) return;

    let newValue: string | number | boolean | null = valueDraft;
    let newType: JsonType = "string";

    // 根据原类型解析输入
    if (entry.type === "number") {
      const n = Number(valueDraft);
      newValue = isNaN(n) ? valueDraft : n;
      newType = isNaN(n) ? "string" : "number";
    } else if (entry.type === "boolean") {
      newValue = valueDraft.toLowerCase() === "true";
      newType = "boolean";
    } else if (entry.type === "null") {
      newValue = null;
      newType = "null";
    } else {
      newType = "string";
    }

    if (newValue !== entry.value) {
      updateEntryValue(path, newValue, newType);
    }
  }, [valueDraft, entry.type, entry.value, path, updateEntryValue]);

  const onValueInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitValueEdit();
    }
    if (e.key === "Escape") {
      setValueDraft(String(entry.value ?? ""));
      setIsEditingValue(false);
    }
  };

  // ── 操作 ─────────────────────────────────────────────────────────────

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      clipboard = JSON.parse(JSON.stringify(entry));
    },
    [entry]
  );

  const handleCut = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      clipboard = JSON.parse(JSON.stringify(entry));
      deleteEntry(path);
    },
    [entry, path, deleteEntry]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteEntry(path);
    },
    [path, deleteEntry]
  );

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      insertEntry(path, children.length, {
        key: entry.type === "array" ? String(children.length) : "newKey",
        value: "",
        type: "string",
      });
      if (entry.collapsed) toggleCollapsed(path);
    },
    [path, children.length, entry.type, entry.collapsed, insertEntry, toggleCollapsed]
  );

  // ── 渲染 ─────────────────────────────────────────────────────────────

  const renderKey = () => {
    if (parentType === "array") {
      return (
        <span className="text-xs text-gray-400 font-mono select-none w-6 text-right flex-shrink-0">
          {index}
        </span>
      );
    }

    if (isEditingKey) {
      return (
        <input
          ref={keyInputRef}
          autoFocus
          className="text-sm font-mono font-medium text-gray-800 bg-blue-50 border border-blue-300 rounded px-1 min-w-0 w-28 focus:outline-none"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          onBlur={commitKeyEdit}
          onKeyDown={onKeyInputKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    return (
      <span
        className="text-sm font-mono font-medium text-gray-800 hover:bg-gray-100 rounded px-1 cursor-text truncate max-w-[140px]"
        title={entry.key}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setKeyDraft(entry.key);
          setIsEditingKey(true);
        }}
      >
        {entry.key || <span className="text-gray-300 italic">（空）</span>}
      </span>
    );
  };

  const renderValue = () => {
    if (isContainer) {
      return (
        <span className="text-xs text-gray-400 select-none">
          {entry.collapsed
            ? `${children.length} 项已折叠`
            : children.length === 0
            ? "空"
            : null}
        </span>
      );
    }

    if (entry.type === "null") {
      return <span className="text-sm font-mono text-gray-400 italic">null</span>;
    }

    if (entry.type === "boolean") {
      return (
        <button
          className={`text-sm font-mono font-semibold ${
            entry.value ? "text-purple-600" : "text-gray-500"
          } hover:opacity-70`}
          onClick={(e) => {
            e.stopPropagation();
            updateEntryValue(path, !entry.value, "boolean");
          }}
          title="点击切换 true/false"
        >
          {String(entry.value)}
        </button>
      );
    }

    if (isEditingValue) {
      const isMultiline =
        entry.type === "string" && String(entry.value).length > 50;

      if (isMultiline) {
        return (
          <textarea
            ref={valueInputRef as React.RefObject<HTMLTextAreaElement>}
            autoFocus
            rows={3}
            className="text-sm font-mono text-gray-700 bg-blue-50 border border-blue-300 rounded px-1 w-full resize-y focus:outline-none"
            value={valueDraft}
            onChange={(e) => {
              setValueDraft(e.target.value);
              updateEntryValue(path, e.target.value, "string");
            }}
            onBlur={commitValueEdit}
            onKeyDown={onValueInputKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        );
      }

      return (
        <input
          ref={valueInputRef as React.RefObject<HTMLInputElement>}
          autoFocus
          className="text-sm font-mono text-gray-700 bg-blue-50 border border-blue-300 rounded px-1 min-w-0 flex-1 focus:outline-none"
          value={valueDraft}
          onChange={(e) => {
            setValueDraft(e.target.value);
            // 字符级实时同步（触发 _scheduleHistoryCommit）
            updateEntryValue(path, e.target.value, entry.type as JsonType);
          }}
          onBlur={commitValueEdit}
          onKeyDown={onValueInputKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    // 特殊块检测：string 类型且以 :: 开头 → BlockDispatcher 渲染
    if (entry.type === "string" && isBlockString(String(entry.value))) {
      return (
        <div className="flex-1 min-w-0 w-full" onClick={(e) => e.stopPropagation()}>
          <BlockDispatcher
            content={String(entry.value)}
            jsonPath={path}
            onUpdate={(newVal) => updateEntryValue(path, newVal, "string")}
          />
        </div>
      );
    }

    // 值展示
    const valueStr =
      entry.type === "string"
        ? `"${entry.value}"`
        : String(entry.value);

    const valueClass =
      entry.type === "string"
        ? "text-green-700"
        : entry.type === "number"
        ? "text-blue-700"
        : "text-gray-700";

    return (
      <span
        className={`text-sm font-mono ${valueClass} hover:bg-gray-100 rounded px-1 cursor-text truncate max-w-[200px]`}
        title={valueStr}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setValueDraft(String(entry.value ?? ""));
          setIsEditingValue(true);
        }}
      >
        {valueStr}
      </span>
    );
  };

  return (
    <div id={entry.id} className="group/card" style={{ paddingLeft: depth > 0 ? 0 : undefined }}>
      {/* ── 卡片主体 ─────────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all min-h-[36px] ${
          isContainer ? "cursor-pointer" : ""
        }`}
        onClick={isContainer ? () => toggleCollapsed(path) : undefined}
      >
        {/* 折叠/展开图标 */}
        {isContainer ? (
          <span className="text-gray-400 flex-shrink-0 w-4">
            {entry.collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* 类型角标 */}
        <TypeBadge
          type={entry.type}
          childCount={isContainer ? children.length : undefined}
        />

        {/* Key */}
        {renderKey()}

        {/* 分隔符 */}
        {!isContainer && (
          <span className="text-gray-300 flex-shrink-0 select-none">:</span>
        )}

        {/* Value */}
        <div className="flex-1 min-w-0 flex items-center">{renderValue()}</div>

        {/* 操作按钮（hover 才显示） */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0">
          {isContainer && (
            <button
              className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50"
              onClick={handleAddChild}
              title="添加子节点"
            >
              <Plus size={13} />
            </button>
          )}
          <button
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={handleCopy}
            title="复制"
          >
            <Copy size={13} />
          </button>
          <button
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={handleCut}
            title="剪切"
          >
            <Scissors size={13} />
          </button>
          <button
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
            onClick={handleDelete}
            title="删除"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── 子节点区域 ───────────────────────────────────────────────── */}
      {isContainer && !entry.collapsed && children.length > 0 && (
        <div className="ml-6 pl-3 border-l-2 border-gray-100 mt-0.5 mb-0.5 space-y-0.5">
          {children.map((child, idx) => (
            <EntryCard
              key={child.id}
              entry={child}
              path={[...path, child.id]}
              parentType={entry.type as "object" | "array"}
              index={idx}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
