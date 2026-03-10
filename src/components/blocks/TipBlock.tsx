/** TipBlock — 提示块（::tip），绿色 */
import React from "react";
import { Lightbulb } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";
export function TipBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const text = parsed?.content || parsed?.meta || "";
  return (
    <div className="flex items-start gap-2 px-3 py-2 my-1 rounded-lg bg-green-50 border border-green-200">
      <Lightbulb size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-green-900 whitespace-pre-wrap">{text || <span className="italic opacity-50">（空提示）</span>}</p>
    </div>
  );
}
