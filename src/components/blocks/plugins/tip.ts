import { TipBlock } from "../TipBlock";
import type { BlockPlugin } from "../types";
export const tipPlugin: BlockPlugin = { prefix: "tip", render: TipBlock, slashCommand: { triggers: ["tip", "提示"], description: "提示块（绿色）", defaultContent: "::tip\n提示内容" } };
