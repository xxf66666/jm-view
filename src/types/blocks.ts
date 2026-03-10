/**
 * blocks.ts — 特殊块类型定义（MVF T09）
 *
 * 17 种 `::` 前缀特殊块：
 * quote / code / image / video / audio / math / mermaid /
 * link / file / heading / callout / divider / toggle /
 * embed / date / color / mention
 */

export type BlockType =
  | "quote"    // 引用块
  | "code"     // 代码块（含语法高亮+行号）
  | "image"    // 图片（Base64 或 URL）
  | "video"    // 视频
  | "audio"    // 音频
  | "math"     // KaTeX 数学公式
  | "mermaid"  // Mermaid.js 图表
  | "link"     // 超链接
  | "file"     // 文件附件信息
  | "heading"  // 标题 h1–h6
  | "callout"  // 提示/警告/错误/成功卡片
  | "divider"  // 分隔线
  | "toggle"   // 可折叠内容
  | "embed"    // URL iframe 嵌入
  | "date"     // 日期/时间显示
  | "color"    // 颜色色块
  | "mention"; // @用户 提及

export const ALL_BLOCK_TYPES: BlockType[] = [
  "quote", "code", "image", "video", "audio",
  "math", "mermaid", "link", "file", "heading",
  "callout", "divider", "toggle", "embed",
  "date", "color", "mention",
];

/**
 * 解析后的块结构
 * 原始字符串格式：`::TYPE [meta] [\ncontent]`
 */
export interface ParsedBlock {
  type: BlockType;
  /** 类型后第一行的元数据（如语言名、标题级别等）*/
  meta: string;
  /** 多行内容主体（换行符分隔后的其余部分） */
  content: string;
  /** 原始完整字符串 */
  raw: string;
}

/** 块组件通用 Props（架构文档规定接口）*/
export interface JmBlockProps {
  /** 原始字符串，如 "::quote This is a quote" */
  content: string;
  /** 在 JSON 文档中的路径（用于回写 Store）*/
  jsonPath: string[];
  /** 用户编辑后回写值 */
  onUpdate: (newContent: string) => void;
}
