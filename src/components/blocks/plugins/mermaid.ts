import { MermaidBlock } from "../MermaidBlock";
import type { BlockPlugin } from "../types";
export const mermaidPlugin: BlockPlugin = { prefix: "mermaid", render: MermaidBlock, slashCommand: { triggers: ["mermaid", "diagram", "图表"], description: "Mermaid.js 图表（流程图/时序图等）", defaultContent: "::mermaid\ngraph TD\n  A[开始] --> B[结束]" } };
