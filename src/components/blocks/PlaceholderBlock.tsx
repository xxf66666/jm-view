/**
 * PlaceholderBlock — 未识别/未注册块的降级渲染（T09.0 框架）
 *
 * 触发场景：
 * 1. prefix 未在 blockRegistry 注册
 * 2. 解析失败
 * 3. BlockErrorBoundary 捕获异常后降级
 */

import React from "react";
import { HelpCircle } from "lucide-react";

interface PlaceholderBlockProps {
  content: string;
  reason?: string;
}

export function PlaceholderBlock({ content, reason }: PlaceholderBlockProps) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-dashed border-gray-300 text-sm">
      <HelpCircle size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="font-mono text-gray-500 break-all">{content}</span>
        {reason && (
          <p className="text-xs text-gray-400 mt-0.5">{reason}</p>
        )}
      </div>
    </div>
  );
}
