/** 工具函数（非组件）：isBlockString。独立文件避免 react-refresh warning */
import { blockRegistry } from "./registry";
export function isBlockString(value: string): boolean {
  return blockRegistry.isBlock(value);
}
