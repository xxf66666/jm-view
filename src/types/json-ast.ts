/**
 * json-ast.ts — jm-view 核心数据类型定义
 *
 * 设计原则：
 * - 每个 JsonEntry 有唯一 uuid（id），React key 和 DnD 均使用此字段，绝对不用 index
 * - value 使用联合类型，类型收窄由 `type` 字段驱动
 * - 支持 `::` 前缀的特殊块（T09 实现），此处只保留 string 类型容纳原始值
 */

import { v4 as uuidv4 } from "uuid";

// ── 基础类型枚举 ──────────────────────────────────────────────────────────

export type JsonScalarType = "string" | "number" | "boolean" | "null";
export type JsonContainerType = "object" | "array";
export type JsonType = JsonScalarType | JsonContainerType;

// ── 值类型 ────────────────────────────────────────────────────────────────

export type JsonScalarValue = string | number | boolean | null;
export type JsonValue = JsonScalarValue | JsonEntry[];

// ── 核心节点 ──────────────────────────────────────────────────────────────

export interface JsonEntry {
  /** 唯一 ID，用于 React key 和 DnD，绝对不用 index */
  id: string;
  /** 对象的 key，数组元素用 "" */
  key: string;
  /** 值：标量直接存，object/array 存子节点列表 */
  value: JsonValue;
  /** 类型标记，决定渲染方式 */
  type: JsonType;
  /** 大纲/卡片区是否折叠（仅 object/array） */
  collapsed: boolean;
}

// ── 文档根 ────────────────────────────────────────────────────────────────

/**
 * 文档可以是对象或数组根，也支持标量根（少见但合法的 JSON）
 * - 'entries': root 是 object，children 是 key-value 列表
 * - 'array': root 是 array，children 是值列表（key=""）
 * - 'scalar': root 是标量
 */
export type DocumentRoot =
  | { kind: "entries"; children: JsonEntry[] }
  | { kind: "array"; children: JsonEntry[] }
  | { kind: "scalar"; entry: JsonEntry };

// ── 工厂函数 ──────────────────────────────────────────────────────────────

export function createEntry(
  key: string,
  value: JsonValue,
  type: JsonType
): JsonEntry {
  return { id: uuidv4(), key, value, type, collapsed: false };
}

export function createStringEntry(key: string, value: string): JsonEntry {
  return createEntry(key, value, "string");
}

export function createNumberEntry(key: string, value: number): JsonEntry {
  return createEntry(key, value, "number");
}

export function createBooleanEntry(key: string, value: boolean): JsonEntry {
  return createEntry(key, value, "boolean");
}

export function createNullEntry(key: string): JsonEntry {
  return createEntry(key, null, "null");
}

export function createObjectEntry(key: string, children: JsonEntry[] = []): JsonEntry {
  return createEntry(key, children, "object");
}

export function createArrayEntry(key: string, children: JsonEntry[] = []): JsonEntry {
  return createEntry(key, children, "array");
}

// ── JSON → AST 解析 ───────────────────────────────────────────────────────

/**
 * 将任意 JSON 值递归转换为 JsonEntry 树
 */
export function valueToEntry(key: string, value: unknown): JsonEntry {
  if (value === null) return createNullEntry(key);
  if (typeof value === "boolean") return createBooleanEntry(key, value);
  if (typeof value === "number") return createNumberEntry(key, value);
  if (typeof value === "string") return createStringEntry(key, value);

  if (Array.isArray(value)) {
    const children = value.map((item, i) => valueToEntry(String(i), item));
    return createArrayEntry(key, children);
  }

  if (typeof value === "object") {
    const children = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => valueToEntry(k, v)
    );
    return createObjectEntry(key, children);
  }

  // fallback: unknown type → store as string
  return createStringEntry(key, String(value));
}

/**
 * 将 JSON 字符串解析为 DocumentRoot
 * 解析失败返回 null（调用方处理错误提示）
 */
export function parseJsonToRoot(jsonStr: string): DocumentRoot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    const children = parsed.map((item, i) => valueToEntry(String(i), item));
    return { kind: "array", children };
  }

  if (parsed !== null && typeof parsed === "object") {
    const children = Object.entries(parsed as Record<string, unknown>).map(
      ([k, v]) => valueToEntry(k, v)
    );
    return { kind: "entries", children };
  }

  const entry = valueToEntry("", parsed);
  return { kind: "scalar", entry };
}

// ── AST → JSON 序列化 ─────────────────────────────────────────────────────

function entryToValue(entry: JsonEntry): unknown {
  switch (entry.type) {
    case "null":
      return null;
    case "boolean":
    case "number":
    case "string":
      return entry.value;
    case "object": {
      const obj: Record<string, unknown> = {};
      (entry.value as JsonEntry[]).forEach((child) => {
        obj[child.key] = entryToValue(child);
      });
      return obj;
    }
    case "array":
      return (entry.value as JsonEntry[]).map(entryToValue);
  }
}

export function rootToJson(root: DocumentRoot, indent = 2): string {
  let value: unknown;
  switch (root.kind) {
    case "entries": {
      const obj: Record<string, unknown> = {};
      root.children.forEach((e) => {
        obj[e.key] = entryToValue(e);
      });
      value = obj;
      break;
    }
    case "array":
      value = root.children.map(entryToValue);
      break;
    case "scalar":
      value = entryToValue(root.entry);
      break;
  }
  return JSON.stringify(value, null, indent);
}

// ── 路径类型（用于定位节点） ──────────────────────────────────────────────

/** 从根到目标节点的 id 数组 */
export type JsonPath = string[];
