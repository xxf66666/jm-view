import { CodeBlock } from "../CodeBlock";
import type { BlockPlugin } from "../types";

export const codePlugin: BlockPlugin = {
  prefix: "code",
  render: CodeBlock,
  slashCommand: {
    triggers: ["code", "代码", "snippet"],
    description: "代码块（语法高亮 + 行号）",
    defaultContent: "::code javascript\n// 代码",
  },
};
