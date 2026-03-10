/** FileBlock — 文件附件信息（::file [name]\nsize_or_url） */
import React from "react";
import { FileText, Download } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

export function FileBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const name = parsed?.meta || "文件";
  const url = parsed?.content?.trim() || "";

  return (
    <div className="flex items-center gap-3 px-3 py-2 my-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
      <FileText size={16} className="text-blue-500 flex-shrink-0" />
      <span className="text-sm text-gray-700 flex-1 truncate">{name}</span>
      {url && (
        <a href={url} download={name} className="text-gray-400 hover:text-blue-500">
          <Download size={14} />
        </a>
      )}
    </div>
  );
}
