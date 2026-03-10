/**
 * ImageBlock — 图片（::image [alt]\nurl_or_local_path）
 *
 * P0 fix: 本地路径通过 convertFileSrc() 转换为 WebView 可访问的 URI
 * Medium fix: onError 改为 React state 控制，避免直接 DOM 操作
 */

import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

/** 判断是否为本地文件路径（非 http/https/data 开头）*/
function isLocalPath(src: string): boolean {
  return Boolean(src) && !/^(https?:|data:|blob:)/i.test(src);
}

/** Tauri 环境：convertFileSrc；浏览器降级：原路径 */
async function resolveSrc(src: string): Promise<string> {
  if (!isLocalPath(src)) return src;
  try {
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    return convertFileSrc(src);
  } catch {
    return src; // 浏览器环境降级
  }
}

export function ImageBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const alt = parsed?.meta?.trim() || "图片";
  const rawSrc = parsed?.content?.trim() || "";

  const [resolvedSrc, setResolvedSrc] = React.useState<string>("");
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!rawSrc || rawSrc === alt) { setLoading(false); return; }
    setImgError(false);
    setLoading(true);
    resolveSrc(rawSrc).then((s) => { setResolvedSrc(s); setLoading(false); });
  }, [rawSrc, alt]);

  if (!rawSrc || rawSrc === alt) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
        <ImageOff size={14} /> （无图片地址）
      </div>
    );
  }

  if (loading) {
    return <div className="h-10 my-1 rounded-lg bg-gray-100 animate-pulse" />;
  }

  if (imgError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 my-1 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
        <ImageOff size={14} /> 图片加载失败: {alt || rawSrc}
      </div>
    );
  }

  return (
    <div className="my-1">
      <img
        src={resolvedSrc}
        alt={alt}
        className="max-w-full max-h-64 rounded-lg border border-gray-200 object-contain"
        onError={() => setImgError(true)}
      />
      {alt && <p className="text-xs text-gray-400 mt-1 px-1">{alt}</p>}
    </div>
  );
}
