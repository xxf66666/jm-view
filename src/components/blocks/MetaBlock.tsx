/** MetaBlock — 元数据块（::meta [key]\nvalue），KV 展示 */
import React from "react";
import { Tag } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";
export function MetaBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const key = parsed?.meta || "meta";
  const value = parsed?.content || "";
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 my-0.5 rounded bg-gray-100 border border-gray-200 text-xs">
      <Tag size={10} className="text-gray-400" />
      <span className="font-mono text-gray-500">{key}</span>
      {value && <><span className="text-gray-300">:</span><span className="text-gray-700">{value}</span></>}
    </div>
  );
}
