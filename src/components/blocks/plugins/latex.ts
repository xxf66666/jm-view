import { LatexBlock } from "../LatexBlock";
import type { BlockPlugin } from "../types";
export const latexPlugin: BlockPlugin = { prefix: "latex", render: LatexBlock, slashCommand: { triggers: ["latex", "LaTeX"], description: "LaTeX 公式（KaTeX）", defaultContent: "::latex E = mc^2" } };
