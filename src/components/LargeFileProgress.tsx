/**
 * LargeFileProgress — 大文件加载进度条（T22，AC13）
 */

import React from "react";
import { X, FileText } from "lucide-react";
import type { LargeFileState } from "../hooks/useLargeFileLoader";

interface Props {
  state: LargeFileState;
  onCancel: () => void;
}

export function LargeFileProgress({ state, onCancel }: Props) {
  if (!state.active) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">加载大文件</h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{state.fileName}</p>
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{state.progress}%</span>
          {state.canCancel && (
            <button
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
              onClick={onCancel}
            >
              <X size={12} /> 取消
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
