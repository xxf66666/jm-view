/** LinkBlock — 超链接（::link [label]\nurl） */
import React from "react";
import { ExternalLink } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function LinkBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const label = parsed?.meta || "";
  const url = parsed?.content?.trim() || parsed?.meta || "";
  const displayLabel = label && label !== url ? label : url;

  if (!url) return <span className="text-sm text-gray-400 italic">（空链接）</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline my-0.5"
    >
      <ExternalLink size={13} className="flex-shrink-0" />
      {displayLabel}
    </a>
  );
}
