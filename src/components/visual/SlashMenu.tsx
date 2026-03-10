/**
 * SlashMenu — 斜杠命令系统（T11，AC03）
 *
 * 触发：在 string 类型 value 输入框键入 `/`
 * 显示：浮层命令菜单，包含所有已注册块的 slashCommand triggers + 描述
 * 选择：键盘 ↑↓ 导航，Enter/Tab 确认，Escape 关闭
 * 插入：将 value 替换为选中块的 defaultContent
 *
 * 附录 A 命令全部通过 BlockPlugin.slashCommand 注册，
 * 不在此硬编码（开闭原则）
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { blockRegistry } from "../blocks/registry";
import type { BlockPlugin } from "../blocks/types";

export interface SlashMenuProps {
  /** 当前输入框的值（含 /）*/
  query: string;
  /** 输入框 DOM 位置（浮层定位用）*/
  anchorRect: DOMRect;
  /** 选中命令后的回调 */
  onSelect: (defaultContent: string) => void;
  /** 关闭菜单 */
  onClose: () => void;
}

interface SlashItem {
  plugin?: BlockPlugin;  // 块插件（可选；结构命令无需插件）
  trigger: string;
  description: string;
  defaultContent: string;
  group: "struct" | "block"; // 分组：结构操作 vs 块插入
}

/**
 * 结构操作命令（PATCH-01：/ol /ul /row+ /row- /col+ /col-）
 * 这些不对应 BlockPlugin，直接内置
 */
const STRUCT_COMMANDS: SlashItem[] = [
  {
    trigger: "ol",
    description: "有序列表（插入 3 项 1:/2:/3:）",
    defaultContent: '["1: ", "2: ", "3: "]',
    group: "struct",
  },
  {
    trigger: "ul",
    description: "无序列表（插入 3 个空字符串项）",
    defaultContent: '["", "", ""]',
    group: "struct",
  },
  {
    trigger: "row+",
    description: "在表格末尾追加一行",
    defaultContent: "__row_add__",
    group: "struct",
  },
  {
    trigger: "row-",
    description: "删除表格末尾一行",
    defaultContent: "__row_del__",
    group: "struct",
  },
  {
    trigger: "col+",
    description: "在表格末尾追加一列",
    defaultContent: "__col_add__",
    group: "struct",
  },
  {
    trigger: "col-",
    description: "删除表格末尾一列",
    defaultContent: "__col_del__",
    group: "struct",
  },
];

/** 收集所有注册了 slashCommand 的块插件 */
function buildSlashItems(): SlashItem[] {
  const items: SlashItem[] = [...STRUCT_COMMANDS];
  for (const plugin of blockRegistry.list()) {
    if (!plugin.slashCommand) continue;
    const { triggers, description, defaultContent } = plugin.slashCommand;
    items.push({ plugin, trigger: triggers[0], description, defaultContent, group: "block" });
  }
  return items;
}

export function SlashMenu({ query, anchorRect, onSelect, onClose }: SlashMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const allItems = useMemo(buildSlashItems, []);

  // 过滤：匹配 query（去掉前缀 /）
  const searchText = query.slice(1).toLowerCase();
  const items = useMemo(() => {
    if (!searchText) return allItems;
    return allItems.filter(
      (item) =>
        item.trigger.includes(searchText) ||
        item.description.toLowerCase().includes(searchText) ||
        item.plugin?.slashCommand?.triggers.some((t) => t.includes(searchText))
    );
  }, [allItems, searchText]);

  // 重置选中
  useEffect(() => { setActiveIndex(0); }, [searchText]);

  // 键盘导航
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (items[activeIndex]) onSelect(items[activeIndex].defaultContent);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, activeIndex, onSelect, onClose]);

  // 滚动活动项入视
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement;
    el?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  if (items.length === 0) {
    return (
      <SlashMenuWrapper anchorRect={anchorRect}>
        <li className="px-3 py-2 text-sm text-gray-400 italic">无匹配命令</li>
      </SlashMenuWrapper>
    );
  }

  return (
    <SlashMenuWrapper anchorRect={anchorRect} listRef={listRef}>
      {items.map((item, idx) => (
        <li
          key={item.plugin ? item.plugin.prefix : item.trigger}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer select-none ${
            idx === activeIndex ? "bg-blue-50" : "hover:bg-gray-50"
          }`}
          onMouseEnter={() => setActiveIndex(idx)}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item.defaultContent); }}
        >
          <span className={`font-mono text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
            item.group === "struct"
              ? "text-orange-600 bg-orange-50"
              : "text-blue-600 bg-blue-50"
          }`}>
            {item.group === "struct" ? `/${item.trigger}` : `::${item.plugin!.prefix}`}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700">{item.trigger}</p>
            <p className="text-xs text-gray-400 truncate">{item.description}</p>
          </div>
        </li>
      ))}
    </SlashMenuWrapper>
  );
}

// ── 浮层容器 ──────────────────────────────────────────────────────────────

function SlashMenuWrapper({
  anchorRect,
  listRef,
  children,
}: {
  anchorRect: DOMRect;
  listRef?: React.RefObject<HTMLUListElement>;
  children: React.ReactNode;
}) {
  // 定位：锚点下方，若超出底部则翻转到上方
  const top = anchorRect.bottom + 4;
  const left = anchorRect.left;
  const maxBottom = window.innerHeight - 8;
  const estimatedHeight = 240;
  const flipUp = top + estimatedHeight > maxBottom;

  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(left, window.innerWidth - 280),
    top: flipUp ? anchorRect.top - estimatedHeight - 4 : top,
    width: 280,
    zIndex: 9999,
  };

  return (
    <div style={style} className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      <ul ref={listRef} className="max-h-60 overflow-y-auto py-1">
        {children}
      </ul>
      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 text-xs text-gray-400">
        <span>↑↓ 导航</span>
        <span>Enter 选择</span>
        <span>Esc 关闭</span>
      </div>
    </div>
  );
}
