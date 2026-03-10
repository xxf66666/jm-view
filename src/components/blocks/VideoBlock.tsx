/** VideoBlock — 视频（::video [title]\nurl） */
import React from "react";
import { Video } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function VideoBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const title = parsed?.meta || "视频";
  const src = parsed?.content?.trim() || "";

  if (!src) return (
    <div className="flex items-center gap-2 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
      <Video size={14} /> （无视频地址）
    </div>
  );

  return (
    <div className="my-1">
      <video controls className="max-w-full max-h-48 rounded-lg border border-gray-200" title={title}>
        <source src={src} />
        [视频不支持: {title}]
      </video>
    </div>
  );
}
