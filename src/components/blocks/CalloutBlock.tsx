/** CalloutBlock — 提示/警告/错误/成功卡片（::callout [type]\ncontent） */
import React from "react";
import { Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

type CalloutVariant = "info" | "warning" | "error" | "success";

const VARIANTS: Record<CalloutVariant, { icon: React.ReactNode; className: string }> = {
  info:    { icon: <Info size={14} />,          className: "bg-blue-50 border-blue-200 text-blue-800" },
  warning: { icon: <AlertTriangle size={14} />, className: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  error:   { icon: <XCircle size={14} />,       className: "bg-red-50 border-red-200 text-red-800" },
  success: { icon: <CheckCircle size={14} />,   className: "bg-green-50 border-green-200 text-green-800" },
};

export function CalloutBlock({ content }: JmBlockProps) {
  const parsed = parseBlock(content);
  const variant: CalloutVariant =
    (["info", "warning", "error", "success"].includes(parsed?.meta || "")
      ? parsed?.meta
      : "info") as CalloutVariant;
  const text = parsed?.content?.trim() || "";
  const { icon, className } = VARIANTS[variant];

  return (
    <div className={`flex items-start gap-2 px-3 py-2 my-1 rounded-lg border ${className}`}>
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <p className="text-sm whitespace-pre-wrap">{text || <span className="italic opacity-50">（空内容）</span>}</p>
    </div>
  );
}
