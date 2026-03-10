/**
 * blocks/index.ts — 块插件注册入口（T09.0 框架）
 *
 * 协作规范：每行一个 registerBlock，单行注释标注块类型，
 * 避免 merge 冲突（各人各改各行）。
 *
 * 引入此文件后所有块自动注册到全局 blockRegistry。
 * App.tsx / EntryCard 只需 `import "./components/blocks"` 一次。
 */

import { registerBlock } from "./registry";

// ── 块组件导入 ─────────────────────────────────────────────────────────────
import { quotePlugin }   from "./plugins/quote";    // ::quote
import { codePlugin }    from "./plugins/code";     // ::code (AC04)
import { imagePlugin }   from "./plugins/image";    // ::image
import { videoPlugin }   from "./plugins/video";    // ::video
import { audioPlugin }   from "./plugins/audio";    // ::audio
import { mathPlugin }    from "./plugins/math";     // ::math (KaTeX)
import { mermaidPlugin } from "./plugins/mermaid";  // ::mermaid (Mermaid.js)
import { linkPlugin }    from "./plugins/link";     // ::link
import { filePlugin }    from "./plugins/file";     // ::file
import { headingPlugin } from "./plugins/heading";  // ::heading
import { calloutPlugin } from "./plugins/callout";  // ::callout
import { dividerPlugin } from "./plugins/divider";  // ::divider
import { togglePlugin }  from "./plugins/toggle";   // ::toggle
import { embedPlugin }   from "./plugins/embed";    // ::embed
import { datePlugin }    from "./plugins/date";     // ::date
import { colorPlugin }   from "./plugins/color";    // ::color
import { mentionPlugin } from "./plugins/mention";  // ::mention

// ── 注册（顺序即为斜杠菜单显示顺序，T11 会用到）─────────────────────────
registerBlock(quotePlugin);
registerBlock(codePlugin);
registerBlock(imagePlugin);
registerBlock(videoPlugin);
registerBlock(audioPlugin);
registerBlock(mathPlugin);
registerBlock(mermaidPlugin);
registerBlock(linkPlugin);
registerBlock(filePlugin);
registerBlock(headingPlugin);
registerBlock(calloutPlugin);
registerBlock(dividerPlugin);
registerBlock(togglePlugin);
registerBlock(embedPlugin);
registerBlock(datePlugin);
registerBlock(colorPlugin);
registerBlock(mentionPlugin);

// 导出 registry 引用（方便 EntryCard 等直接使用）
export { blockRegistry } from "./registry";
export { PlaceholderBlock } from "./PlaceholderBlock";
