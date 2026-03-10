/** EmbedBlock — URL iframe 嵌入（::embed [title]\nurl） */
import React from "react";
import { Globe } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function EmbedBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const title = parsed?.meta || "嵌入内容";
  const url = parsed?.content?.trim() || "";

  if (!url) return (
    <div className="flex items-center gap-2 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
      <Globe size={14} /> （无嵌入地址）
    </div>
  );

  return (
    <div className="my-1 rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        <Globe size={12} className="text-gray-400" />
        <span className="text-xs text-gray-500 truncate">{title}</span>
      </div>
      <iframe
        src={url}
        title={title}
        className="w-full h-48 border-0"
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
      />
    </div>
  );
}
