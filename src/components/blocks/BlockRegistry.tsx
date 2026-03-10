/**
 * BlockRegistry.tsx — 特殊块组件注册表与分发器（MVF T09）
 *
 * 架构文档规定的 Registry 模式：
 * 动态匹配 `::` 前缀，分发给对应 React 组件
 * 回退机制：无法识别时渲染 FallbackBlock
 */

import React from "react";
import { parseBlock } from "../../utils/block-parser";
import { isBlockString } from "../../utils/block-parser";
import type { JmBlockProps, BlockType } from "../../types/blocks";

// ── 块组件导入 ─────────────────────────────────────────────────────────────
import { QuoteBlock } from "./QuoteBlock";
import { CodeBlock } from "./CodeBlock";
import { ImageBlock } from "./ImageBlock";
import { VideoBlock } from "./VideoBlock";
import { AudioBlock } from "./AudioBlock";
import { MathBlock } from "./MathBlock";
import { MermaidBlock } from "./MermaidBlock";
import { LinkBlock } from "./LinkBlock";
import { FileBlock } from "./FileBlock";
import { HeadingBlock } from "./HeadingBlock";
import { CalloutBlock } from "./CalloutBlock";
import { DividerBlock } from "./DividerBlock";
import { ToggleBlock } from "./ToggleBlock";
import { EmbedBlock } from "./EmbedBlock";
import { DateBlock } from "./DateBlock";
import { ColorBlock } from "./ColorBlock";
import { MentionBlock } from "./MentionBlock";

// ── 注册表 ─────────────────────────────────────────────────────────────────

const REGISTRY: Record<BlockType, React.FC<JmBlockProps>> = {
  quote:   QuoteBlock,
  code:    CodeBlock,
  image:   ImageBlock,
  video:   VideoBlock,
  audio:   AudioBlock,
  math:    MathBlock,
  mermaid: MermaidBlock,
  link:    LinkBlock,
  file:    FileBlock,
  heading: HeadingBlock,
  callout: CalloutBlock,
  divider: DividerBlock,
  toggle:  ToggleBlock,
  embed:   EmbedBlock,
  date:    DateBlock,
  color:   ColorBlock,
  mention: MentionBlock,
};

// ── 分发器 ─────────────────────────────────────────────────────────────────

interface BlockDispatcherProps extends JmBlockProps {
  /** 是否允许编辑（只读模式用于大纲预览等场景）*/
  readOnly?: boolean;
}

/**
 * BlockDispatcher — 根据 `::TYPE` 前缀动态渲染对应块组件
 * 无法识别时渲染 FallbackBlock（不 crash，不抛异常）
 */
export function BlockDispatcher({
  content,
  jsonPath,
  onUpdate,
  readOnly = false,
}: BlockDispatcherProps) {
  // 解析失败 → 回退到普通字符串显示
  if (!isBlockString(content)) {
    return <FallbackBlock content={content} />;
  }

  const parsed = parseBlock(content);
  if (!parsed) {
    return <FallbackBlock content={content} />;
  }

  const BlockComponent = REGISTRY[parsed.type];
  if (!BlockComponent) {
    return <FallbackBlock content={content} />;
  }

  // 用 ErrorBoundary 包裹，防止单个块崩溃导致整个画布崩溃
  return (
    <BlockErrorBoundary blockType={parsed.type} raw={content}>
      <BlockComponent
        content={content}
        jsonPath={jsonPath}
        onUpdate={readOnly ? () => undefined : onUpdate}
      />
    </BlockErrorBoundary>
  );
}

// ── 降级块 ─────────────────────────────────────────────────────────────────

function FallbackBlock({ content }: { content: string }) {
  return (
    <span className="text-sm font-mono text-gray-500 italic">
      {content}
    </span>
  );
}

// ── ErrorBoundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean; error: string }

class BlockErrorBoundary extends React.Component<
  { blockType: BlockType; raw: string; children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { blockType: BlockType; raw: string; children: React.ReactNode }) {
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
            ::{this.props.blockType}
          </span>
          <span>渲染错误：{this.state.error}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export { isBlockString };
