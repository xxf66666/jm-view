import { EmbedBlock } from "../EmbedBlock";
import type { BlockPlugin } from "../types";
export const embedPlugin: BlockPlugin = { prefix: "embed", render: EmbedBlock, slashCommand: { triggers: ["embed", "嵌入", "iframe"], description: "URL iframe 嵌入", defaultContent: "::embed 标题\nhttps://example.com" } };
