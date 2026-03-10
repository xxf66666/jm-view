/**
 * useDraftAutosave — 草稿自动保存 Hook（T16）
 *
 * 行为：
 * - 每 30 秒将当前文档 jsonString 写入 Rust 草稿目录
 * - doc_id 基于文件路径或 "untitled-<sessionId>"
 * - 仅在有内容时才写草稿（空文档不写）
 * - 组件卸载时清除 interval
 */

import { useEffect, useRef } from "react";
import { useDocumentStore } from "../store/document-store";
import { isTauri, invoke } from "../utils/ipc";

const AUTOSAVE_INTERVAL_MS = 30_000;

export function useDraftAutosave(currentPath: string | null) {
  const sessionId = useRef(`session-${Date.now()}`);
  const jsonString = useDocumentStore((s) => s.jsonString);
  const isDirty = useDocumentStore((s) => s.isDirty);

  useEffect(() => {
    if (!isTauri()) return; // 浏览器环境不写草稿

    const docId = currentPath
      ? encodeURIComponent(currentPath.replace(/[/\\]/g, "_"))
      : sessionId.current;

    const save = () => {
      const current = useDocumentStore.getState();
      // 内容为空或未修改时不写草稿
      if (!current.isDirty || current.jsonString === "{}" || current.jsonString === "[]") return;

      invoke<void>("fs_save_draft", {
        docId,
        content: current.jsonString,
      }).catch(() => {
        // 静默失败，不干扰用户操作
      });
    };

    const timer = setInterval(save, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  // 让 isDirty 变量不产生 lint warning（实际通过 getState() 读）
  void isDirty;
  void jsonString;
}
