import { FileBlock } from "../FileBlock";
import type { BlockPlugin } from "../types";
export const filePlugin: BlockPlugin = { prefix: "file", render: FileBlock, slashCommand: { triggers: ["file", "文件", "attachment"], description: "文件附件", defaultContent: "::file 文件名.pdf\nhttps://example.com/file.pdf" } };
