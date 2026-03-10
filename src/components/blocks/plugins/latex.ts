import { LatexBlock } from "../LatexBlock";
import type { BlockPlugin } from "../types";
// prefix 使用 REQ 附录 B 规定的大写形式 "LaTeX"
// registry 存储时会规范化为 lowercase，::LaTeX / ::latex 均可命中
export const latexPlugin: BlockPlugin = { prefix: "LaTeX", render: LatexBlock, slashCommand: { triggers: ["latex", "LaTeX"], description: "LaTeX 公式（KaTeX）", defaultContent: "::LaTeX E = mc^2" } };
