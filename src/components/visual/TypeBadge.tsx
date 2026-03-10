/**
 * TypeBadge — 类型角标（F04，T07 规格修正）
 *
 * REQ F04 规格（对齐 REQ-20260310-jm-view）：
 *   string  → 无角标（不渲染）
 *   int     → `#`      蓝色，可点击切换为 float
 *   float   → `#.`     蓝色，可点击切换为 int
 *   bool    → `T/F`    紫色
 *   null    → `null`   灰色
 *   object  → `{}`     橙色，显示子节点数（`{} 3`）
 *   array   → `[]`     粉色，显示子节点数（`[] 5`）
 *
 * int/float 切换：点击角标互相转换（int→保留整数部分，float→追加 .0）
 */

import React from "react";
import type { JsonType } from "../../types/json-ast";

interface TypeBadgeProps {
  type: JsonType;
  /** 数字原始值，用于判断 int/float */
  value?: unknown;
  /** 子节点数量（object / array 显示）*/
  childCount?: number;
  /** 点击 int/float 角标时触发切换 */
  onToggleNumericType?: (newValue: number) => void;
}

/** 判断数字是否为整数 */
function isInteger(v: unknown): boolean {
  if (typeof v === "number") return Number.isInteger(v);
  if (typeof v === "string") {
    const n = Number(v);
    return !isNaN(n) && Number.isInteger(n);
  }
  return false;
}

export function TypeBadge({ type, value, childCount, onToggleNumericType }: TypeBadgeProps) {
  // string 类型：无角标
  if (type === "string") return null;

  // number 类型：区分 int / float
  if (type === "number") {
    const isInt = isInteger(value);
    const label = isInt ? "#" : "#.";
    const title = isInt ? "整数（点击切换为浮点数）" : "浮点数（点击切换为整数）";

    const handleClick = () => {
      if (!onToggleNumericType) return;
      const n = Number(value ?? 0);
      if (isInt) {
        // int → float：追加 .0（即 n.toFixed(1) 转 float）
        onToggleNumericType(parseFloat(n.toFixed(1)));
      } else {
        // float → int：截断小数部分
        onToggleNumericType(Math.trunc(n));
      }
    };

    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold select-none flex-shrink-0 bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200 active:scale-95"
        onClick={onToggleNumericType ? handleClick : undefined}
        role={onToggleNumericType ? "button" : undefined}
        title={title}
      >
        {label}
      </span>
    );
  }

  // 其余类型的静态配置
  const STYLES: Partial<Record<JsonType, { label: string; className: string }>> = {
    boolean: { label: "T/F",  className: "bg-purple-100 text-purple-700" },
    null:    { label: "null", className: "bg-gray-100 text-gray-500" },
    object:  { label: "{}",   className: "bg-orange-100 text-orange-700" },
    array:   { label: "[]",   className: "bg-pink-100 text-pink-700" },
  };

  const style = STYLES[type];
  if (!style) return null;

  const { label, className } = style;
  const display =
    (type === "object" || type === "array") && childCount !== undefined
      ? `${label} ${childCount}`
      : label;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold select-none flex-shrink-0 ${className}`}
      title={`类型: ${type}`}
    >
      {display}
    </span>
  );
}
