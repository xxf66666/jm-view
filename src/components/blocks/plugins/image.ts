import { ImageBlock } from "../ImageBlock";
import type { BlockPlugin } from "../types";
export const imagePlugin: BlockPlugin = { prefix: "image", render: ImageBlock, slashCommand: { triggers: ["image", "图片", "img"], description: "图片（Base64 或 URL）", defaultContent: "::image 图片描述\nhttps://example.com/image.png" } };
