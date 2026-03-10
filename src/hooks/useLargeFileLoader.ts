/**
 * useLargeFileLoader — 大文件加载处理（T22，AC13）
 *
 * >5MB 文件：显示警告 + 进度条 + 取消按钮
 * <5MB 文件：直接加载（正常流程）
 *
 * AC13：>5MB 文件显示进度条和取消按钮
 */

import { useState, useRef, useCallback } from "react";
import { useDocumentStore } from "../store/document-store";

const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

export interface LargeFileState {
  active: boolean;
  fileName: string;
  progress: number;  // 0-100
  canCancel: boolean;
}

export function useLargeFileLoader() {
  const [state, setState] = useState<LargeFileState>({
    active: false, fileName: "", progress: 0, canCancel: true,
  });
  const cancelRef = useRef(false);
  const loadFromJson = useDocumentStore((s) => s.loadFromJson);

  const load = useCallback(
    async (content: string, fileName: string, _filePath: string | null) => {
      const sizeBytes = new TextEncoder().encode(content).length;

      if (sizeBytes < LARGE_FILE_THRESHOLD) {
        // 正常加载
        loadFromJson(content, "file");
        return { cancelled: false };
      }

      // 大文件流程
      cancelRef.current = false;
      setState({ active: true, fileName, progress: 0, canCancel: true });

      // 分块 JSON parse 模拟进度（JSON.parse 本身不支持流式，此处用 setTimeout 分帧）
      return new Promise<{ cancelled: boolean }>((resolve) => {
        // Phase 1: 读取进度（0→50%）
        let phase1Done = false;
        const step1 = setInterval(() => {
          if (cancelRef.current) {
            clearInterval(step1);
            setState((s) => ({ ...s, active: false }));
            resolve({ cancelled: true });
            return;
          }
          setState((s) => {
            const next = Math.min(s.progress + 10, 50);
            if (next >= 50 && !phase1Done) {
              phase1Done = true;
              clearInterval(step1);
              // Phase 2: 解析（50→100%）
              setTimeout(() => {
                try {
                  if (cancelRef.current) {
                    setState((s2) => ({ ...s2, active: false }));
                    resolve({ cancelled: true });
                    return;
                  }
                  setState((s2) => ({ ...s2, progress: 90, canCancel: false }));
                  loadFromJson(content, "file");
                  setState((s2) => ({ ...s2, progress: 100 }));
                  setTimeout(() => {
                    setState((s2) => ({ ...s2, active: false }));
                    resolve({ cancelled: false });
                  }, 300);
                } catch (err) {
                  setState((s2) => ({ ...s2, active: false }));
                  resolve({ cancelled: false });
                }
              }, 100);
            }
            return { ...s, progress: next };
          });
        }, 80);
      });
    },
    [loadFromJson]
  );

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { state, load, cancel };
}
