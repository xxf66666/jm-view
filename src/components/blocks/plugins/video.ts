import { VideoBlock } from "../VideoBlock";
import type { BlockPlugin } from "../types";
export const videoPlugin: BlockPlugin = { prefix: "video", render: VideoBlock, slashCommand: { triggers: ["video", "视频"], description: "视频嵌入", defaultContent: "::video 视频标题\nhttps://example.com/video.mp4" } };
