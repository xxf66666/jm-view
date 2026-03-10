import { ColorBlock } from "../ColorBlock";
import type { BlockPlugin } from "../types";
export const colorPlugin: BlockPlugin = { prefix: "color", render: ColorBlock, slashCommand: { triggers: ["color", "颜色", "colour"], description: "颜色色块（点击复制）", defaultContent: "::color #3b82f6" } };
