import { MetaBlock } from "../MetaBlock";
import type { BlockPlugin } from "../types";
export const metaPlugin: BlockPlugin = { prefix: "meta", render: MetaBlock, slashCommand: { triggers: ["meta", "元数据"], description: "元数据 KV 标签", defaultContent: "::meta key\nvalue" } };
