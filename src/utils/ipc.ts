/**
 * ipc.ts — Tauri IPC 封装（类型安全）
 *
 * 所有 invoke 调用必须处理 Err 分支（架构文档要求），
 * 禁止 unwrap 式忽略错误。
 *
 * 约定：
 * - 用户取消（user_cancelled）不视为错误，返回 null
 * - 其他错误抛出或返回 Result<T, string>
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";

/** 通用 IPC 调用（Tauri invoke 的安全封装，浏览器环境 reject）*/
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error(`ipc invoke "${cmd}" called outside Tauri`);
  return tauriInvoke<T>(cmd, args);
}

// ── 类型定义 ──────────────────────────────────────────────────────────────

export interface OpenFileResult {
  path: string;
  content: string;
}

export interface DraftInfo {
  draft_id: string;
  doc_id: string;
  saved_at: string;
  size: number;
}

// ── 是否在 Tauri 环境中运行 ───────────────────────────────────────────────
// 浏览器 dev 模式下 window.__TAURI__ 不存在，此时 IPC 调用会失败

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// ── T13: 打开文件 ─────────────────────────────────────────────────────────

/**
 * 弹出文件选择对话框，读取 JSON 文件内容
 * 用户取消时返回 null
 */
export async function openFile(): Promise<OpenFileResult | null> {
  if (!isTauri()) {
    console.warn("[IPC] openFile: 非 Tauri 环境，使用 File Input 降级");
    return openFileViaInput();
  }

  try {
    const result = await tauriInvoke<OpenFileResult>("fs_open_file");
    return result;
  } catch (err) {
    if (err === "user_cancelled") return null;
    throw new Error(`打开文件失败: ${err}`);
  }
}

/** 浏览器降级：使用 <input type="file"> */
async function openFileViaInput(): Promise<OpenFileResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const content = await file.text();
      resolve({ path: file.name, content });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ── T13: 保存文件（已知路径） ─────────────────────────────────────────────

export async function saveFile(path: string, content: string): Promise<void> {
  if (!isTauri()) {
    console.warn("[IPC] saveFile: 非 Tauri 环境，使用 Blob 下载降级");
    downloadAsJson(content, path.split("/").pop() ?? "document.json");
    return;
  }

  try {
    await tauriInvoke<void>("fs_save_file", { path, content });
  } catch (err) {
    throw new Error(`保存文件失败: ${err}`);
  }
}

// ── T13: 另存为 ───────────────────────────────────────────────────────────

/**
 * 弹出另存为对话框
 * 用户取消时返回 null，成功时返回保存路径
 */
export async function saveFileAs(content: string): Promise<string | null> {
  if (!isTauri()) {
    downloadAsJson(content, "document.json");
    return "document.json";
  }

  try {
    const savedPath = await tauriInvoke<string>("fs_save_file_as", { content });
    return savedPath;
  } catch (err) {
    if (err === "user_cancelled") return null;
    throw new Error(`另存为失败: ${err}`);
  }
}

// ── T16: 草稿管理 ─────────────────────────────────────────────────────────

export async function saveDraft(docId: string, content: string): Promise<void> {
  if (!isTauri()) return; // 浏览器环境跳过
  try {
    await tauriInvoke<void>("fs_save_draft", { docId, content });
  } catch (err) {
    // 草稿保存失败不中断用户操作，静默记录
    console.error("[IPC] saveDraft failed:", err);
  }
}

export async function listDrafts(): Promise<DraftInfo[]> {
  if (!isTauri()) return [];
  try {
    return await tauriInvoke<DraftInfo[]>("fs_list_drafts");
  } catch (err) {
    console.error("[IPC] listDrafts failed:", err);
    return [];
  }
}

export async function restoreDraft(draftId: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return await tauriInvoke<string>("fs_restore_draft", { draftId });
  } catch (err) {
    console.error("[IPC] restoreDraft failed:", err);
    return null;
  }
}

export async function deleteDraft(draftId: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await tauriInvoke<void>("fs_delete_draft", { draftId });
  } catch (err) {
    console.error("[IPC] deleteDraft failed:", err);
  }
}

// ── 工具函数 ──────────────────────────────────────────────────────────────

function downloadAsJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
