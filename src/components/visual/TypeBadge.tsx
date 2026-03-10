/**
 * TypeBadge — 类型角标（F04，T07 完善切换逻辑）
 * 6 种类型各有颜色，object/array 显示子节点数量
 */

import React from "react";
import type { JsonType } from "../../types/json-ast";

interface TypeBadgeProps {
  type: JsonType;
  childCount?: number;
  /** T07: 点击数字角标切换 int/float（此处先渲染，点击逻辑 T07 实现） */
  onClick?: () => void;
}

const TYPE_STYLES: Record<JsonType, { label: string; className: string }> = {
  string:  { label: "str",   className: "bg-green-100 text-green-700" },
  number:  { label: "num",   className: "bg-blue-100 text-blue-700 cursor-pointer" },
  boolean: { label: "bool",  className: "bg-purple-100 text-purple-700" },
  null:    { label: "null",  className: "bg-gray-100 text-gray-500" },
  object:  { label: "{ }",   className: "bg-orange-100 text-orange-700" },
  array:   { label: "[ ]",   className: "bg-pink-100 text-pink-700" },
};

export function TypeBadge({ type, childCount, onClick }: TypeBadgeProps) {
  const { label, className } = TYPE_STYLES[type];
  const display =
    (type === "object" || type === "array") && childCount !== undefined
      ? `${label} ${childCount}`
      : label;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold select-none flex-shrink-0 ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={`类型: ${type}`}
    >
      {display}
    </span>
  );
}
