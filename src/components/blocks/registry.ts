/**
 * registry.ts — 块插件注册表单例（T09.0 框架）
 *
 * 使用方式：
 *   import { registerBlock, blockRegistry } from "./registry";
 *   registerBlock({ prefix: "code", render: CodeBlock });
 *   blockRegistry.render("::code js\nhello", props) // → React 元素
 *
 * 规则：
 * - 重复注册同一 prefix → 抛错（开发期保护，防 bundle 重复）
 * - 未找到 prefix → 返回 null（调用方负责渲染 PlaceholderBlock）
 */

import type { BlockPlugin } from "./types";

class BlockRegistry {
  private plugins = new Map<string, BlockPlugin>();

  /**
   * 注册一个块插件
   * @throws {Error} 若 prefix 已注册
   */
  register(plugin: BlockPlugin): void {
    if (this.plugins.has(plugin.prefix)) {
      throw new Error(
        `[BlockRegistry] prefix "::${plugin.prefix}" 已注册，禁止重复注册。`
      );
    }
    this.plugins.set(plugin.prefix, plugin);
  }

  /**
   * 按 prefix 获取插件
   */
  get(prefix: string): BlockPlugin | undefined {
    return this.plugins.get(prefix);
  }

  /**
   * 检测字符串是否为已注册的特殊块
   */
  isBlock(value: string): boolean {
    if (typeof value !== "string" || !value.startsWith("::")) return false;
    const prefix = this.extractPrefix(value);
    return prefix !== null && this.plugins.has(prefix);
  }

  /**
   * 从 ::TYPE 字符串提取前缀
   */
  extractPrefix(raw: string): string | null {
    if (!raw.startsWith("::")) return null;
    const rest = raw.slice(2);
    const spaceIdx = rest.indexOf(" ");
    const newlineIdx = rest.indexOf("\n");

    let end: number;
    if (spaceIdx === -1 && newlineIdx === -1) end = rest.length;
    else if (spaceIdx === -1) end = newlineIdx;
    else if (newlineIdx === -1) end = spaceIdx;
    else end = Math.min(spaceIdx, newlineIdx);

    const prefix = rest.slice(0, end).toLowerCase();
    return prefix || null;
  }

  /**
   * 获取所有已注册插件列表（按注册顺序）
   */
  list(): BlockPlugin[] {
    return [...this.plugins.values()];
  }

  /**
   * 仅用于测试：重置注册表
   */
  _reset_for_test(): void {
    this.plugins.clear();
  }
}

/** 全局单例 */
export const blockRegistry = new BlockRegistry();

/**
 * 注册块插件的便捷函数
 * @throws {Error} 若 prefix 已注册
 */
export function registerBlock(plugin: BlockPlugin): void {
  blockRegistry.register(plugin);
}
