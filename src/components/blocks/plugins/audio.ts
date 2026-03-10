import { AudioBlock } from "../AudioBlock";
import type { BlockPlugin } from "../types";
export const audioPlugin: BlockPlugin = { prefix: "audio", render: AudioBlock, slashCommand: { triggers: ["audio", "音频", "music"], description: "音频播放器", defaultContent: "::audio 音频标题\nhttps://example.com/audio.mp3" } };
