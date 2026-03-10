import { WarningBlock } from "../WarningBlock";
import type { BlockPlugin } from "../types";
export const warningPlugin: BlockPlugin = { prefix: "warning", render: WarningBlock, slashCommand: { triggers: ["warning", "警告"], description: "警告块（橙色）", defaultContent: "::warning\n警告内容" } };
