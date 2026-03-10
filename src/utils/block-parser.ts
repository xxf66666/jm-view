/**
 * block-parser.ts — `::` 前缀特殊块解析器
 *
 * 格式规范：
 * - 单行：`::TYPE meta_or_content`
 * - 多行：`::TYPE meta\ncontent_line1\ncontent_line2`
 *
 * 示例：
 *   "::quote 这是一段引用"
 *   "::code javascript\nconst x = 1;"
 *   "::math E = mc^2"
 *   "::heading 2\n第二级标题"
 *   "::callout warning\n注意这里有一个问题"
 */

import { BlockType, ParsedBlock, ALL_BLOCK_TYPES } from "../types/blocks";

/**
 * 检测字符串是否为特殊块
 */
export function isBlockString(value: string): boolean {
  if (typeof value !== "string") return false;
  return value.startsWith("::") && getBlockType(value) !== null;
}

/**
 * 提取块类型（不解析内容）
 */
export function getBlockType(raw: string): BlockType | null {
  if (!raw.startsWith("::")) return null;
  const firstSpace = raw.indexOf(" ");
  const firstNewline = raw.indexOf("\n");

  let typeEnd: number;
  if (firstSpace === -1 && firstNewline === -1) typeEnd = raw.length;
  else if (firstSpace === -1) typeEnd = firstNewline;
  else if (firstNewline === -1) typeEnd = firstSpace;
  else typeEnd = Math.min(firstSpace, firstNewline);

  const typeStr = raw.slice(2, typeEnd).toLowerCase() as BlockType;
  return (ALL_BLOCK_TYPES as string[]).includes(typeStr) ? typeStr : null;
}

/**
 * 完整解析块字符串
 */
export function parseBlock(raw: string): ParsedBlock | null {
  const type = getBlockType(raw);
  if (!type) return null;

  const prefix = `::${type}`;
  const rest = raw.slice(prefix.length);

  // rest 可能是 "" / " meta" / "\ncontent" / " meta\ncontent"
  let meta = "";
  let content = "";

  if (rest === "") {
    // 无内容
  } else if (rest.startsWith("\n")) {
    // `::TYPE\ncontent`
    content = rest.slice(1);
  } else if (rest.startsWith(" ")) {
    const afterSpace = rest.slice(1);
    const newlineIdx = afterSpace.indexOf("\n");
    if (newlineIdx === -1) {
      // `::TYPE meta_or_single_line`
      meta = afterSpace;
    } else {
      // `::TYPE meta\ncontent`
      meta = afterSpace.slice(0, newlineIdx);
      content = afterSpace.slice(newlineIdx + 1);
    }
  }

  return { type, meta, content, raw };
}

/**
 * 将 ParsedBlock 序列化回字符串（编辑后回写 Store）
 */
export function serializeBlock(
  type: BlockType,
  meta: string,
  content: string
): string {
  const parts = [`::${type}`];
  if (meta) parts.push(` ${meta}`);
  if (content) parts.push(`\n${content}`);
  return parts.join("");
}
