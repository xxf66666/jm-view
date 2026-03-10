/**
 * QuoteBlock — 引用块（::quote）
 *
 * 格式：`::quote [source]\ncontent`
 * 特殊规则：路径引用（`::quote $.path.to.key`）时若路径不存在，
 *            渲染错误提示卡片，不 throw，不 panic（硬性要求）
 */

import React from "react";
import { Quote, AlertCircle } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import { useDocumentStore } from "../../store/document-store";
import type { JmBlockProps } from "../../types/blocks";
import type { JsonEntry } from "../../types/json-ast";

/** 简单 JSON 路径解析：$.key.subkey → ['key', 'subkey'] */
function resolveJsonPath(root: ReturnType<typeof useDocumentStore.getState>["root"], pathStr: string): string | null {
  if (!pathStr.startsWith("$")) return null;
  const keys = pathStr.replace(/^\$\.?/, "").split(".");
  if (keys.length === 0 || (keys.length === 1 && keys[0] === "")) return null;

  let current: JsonEntry[] | null =
    root.kind === "scalar" ? null : root.children;

  for (let i = 0; i < keys.length - 1; i++) {
    const entry = current?.find((e) => e.key === keys[i]);
    if (!entry || !Array.isArray(entry.value)) return null;
    current = entry.value as JsonEntry[];
  }

  const last = current?.find((e) => e.key === keys[keys.length - 1]);
  if (!last) return null;

  // 只支持标量值引用
  if (Array.isArray(last.value)) return `[对象/数组，路径: ${pathStr}]`;
  return String(last.value ?? "");
}

export function QuoteBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const root = useDocumentStore((s) => s.root);

  const source = parsed?.meta?.trim() ?? "";
  const rawContent = parsed?.content ?? parsed?.meta ?? "";

  // 检测是否为路径引用（$.xxx.yyy 格式）
  const isPathRef = source.startsWith("$");
  let displayContent = rawContent;
  let resolveError: string | null = null;

  if (isPathRef) {
    const resolved = resolveJsonPath(root, source);
    if (resolved === null) {
      resolveError = `[引用路径不存在: ${source}]`;
    } else {
      displayContent = resolved;
    }
  }

  // 路径不存在 → 渲染错误提示卡片（不 throw，不 panic）
  if (resolveError) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 my-1">
        <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
        <span className="text-sm text-red-700 font-mono">{resolveError}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-3 py-2 bg-gray-50 border-l-4 border-blue-400 rounded-r-lg my-1">
      <Quote size={14} className="text-blue-400 flex-shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayContent || rawContent}</p>
        {source && !isPathRef && (
          <p className="text-xs text-gray-400 mt-1">— {source}</p>
        )}
      </div>
    </div>
  );
}
