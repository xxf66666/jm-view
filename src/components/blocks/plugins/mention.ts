import { MentionBlock } from "../MentionBlock";
import type { BlockPlugin } from "../types";
export const mentionPlugin: BlockPlugin = { prefix: "mention", render: MentionBlock, slashCommand: { triggers: ["mention", "提及", "@"], description: "@用户 提及", defaultContent: "::mention @用户名" } };
