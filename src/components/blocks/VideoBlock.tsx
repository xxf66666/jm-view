/**
 * VideoBlock — 视频（::video [title]\nurl_or_local_path）
 * P0 fix: 本地路径通过 convertFileSrc() 转换
 */

import React from "react";
import { Video } from "lucide-react";
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

export function VideoBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const title = parsed?.meta?.trim() || "视频";
  const rawSrc = parsed?.content?.trim() || "";

  const [resolvedSrc, setResolvedSrc] = React.useState("");

  React.useEffect(() => {
    if (!rawSrc) return;
    resolveSrc(rawSrc).then(setResolvedSrc);
  }, [rawSrc]);

  if (!rawSrc) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
        <Video size={14} /> （无视频地址）
      </div>
    );
  }

  return (
    <div className="my-1">
      {resolvedSrc && (
        <video controls className="max-w-full max-h-48 rounded-lg border border-gray-200" title={title}>
          <source src={resolvedSrc} />
          [视频不支持: {title}]
        </video>
      )}
    </div>
  );
}
