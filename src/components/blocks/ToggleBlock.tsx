/** ToggleBlock — 可折叠内容（::toggle [title]\ncontent） */
import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function ToggleBlock({ content }: JmBlockProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseBlock(content);
  const title = parsed?.meta || "展开内容";
  const body = parsed?.content?.trim() || "";

  return (
    <div className="my-1 rounded-lg border border-gray-200 overflow-hidden">
      <button
        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && body && (
        <div className="px-4 py-2 border-t border-gray-100 text-sm text-gray-600 whitespace-pre-wrap">
          {body}
        </div>
      )}
    </div>
  );
}
