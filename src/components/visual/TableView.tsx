/**
 * TableView — 表格渲染（T10，AC05）
 *
 * 触发条件：entry.type === 'array' 且所有子项均为 object（对象数组）
 * 渲染形式：带标题行的表格，连续相同列值自动合并（rowspan）
 * 切换开关：可手动切换为普通卡片视图
 *
 * 字符串数组：渲染为无序列表（ul/li）
 */

import React, { useState, useMemo } from "react";
import { TableIcon, List } from "lucide-react";
import { isObjectArray, isOrderedList, isScalarArray } from "./array-utils";
import type { JsonEntry } from "../../types/json-ast";

// 类型检测函数已移至 array-utils.ts（避免 react-refresh warning）
// 此处通过 import 引用：isObjectArray / isOrderedList / isScalarArray

// ── 对象数组 → 表格 ──────────────────────────────────────────────────────

interface TableViewProps {
  entry: JsonEntry;
  onToggle: () => void; // 切换回卡片视图
}

export function ObjectArrayTable({ entry, onToggle }: TableViewProps) {
  const rows = (entry.value as JsonEntry[]).map(
    (row) => row.value as JsonEntry[]
  );

  // 收集所有列名（保留顺序，去重）
  const columns = useMemo(() => {
    const seen = new Set<string>();
    const cols: string[] = [];
    for (const row of rows) {
      for (const cell of row) {
        if (!seen.has(cell.key)) { seen.add(cell.key); cols.push(cell.key); }
      }
    }
    return cols;
  }, [rows]);

  // 构建 cell 矩阵（每行每列一个值）
  const matrix = useMemo(() => {
    return rows.map((row) => {
      const map = new Map(row.map((c) => [c.key, c]));
      return columns.map((col) => map.get(col));
    });
  }, [rows, columns]);

  // 计算连续相同列值的 rowspan
  const rowspans = useMemo(() => {
    const spans: (number | null)[][] = matrix.map(() => columns.map(() => 1));
    for (let col = 0; col < columns.length; col++) {
      for (let row = matrix.length - 2; row >= 0; row--) {
        const curr = matrix[row][col];
        const next = matrix[row + 1][col];
        const currVal = curr ? String(curr.value ?? "") : "";
        const nextVal = next ? String(next.value ?? "") : "";
        const nextSpan = spans[row + 1][col];
        if (currVal === nextVal && currVal !== "" && nextSpan !== null) {
          spans[row][col] = (nextSpan ?? 1) + 1;
          spans[row + 1][col] = null; // null = 被合并的行（不渲染）
        }
      }
    }
    return spans;
  }, [matrix, columns]);

  return (
    <div className="my-1">
      {/* 表格标题栏（key 由父级 EntryCard 显示，此处仅显示统计和切换）*/}
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <TableIcon size={12} />
          <span className="text-gray-400">{rows.length} 行 × {columns.length} 列</span>
        </div>
        <button
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100"
          onClick={onToggle}
          title="切换为卡片视图"
        >
          <List size={11} /> 卡片视图
        </button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                {row.map((cell, colIdx) => {
                  const span = rowspans[rowIdx][colIdx];
                  if (span === null) return null; // 被合并，不渲染
                  const spanVal = span > 1 ? span : undefined;
                  const val = cell?.value;
                  const displayVal =
                    val === null ? <span className="text-gray-300 italic text-xs">null</span>
                    : val === undefined ? <span className="text-gray-300 italic text-xs">—</span>
                    : typeof val === "boolean"
                    ? <span className={`text-xs font-mono ${val ? "text-green-600" : "text-red-500"}`}>{String(val)}</span>
                    : String(val);
                  return (
                    <td
                      key={colIdx}
                      rowSpan={spanVal}
                      className={`px-3 py-2 text-gray-700 align-top ${spanVal && spanVal > 1 ? "bg-blue-50/30" : ""}`}
                    >
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 字符串数组 → 无序列表 ─────────────────────────────────────────────────

export function ScalarArrayList({ entry, onToggle }: TableViewProps) {
  const items = (entry.value as JsonEntry[]);

  return (
    <div className="my-1">
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <List size={12} />
          <span className="text-gray-400">{items.length} 项</span>
        </div>
        <button
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100"
          onClick={onToggle}
          title="切换为卡片视图"
        >
          <TableIcon size={11} /> 展开视图
        </button>
      </div>
      <ul className="pl-4 space-y-0.5 text-sm text-gray-700">
        {items.map((item, idx) => (
          <li key={item.id || idx} className="flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
            <span className={
              item.type === "null" ? "text-gray-400 italic" :
              item.type === "boolean" ? (item.value ? "text-green-600" : "text-red-500") :
              ""
            }>
              {item.value === null ? "null" : String(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── 带切换开关的容器 ──────────────────────────────────────────────────────

interface SmartArrayViewProps {
  entry: JsonEntry;
  children: React.ReactNode; // 普通卡片视图（展开模式）
}

/**
 * SmartArrayView — 自动检测数组类型，提供表格/列表/卡片三种视图
 * 默认展示更紧凑的视图；用户可手动切换
 */
export function SmartArrayView({ entry, children }: SmartArrayViewProps) {
  const isObjArr = isObjectArray(entry);
  const isOrdArr = isOrderedList(entry);
  const isScArr = !isOrdArr && isScalarArray(entry);

  const hasSmart = isObjArr || isOrdArr || isScArr;
  const [mode, setMode] = useState<"smart" | "card">(hasSmart ? "smart" : "card");

  if (mode === "card" || !hasSmart) {
    return (
      <div>
        {hasSmart && (
          <div className="flex justify-end mb-0.5">
            <button
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100"
              onClick={() => setMode("smart")}
              title={isObjArr ? "表格视图" : isOrdArr ? "有序列表视图" : "无序列表视图"}
            >
              {isObjArr ? <TableIcon size={11} /> : <List size={11} />}
              {isObjArr ? "表格" : isOrdArr ? "有序列表" : "列表"}
            </button>
          </div>
        )}
        {children}
      </div>
    );
  }

  if (isObjArr) return <ObjectArrayTable entry={entry} onToggle={() => setMode("card")} />;
  if (isOrdArr) return <OrderedListView entry={entry} onToggle={() => setMode("card")} />;
  return <ScalarArrayList entry={entry} onToggle={() => setMode("card")} />;
}

// ── 有序列表视图（T10 PATCH-01）────────────────────────────────────────────

function OrderedListView({ entry, onToggle }: TableViewProps) {
  const items = entry.value as JsonEntry[];
  return (
    <div className="my-1">
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <List size={12} />
          <span className="text-gray-400">{items.length} 项有序列表</span>
        </div>
        <button
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100"
          onClick={onToggle}
          title="切换为卡片视图"
        >
          <TableIcon size={11} /> 展开视图
        </button>
      </div>
      <ol className="pl-4 space-y-0.5 text-sm text-gray-700 list-decimal">
        {items.map((item, idx) => {
          const text = String(item.value ?? "").replace(/^\d+:\s*/, "");
          return (
            <li key={item.id || idx} className="pl-1">
              {text || <span className="text-gray-300 italic">（空）</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
