/**
 * types.ts — 特殊块插件接口定义（T09.0 框架）
 *
 * 架构规范：
 * - BlockPlugin 是最小可运行单元，prefix + render 是必须实现的最低要求
 * - toolbar?：块内工具栏按钮（复制/编辑/删除等，T11 斜杠命令扩展点）
 * - slashCommand?：斜杠命令触发配置（T11 实现）
 */

import type React from "react";

/** 块组件的通用 Props（与 JmBlockProps 保持一致）*/
export interface BlockRenderProps {
  /** 原始字符串，如 "::code javascript\nconst x = 1;" */
  content: string;
  /** 在 JSON 文档中的路径（用于回写 Store）*/
  jsonPath: string[];
  /** 用户编辑后回写新值 */
  onUpdate: (newContent: string) => void;
}

/** 工具栏按钮定义（T11 预留扩展点）*/
export interface BlockToolbarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: (props: BlockRenderProps) => void;
}

/** 斜杠命令配置（T11 斜杠命令系统实现）*/
export interface BlockSlashCommand {
  /** 触发词，如 "code", "数学公式" */
  triggers: string[];
  /** 命令描述（斜杠菜单显示）*/
  description: string;
  /** 插入时的默认内容 */
  defaultContent: string;
}

/** 块插件接口 — 最低要求：prefix + render */
export interface BlockPlugin {
  /** 唯一前缀标识，如 "code", "quote"（不含 ::）*/
  prefix: string;
  /** 渲染函数，必须安全——禁止 throw，遇错渲染降级 UI */
  render: React.FC<BlockRenderProps>;
  /** 可选：工具栏按钮配置 */
  toolbar?: BlockToolbarItem[];
  /** 可选：斜杠命令触发配置（T11 实现）*/
  slashCommand?: BlockSlashCommand;
}
