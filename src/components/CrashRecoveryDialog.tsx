/**
 * CrashRecoveryDialog — 崩溃恢复对话框（T16，AC08）
 *
 * 启动时检测草稿目录，若存在未恢复草稿则显示本对话框。
 * 用户点击"恢复"→ 加载草稿内容并删除草稿文件
 * 用户点击"忽略"→ 删除草稿文件（不恢复）
 */

import React, { useEffect, useState } from "react";
import { RotateCcw, X, FileWarning } from "lucide-react";
import { isTauri, invoke } from "../utils/ipc";
import { useDocumentStore } from "../store/document-store";

interface DraftInfo {
  draft_id: string;
  doc_id: string;
  saved_at: string;
  size: number;
}

export function CrashRecoveryDialog() {
  const [drafts, setDrafts] = useState<DraftInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const loadFromJson = useDocumentStore((s) => s.loadFromJson);

  // 启动检测
  useEffect(() => {
    if (!isTauri()) return;
    invoke<DraftInfo[]>("fs_list_drafts")
      .then((list: DraftInfo[]) => {
        if (list.length > 0) {
          setDrafts(list);
          setVisible(true);
        }
      })
      .catch(() => {}); // 静默失败
  }, []);

  const handleRestore = async (draft: DraftInfo) => {
    setLoading(true);
    try {
      const content = await invoke<string>("fs_restore_draft", {
        draftId: draft.draft_id,
      });
      loadFromJson(content, "file");
      await invoke<void>("fs_delete_draft", { draftId: draft.draft_id });
      setDrafts((prev) => prev.filter((d) => d.draft_id !== draft.draft_id));
    } catch {
      // 恢复失败时仍关闭
    }
    setLoading(false);
    if (drafts.length <= 1) setVisible(false);
  };

  const handleIgnoreAll = async () => {
    for (const d of drafts) {
      await invoke<void>("fs_delete_draft", { draftId: d.draft_id }).catch(() => {});
    }
    setDrafts([]);
    setVisible(false);
  };

  if (!visible) return null;

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString("zh-CN"); } catch { return iso; }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* 标题 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <FileWarning size={18} className="text-yellow-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">发现未保存的草稿</h2>
            <p className="text-xs text-gray-500 mt-0.5">上次编辑未正常保存，是否恢复？</p>
          </div>
          <button
            className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            onClick={handleIgnoreAll}
          >
            <X size={16} />
          </button>
        </div>

        {/* 草稿列表 */}
        <div className="px-6 py-4 space-y-2 max-h-60 overflow-y-auto">
          {drafts.map((draft) => (
            <div
              key={draft.draft_id}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {decodeURIComponent(draft.doc_id.replace(/_/g, "/")).replace(/^session-\d+$/, "未命名文档")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(draft.saved_at)} · {formatSize(draft.size)}
                </p>
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex-shrink-0"
                onClick={() => handleRestore(draft)}
                disabled={loading}
              >
                <RotateCcw size={12} />
                恢复
              </button>
            </div>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
            onClick={handleIgnoreAll}
          >
            全部忽略
          </button>
        </div>
      </div>
    </div>
  );
}
