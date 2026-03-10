/** WarningBlock — 警告块（::warning），橙色 */
import React from "react";
import { TriangleAlert } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";
export function WarningBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const text = parsed?.content || parsed?.meta || "";
  return (
    <div className="flex items-start gap-2 px-3 py-2 my-1 rounded-lg bg-orange-50 border border-orange-200">
      <TriangleAlert size={13} className="text-orange-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-orange-900 whitespace-pre-wrap">{text || <span className="italic opacity-50">（空警告）</span>}</p>
    </div>
  );
}
