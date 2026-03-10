/** DateBlock — 日期/时间显示（::date [format]\niso_date_string） */
import React from "react";
import { Calendar } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function DateBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const format = parsed?.meta?.trim() || "date";
  const rawDate = parsed?.content?.trim() || parsed?.meta || "";

  let display = rawDate;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        display =
          format === "datetime"
            ? d.toLocaleString("zh-CN")
            : format === "time"
            ? d.toLocaleTimeString("zh-CN")
            : d.toLocaleDateString("zh-CN");
      }
    } catch {
      // 保持原始字符串
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded my-0.5">
      <Calendar size={12} className="text-gray-400" />
      {display || <span className="text-gray-400 italic">（无日期）</span>}
    </span>
  );
}
