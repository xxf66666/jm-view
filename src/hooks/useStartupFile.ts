/**
 * useStartupFile — 命令行参数启动自动打开文件（T25）
 *
 * 调用 `get_startup_file` IPC，若有路径则读取内容并加载到 Store
 * 仅 Tauri 环境生效；浏览器环境静默跳过
 */

import { useEffect } from "react";
import { isTauri, invoke } from "../utils/ipc";
import { useDocumentStore } from "../store/document-store";
import { useTabStore } from "../store/tab-store";

export function useStartupFile() {
  const loadFromJson = useDocumentStore((s) => s.loadFromJson);
  const openTab = useTabStore((s) => s.openTab);

  useEffect(() => {
    if (!isTauri()) return;

    invoke<string | null>("get_startup_file")
      .then((filePath) => {
        if (!filePath) return;
        return invoke<string>("fs_read_file", { path: filePath }).then((content) => {
          loadFromJson(content, "file");
          const title = filePath.split(/[/\\]/).pop() ?? "文件";
          openTab(filePath, content, title);
        });
      })
      .catch((e) => {
        // 非阻塞：启动参数读取失败不影响正常使用
        console.warn("[useStartupFile] 启动参数读取失败:", e);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
