import { NoteBlock } from "../NoteBlock";
import type { BlockPlugin } from "../types";
export const notePlugin: BlockPlugin = { prefix: "note", render: NoteBlock, slashCommand: { triggers: ["note", "笔记"], description: "笔记块", defaultContent: "::note\n笔记内容" } };
