import { CalloutBlock } from "../CalloutBlock";
import type { BlockPlugin } from "../types";
export const calloutPlugin: BlockPlugin = { prefix: "callout", render: CalloutBlock, slashCommand: { triggers: ["callout", "提示", "警告", "alert"], description: "提示/警告/错误/成功卡片", defaultContent: "::callout info\n提示内容" } };
