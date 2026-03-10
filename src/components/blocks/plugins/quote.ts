import { QuoteBlock } from "../QuoteBlock";
import type { BlockPlugin } from "../types";

export const quotePlugin: BlockPlugin = {
  prefix: "quote",
  render: QuoteBlock,
  slashCommand: {
    triggers: ["quote", "引用", "blockquote"],
    description: "引用块（支持路径引用 $.key.path）",
    defaultContent: "::quote \n引用内容",
  },
};
