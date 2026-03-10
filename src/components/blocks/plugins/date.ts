import { DateBlock } from "../DateBlock";
import type { BlockPlugin } from "../types";
export const datePlugin: BlockPlugin = { prefix: "date", render: DateBlock, slashCommand: { triggers: ["date", "日期", "time", "时间"], description: "日期/时间显示", defaultContent: "::date datetime\n2026-01-01T00:00:00Z" } };
