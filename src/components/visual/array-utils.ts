/**
 * array-utils.ts — 数组类型检测工具（T10，独立文件避免 react-refresh warning）
 *
 * isObjectArray:  对象数组（→ 表格渲染）
 * isOrderedList:  有序列表（→ ol/li，T10 PATCH-01）
 * isScalarArray:  标量数组（→ ul/li）
 */

import type { JsonEntry } from "../../types/json-ast";

/** 对象数组：所有子项均为 object，适合表格渲染 */
export function isObjectArray(entry: JsonEntry): boolean {
  if (entry.type !== "array" || !Array.isArray(entry.value)) return false;
  const children = entry.value as JsonEntry[];
  if (children.length === 0) return false;
  return children.every((c) => c.type === "object" && Array.isArray(c.value));
}

/**
 * 有序列表：字符串数组，每项以 `\d+:` 前缀开头（如 "1: 第一项"）
 * T10 PATCH-01 新增
 */
export function isOrderedList(entry: JsonEntry): boolean {
  if (entry.type !== "array" || !Array.isArray(entry.value)) return false;
  const children = entry.value as JsonEntry[];
  if (children.length === 0) return false;
  return children.every(
    (c) => c.type === "string" && /^\d+:\s/.test(String(c.value ?? ""))
  );
}

/** 标量数组：string / number / boolean / null，渲染为无序列表 */
export function isScalarArray(entry: JsonEntry): boolean {
  if (entry.type !== "array" || !Array.isArray(entry.value)) return false;
  const children = entry.value as JsonEntry[];
  if (children.length === 0) return false;
  return children.every(
    (c) =>
      c.type === "string" ||
      c.type === "number" ||
      c.type === "boolean" ||
      c.type === "null"
  );
}
