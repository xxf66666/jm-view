/**
 * TabBar — 多标签页标签栏（T14，AC12）
 * Notepad++ 风格：标签可关闭，活跃标签高亮，双击新建
 */

import React from "react";
import { X, FilePlus, Circle } from "lucide-react";
import { useTabStore, selectTabs, selectActiveTabId } from "../../store/tab-store";

export function TabBar() {
  const tabs = useTabStore(selectTabs);
  const activeTabId = useTabStore(selectActiveTabId);
  const { switchTab, closeTab, newTab } = useTabStore();

  return (
    <div className="flex items-stretch overflow-x-auto bg-gray-100 border-b border-gray-200 flex-shrink-0 select-none min-h-[34px]">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap border-r border-gray-200
              min-w-[80px] max-w-[180px] group/tab relative
              ${isActive
                ? "bg-white text-gray-800 font-medium shadow-[inset_0_2px_0_#3b82f6]"
                : "bg-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-700"}
            `}
            onClick={() => switchTab(tab.id)}
            title={tab.filePath ?? tab.title}
          >
            {/* 未保存标记 */}
            {tab.isDirty && (
              <Circle size={6} className="flex-shrink-0 fill-blue-500 text-blue-500" />
            )}
            <span className="truncate flex-1 text-left">{tab.title}</span>
            {/* 关闭按钮 */}
            <span
              className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover/tab:opacity-60 hover:!opacity-100 hover:bg-gray-200"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              role="button"
              aria-label={`关闭 ${tab.title}`}
            >
              <X size={11} />
            </span>
          </button>
        );
      })}

      {/* 新建标签按钮 */}
      <button
        className="flex items-center justify-center px-2 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex-shrink-0"
        onClick={newTab}
        title="新建标签页 (Ctrl+N)"
      >
        <FilePlus size={13} />
      </button>
    </div>
  );
}
