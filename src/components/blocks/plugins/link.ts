import { LinkBlock } from "../LinkBlock";
import type { BlockPlugin } from "../types";
export const linkPlugin: BlockPlugin = { prefix: "link", render: LinkBlock, slashCommand: { triggers: ["link", "链接", "url"], description: "超链接", defaultContent: "::link 链接文字\nhttps://example.com" } };
