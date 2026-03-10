/** ColorBlock — 颜色色块（::color #hex_or_rgb） */
import React from "react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function ColorBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const color = (parsed?.meta || parsed?.content || "").trim() || "#cccccc";

  const copyColor = () => navigator.clipboard.writeText(color).catch(() => {});

  return (
    <div
      className="inline-flex items-center gap-2 px-2 py-1 rounded border border-gray-200 cursor-pointer hover:opacity-80 my-0.5"
      onClick={copyColor}
      title={`点击复制: ${color}`}
    >
      <span
        className="w-4 h-4 rounded border border-white shadow-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-mono text-gray-700">{color}</span>
    </div>
  );
}
