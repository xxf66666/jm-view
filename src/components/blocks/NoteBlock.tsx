/** NoteBlock — 笔记块（::note），与 callout info 类似但更简洁 */
import React from "react";
import { StickyNote } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";
export function NoteBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const text = parsed?.content || parsed?.meta || "";
  return (
    <div className="flex items-start gap-2 px-3 py-2 my-1 rounded-lg bg-amber-50 border border-amber-200">
      <StickyNote size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-900 whitespace-pre-wrap">{text || <span className="italic opacity-50">（空笔记）</span>}</p>
    </div>
  );
}
