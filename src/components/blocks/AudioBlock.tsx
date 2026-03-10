/**
 * AudioBlock — 音频（::audio [title]\nurl_or_local_path）
 * P0 fix: 本地路径通过 convertFileSrc() 转换
 */

import React from "react";
import { Music } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

async function resolveSrc(src: string): Promise<string> {
  if (!src || /^(https?:|data:|blob:)/i.test(src)) return src;
  try {
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    return convertFileSrc(src);
  } catch {
    return src;
  }
}

export function AudioBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const title = parsed?.meta?.trim() || "音频";
  const rawSrc = parsed?.content?.trim() || "";

  const [resolvedSrc, setResolvedSrc] = React.useState("");

  React.useEffect(() => {
    if (!rawSrc) return;
    resolveSrc(rawSrc).then(setResolvedSrc);
  }, [rawSrc]);

  if (!rawSrc) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
        <Music size={14} /> （无音频地址）
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200">
      <Music size={14} className="text-purple-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1 truncate">{title}</p>
        {resolvedSrc && (
          <audio controls className="w-full h-8">
            <source src={resolvedSrc} />
          </audio>
        )}
      </div>
    </div>
  );
}
