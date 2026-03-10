import { HeadingBlock } from "../HeadingBlock";
import type { BlockPlugin } from "../types";
export const headingPlugin: BlockPlugin = { prefix: "heading", render: HeadingBlock, slashCommand: { triggers: ["heading", "标题", "h1", "h2", "h3"], description: "标题（h1–h6）", defaultContent: "::heading 2\n第二级标题" } };
