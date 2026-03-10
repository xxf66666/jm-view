import { MathBlock } from "../MathBlock";
import type { BlockPlugin } from "../types";
export const mathPlugin: BlockPlugin = { prefix: "math", render: MathBlock, slashCommand: { triggers: ["math", "数学", "katex", "latex"], description: "KaTeX 数学公式", defaultContent: "::math E = mc^2" } };
