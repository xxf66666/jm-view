/** AudioBlock — 音频（::audio [title]\nurl） */
import React from "react";
import { Music } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function AudioBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const title = parsed?.meta || "音频";
  const src = parsed?.content?.trim() || "";

  if (!src) return (
    <div className="flex items-center gap-2 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
      <Music size={14} /> （无音频地址）
    </div>
  );

  return (
    <div className="flex items-center gap-3 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200">
      <Music size={14} className="text-purple-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1 truncate">{title}</p>
        <audio controls className="w-full h-8">
          <source src={src} />
        </audio>
      </div>
    </div>
  );
}
