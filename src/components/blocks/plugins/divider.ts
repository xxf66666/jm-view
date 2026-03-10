import { DividerBlock } from "../DividerBlock";
import type { BlockPlugin } from "../types";
export const dividerPlugin: BlockPlugin = { prefix: "divider", render: DividerBlock, slashCommand: { triggers: ["divider", "分隔线", "hr"], description: "分隔线（solid/dashed/dotted）", defaultContent: "::divider" } };
