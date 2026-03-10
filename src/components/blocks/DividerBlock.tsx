/** DividerBlock — 分隔线（::divider [style]） */
import React from "react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function DividerBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const style = parsed?.meta?.trim() || "solid";
  const borderStyle = style === "dashed" ? "border-dashed" : style === "dotted" ? "border-dotted" : "border-solid";
  return <hr className={`my-3 border-t border-gray-300 ${borderStyle}`} />;
}
