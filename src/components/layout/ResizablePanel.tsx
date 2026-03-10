/**
 * ResizablePanel — 可拖拽调整宽度的侧边面板
 *
 * 支持：
 * - 左侧面板（resizeDirection: "right"）：向右拖拽手柄调整宽度
 * - 右侧面板（resizeDirection: "left"）：向左拖拽手柄调整宽度
 * - 折叠/展开（collapsed 状态）
 * - 最小/最大宽度限制
 */

import React, { useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ResizablePanelProps {
  /** 初始宽度（px） */
  defaultWidth: number;
  /** 最小宽度（px） */
  minWidth?: number;
  /** 最大宽度（px） */
  maxWidth?: number;
  /** 折叠方向 */
  resizeDirection: "left" | "right";
  /** 是否折叠 */
  collapsed: boolean;
  /** 折叠状态变化回调 */
  onCollapsedChange: (collapsed: boolean) => void;
  /** 宽度变化回调（可选，用于持久化） */
  onWidthChange?: (width: number) => void;
  /** 面板标题 */
  title: string;
  /** aria-label */
  ariaLabel?: string;
  children: React.ReactNode;
}

export function ResizablePanel({
  defaultWidth,
  minWidth = 160,
  maxWidth = 600,
  resizeDirection,
  collapsed,
  onCollapsedChange,
  onWidthChange,
  title,
  ariaLabel,
  children,
}: ResizablePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const widthRef = useRef(defaultWidth);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // 同步宽度到 DOM（不触发 React re-render，性能更好）
  const applyWidth = useCallback(
    (w: number) => {
      const clamped = Math.max(minWidth, Math.min(maxWidth, w));
      widthRef.current = clamped;
      if (panelRef.current) {
        panelRef.current.style.width = `${clamped}px`;
      }
      onWidthChange?.(clamped);
    },
    [minWidth, maxWidth, onWidthChange]
  );

  // 初始化宽度
  useEffect(() => {
    applyWidth(defaultWidth);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = widthRef.current;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta =
          resizeDirection === "right"
            ? ev.clientX - startX.current
            : startX.current - ev.clientX;
        applyWidth(startWidth.current + delta);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [resizeDirection, applyWidth]
  );

  const handleEl =
    resizeDirection === "right" ? (
      // 右侧拖拽手柄（左面板）
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors group z-10"
        onMouseDown={onMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整面板宽度"
      >
        <div className="absolute inset-y-0 -right-1 w-3" /> {/* 扩大拖拽区 */}
      </div>
    ) : (
      // 左侧拖拽手柄（右面板）
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors z-10"
        onMouseDown={onMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整面板宽度"
      >
        <div className="absolute inset-y-0 -left-1 w-3" />
      </div>
    );

  const collapseBtn =
    resizeDirection === "right" ? (
      <button
        className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-400"
        onClick={() => onCollapsedChange(!collapsed)}
        aria-label={collapsed ? "展开面板" : "折叠面板"}
        title={collapsed ? "展开" : "折叠"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    ) : (
      <button
        className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-400"
        onClick={() => onCollapsedChange(!collapsed)}
        aria-label={collapsed ? "展开面板" : "折叠面板"}
        title={collapsed ? "展开" : "折叠"}
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    );

  if (collapsed) {
    return (
      <aside
        className={`relative flex-shrink-0 bg-white border-gray-200 flex flex-col items-center py-3 ${
          resizeDirection === "right" ? "border-r" : "border-l"
        }`}
        style={{ width: 36 }}
        aria-label={ariaLabel ?? title}
        aria-expanded="false"
      >
        <button
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
          onClick={() => onCollapsedChange(false)}
          aria-label="展开面板"
          title="展开"
        >
          {resizeDirection === "right" ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>
        {/* 旋转标题 */}
        <span
          className="mt-4 text-xs text-gray-400 font-medium tracking-wide"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {title}
        </span>
      </aside>
    );
  }

  return (
    <aside
      ref={panelRef}
      className={`relative flex-shrink-0 bg-white border-gray-200 flex flex-col overflow-hidden ${
        resizeDirection === "right" ? "border-r" : "border-l"
      }`}
      style={{ width: defaultWidth }}
      aria-label={ariaLabel ?? title}
      aria-expanded="true"
    >
      {/* 拖拽手柄 */}
      {handleEl}

      {/* 面板头部 */}
      <div className="flex items-center px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </span>
        {collapseBtn}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
    </aside>
  );
}
