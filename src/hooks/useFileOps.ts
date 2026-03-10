/**
 * useFileOps — 文件操作 hook（T13）
 *
 * 封装：打开文件 / 保存 / 另存为
 * 与 DocumentStore 集成，处理 IPC 调用 + Store 更新
 */

import { useCallback, useEffect, useState } from "react";
import { useDocumentStore } from "../store/document-store";
import { openFile, saveFile, saveFileAs } from "../utils/ipc";

export interface FileState {
  currentPath: string | null;
  isDirty: boolean;
}

export function useFileOps() {
  const loadFromJson = useDocumentStore((s) => s.loadFromJson);
  const jsonString = useDocumentStore((s) => s.jsonString);

  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── 订阅 DocumentStore 内容变化，联动 isDirty ────────────────────────
  // 使用 getState().jsonString 作为 baseline，防止首次渲染误触发
  useEffect(() => {
    let prevJsonString = useDocumentStore.getState().jsonString;

    const unsub = useDocumentStore.subscribe((state) => {
      const newJsonString = state.jsonString;
      if (newJsonString !== prevJsonString) {
        prevJsonString = newJsonString;
        setIsDirty(true);
      }
    });

    return () => unsub();
  }, []); // 仅 mount 时注册一次；保存/打开/新建后由各自 handler 调用 setIsDirty(false)

  // ── 打开文件 ─────────────────────────────────────────────────────────

  const handleOpen = useCallback(async () => {
    try {
      const result = await openFile();
      if (!result) return; // 用户取消

      loadFromJson(result.content, "file");
      setCurrentPath(result.path);
      setIsDirty(false);
    } catch (err) {
      console.error("[useFileOps] 打开文件失败:", err);
      // TODO T15: 显示错误 toast
    }
  }, [loadFromJson]);

  // ── 另存为 ───────────────────────────────────────────────────────────

  const handleSaveAs = useCallback(async () => {
    try {
      const savedPath = await saveFileAs(jsonString);
      if (savedPath) {
        setCurrentPath(savedPath);
        setIsDirty(false);
      }
    } catch (err) {
      console.error("[useFileOps] 另存为失败:", err);
    }
  }, [jsonString]);

  // ── 保存（Ctrl+S）：有路径直接写，否则走另存为 ───────────────────────

  const handleSave = useCallback(async () => {
    if (!currentPath) {
      return handleSaveAs();
    }
    try {
      await saveFile(currentPath, jsonString);
      setIsDirty(false);
    } catch (err) {
      console.error("[useFileOps] 保存失败:", err);
    }
  }, [currentPath, jsonString, handleSaveAs]);

  // ── 新建文档 ─────────────────────────────────────────────────────────

  const handleNew = useCallback(() => {
    loadFromJson("{}", "file");
    setCurrentPath(null);
    setIsDirty(false);
  }, [loadFromJson]);

  return {
    currentPath,
    isDirty,
    handleOpen,
    handleSave,
    handleSaveAs,
    handleNew,
    setIsDirty,
  };
}
