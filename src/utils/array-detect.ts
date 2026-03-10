/** array-detect.ts — 数组类型检测工具（T10，独立文件避免 react-refresh warning）*/
import type { JsonEntry } from "../types/json-ast";

/** 对象数组：所有子项均为 object */
export function isObjectArray(entry: JsonEntry): boolean {
  if (entry.type !== "array" || !Array.isArray(entry.value)) return false;
  const children = entry.value as JsonEntry[];
  if (children.length === 0) return false;
  return children.every((c) => c.type === "object" && Array.isArray(c.value));
}

/** 标量数组：string / number / boolean / null */
export function isScalarArray(entry: JsonEntry): boolean {
  if (entry.type !== "array" || !Array.isArray(entry.value)) return false;
  const children = entry.value as JsonEntry[];
  if (children.length === 0) return false;
  return children.every(
    (c) => c.type === "string" || c.type === "number" || c.type === "boolean" || c.type === "null"
  );
}
