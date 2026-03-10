/** HeadingBlock — 标题（::heading [level]\ntext） */
import React from "react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

const HEADING_STYLES: Record<number, string> = {
  1: "text-2xl font-bold text-gray-900",
  2: "text-xl font-bold text-gray-800",
  3: "text-lg font-semibold text-gray-800",
  4: "text-base font-semibold text-gray-700",
  5: "text-sm font-semibold text-gray-700",
  6: "text-sm font-medium text-gray-600",
};

export function HeadingBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const level = Math.min(6, Math.max(1, parseInt(parsed?.meta || "2") || 2));
  const text = parsed?.content?.trim() || parsed?.meta || "";
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <Tag className={`${HEADING_STYLES[level]} my-1 leading-tight`}>
      {text || <span className="text-gray-300 italic">（空标题）</span>}
    </Tag>
  );
}
