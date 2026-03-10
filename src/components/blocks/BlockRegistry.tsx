/**
 * BlockRegistry.tsx — 块分发器（T09.0 框架）
 *
 * 使用全局 blockRegistry 单例路由 `::TYPE` 字符串到对应插件 render 函数。
 * blocks/index.ts 完成所有插件注册后，此分发器自动获取最新注册状态。
 */

import React from "react";
import { blockRegistry } from "./registry";
import { PlaceholderBlock } from "./PlaceholderBlock";
import type { BlockRenderProps } from "./types";

interface BlockDispatcherProps extends BlockRenderProps {
  readOnly?: boolean;
}

/**
 * BlockDispatcher — 根据 `::TYPE` 前缀动态渲染对应块组件
 * 降级链：未注册 → PlaceholderBlock；渲染报错 → BlockErrorBoundary
 */
export function BlockDispatcher({
  content,
  jsonPath,
  onUpdate,
  readOnly = false,
}: BlockDispatcherProps) {
  if (!blockRegistry.isBlock(content)) {
    return <PlaceholderBlock content={content} reason="未识别的块类型" />;
  }

  const prefix = blockRegistry.extractPrefix(content);
  if (!prefix) {
    return <PlaceholderBlock content={content} reason="前缀解析失败" />;
  }

  const plugin = blockRegistry.get(prefix);
  if (!plugin) {
    return <PlaceholderBlock content={content} reason={`::${prefix} 未注册`} />;
  }

  const BlockComponent = plugin.render;

  return (
    <BlockErrorBoundary prefix={prefix} raw={content}>
      <BlockComponent
        content={content}
        jsonPath={jsonPath}
        onUpdate={readOnly ? () => undefined : onUpdate}
      />
    </BlockErrorBoundary>
  );
}

// ── ErrorBoundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean; error: string }

class BlockErrorBoundary extends React.Component<
  { prefix: string; raw: string; children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { prefix: string; raw: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error: String(error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <span className="font-mono text-xs bg-red-100 px-1 rounded">
            ::{this.props.prefix}
          </span>
          <span>渲染错误：{this.state.error}</span>
        </div>
      );
    }
    return this.props.children;
  }
}


