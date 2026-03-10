/** ImageBlock — 图片（::image [alt]\nurl_or_base64） */
import React from "react";
import { ImageOff } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function ImageBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const alt = parsed?.meta || "图片";
  const src = parsed?.content?.trim() || parsed?.meta || "";

  if (!src || src === alt) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
        <ImageOff size={14} /> （无图片地址）
      </div>
    );
  }

  return (
    <div className="my-1">
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-64 rounded-lg border border-gray-200 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).insertAdjacentHTML(
            "afterend",
            `<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">[图片加载失败: ${alt}]</div>`
          );
        }}
      />
      {alt && <p className="text-xs text-gray-400 mt-1 px-1">{alt}</p>}
    </div>
  );
}
