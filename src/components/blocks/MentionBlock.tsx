/** MentionBlock — @用户提及（::mention @username） */
import React from "react";
import { User } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function MentionBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const username = (parsed?.meta || parsed?.content || "").trim().replace(/^@/, "");

  return (
    <span className="inline-flex items-center gap-1 text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full my-0.5 font-medium">
      <User size={11} />
      @{username || "unknown"}
    </span>
  );
}
