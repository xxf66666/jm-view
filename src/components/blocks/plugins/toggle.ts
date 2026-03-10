import { ToggleBlock } from "../ToggleBlock";
import type { BlockPlugin } from "../types";
export const togglePlugin: BlockPlugin = { prefix: "toggle", render: ToggleBlock, slashCommand: { triggers: ["toggle", "折叠", "details"], description: "可折叠内容区", defaultContent: "::toggle 点击展开\n隐藏内容" } };
