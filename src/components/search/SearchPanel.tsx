/**
 * SearchPanel — 搜索/替换（T17，AC10）
 *
 * 功能：
 * - 普通搜索 + 正则搜索
 * - 全文循环（到底后从头继续）
 * - 顺序/倒序切换
 * - 替换单个 / 全部替换
 * - 匹配计数显示
 * - F3 / Shift+F3 快捷键
 *
 * AC10：正则搜索高亮，支持顺序/倒序切换
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Search, X, ChevronUp, ChevronDown, Replace,
  CaseSensitive, Regex as RegexIcon, RotateCcw
} from "lucide-react";
import { useDocumentStore } from "../../store/document-store";
import type { JsonEntry } from "../../types/json-ast";

// ── 搜索结果 ──────────────────────────────────────────────────────────────

interface SearchMatch {
  path: string[];   // entry id path
  field: "key" | "value";
  original: string;
  index: number;    // match index in original string
  length: number;
}

function searchInRoot(
  entries: JsonEntry[],
  pattern: RegExp,
  parentPath: string[] = []
): SearchMatch[] {
  const results: SearchMatch[] = [];

  for (const entry of entries) {
    const currentPath = [...parentPath, entry.id];

    // 搜索 key
    const keyStr = entry.key;
    let m: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(keyStr)) !== null) {
      results.push({ path: currentPath, field: "key", original: keyStr, index: m.index, length: m[0].length });
      if (!pattern.global) break;
    }

    // 搜索 value（标量）
    if (!Array.isArray(entry.value)) {
      const valStr = String(entry.value ?? "");
      pattern.lastIndex = 0;
      while ((m = pattern.exec(valStr)) !== null) {
        results.push({ path: currentPath, field: "value", original: valStr, index: m.index, length: m[0].length });
        if (!pattern.global) break;
      }
    }

    // 递归子节点
    if (Array.isArray(entry.value)) {
      results.push(...searchInRoot(entry.value as JsonEntry[], pattern, currentPath));
    }
  }
  return results;
}

// ── SearchPanel 组件 ──────────────────────────────────────────────────────

interface SearchPanelProps {
  onClose: () => void;
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [regexError, setRegexError] = useState<string | null>(null);

  const root = useDocumentStore((s) => s.root);
  const { updateEntryKey, updateEntryValue } = useDocumentStore();
  const queryRef = useRef(query);
  queryRef.current = query;

  // ── 计算匹配结果 ──────────────────────────────────────────────────────

  const computeMatches = useCallback(
    (q: string) => {
      if (!q) { setMatches([]); setRegexError(null); return; }
      try {
        const flags = "g" + (caseSensitive ? "" : "i");
        const pattern = useRegex ? new RegExp(q, flags) : new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
        setRegexError(null);
        const entries = root.kind === "scalar" ? [root.entry] : root.children;
        const found = searchInRoot(entries, pattern);
        setMatches(found);
        setCurrentIdx(0);
      } catch (e) {
        setRegexError(String(e));
        setMatches([]);
      }
    },
    [root, useRegex, caseSensitive]
  );

  useEffect(() => { computeMatches(query); }, [query, computeMatches]);

  // ── 导航 ──────────────────────────────────────────────────────────────

  const navigate = useCallback(
    (dir: "down" | "up") => {
      if (matches.length === 0) return;
      setCurrentIdx((prev) => {
        if (dir === "down") return (prev + 1) % matches.length;
        return (prev - 1 + matches.length) % matches.length;
      });
      // 滚动到匹配项（通过 id 定位）
      const match = matches[currentIdx];
      if (match) {
        const id = match.path[match.path.length - 1];
        document.getElementById(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    },
    [matches, currentIdx]
  );

  // F3 / Shift+F3 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        navigate(e.shiftKey ? "up" : "down");
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, onClose]);

  // ── 替换 ──────────────────────────────────────────────────────────────

  const doReplace = useCallback(
    (all: boolean) => {
      if (matches.length === 0 || !query) return;
      const toReplace = all ? matches : [matches[currentIdx]];
      const flags = "g" + (caseSensitive ? "" : "i");

      try {
        const pattern = useRegex
          ? new RegExp(query, flags)
          : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

        for (const match of toReplace) {
          const newVal = match.original.replace(pattern, replaceText);
          if (match.field === "key") {
            updateEntryKey(match.path, newVal);
          } else {
            updateEntryValue(match.path, newVal, "string");
          }
        }
      } catch {
        // 正则错误：静默
      }

      // 重新计算
      setTimeout(() => computeMatches(queryRef.current), 50);
    },
    [matches, currentIdx, query, replaceText, useRegex, caseSensitive, updateEntryKey, updateEntryValue, computeMatches]
  );

  const current = matches[currentIdx];

  return (
    <div
      className="absolute top-2 right-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50"
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* 搜索行 */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100">
        <Search size={13} className="text-gray-400 flex-shrink-0" />
        <input
          autoFocus
          className="flex-1 text-sm outline-none text-gray-700 placeholder:text-gray-300"
          placeholder="搜索…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") navigate(e.shiftKey ? "up" : "down"); }}
        />
        {/* 选项按钮 */}
        <button
          className={`p-1 rounded text-xs ${caseSensitive ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:bg-gray-100"}`}
          onClick={() => setCaseSensitive((v) => !v)} title="区分大小写"
        ><CaseSensitive size={13} /></button>
        <button
          className={`p-1 rounded text-xs ${useRegex ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:bg-gray-100"}`}
          onClick={() => setUseRegex((v) => !v)} title="正则表达式"
        ><RegexIcon size={13} /></button>

        {/* 匹配计数 */}
        {query && (
          <span className="text-xs text-gray-400 px-1 min-w-[40px] text-center">
            {matches.length === 0 ? "0" : `${currentIdx + 1}/${matches.length}`}
          </span>
        )}

        {/* 导航 */}
        <button className="p-1 rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30"
          onClick={() => { setDirection("up"); navigate("up"); }} disabled={matches.length === 0} title="上一个 (Shift+F3)">
          <ChevronUp size={13} />
        </button>
        <button className="p-1 rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30"
          onClick={() => { setDirection("down"); navigate("down"); }} disabled={matches.length === 0} title="下一个 (F3)">
          <ChevronDown size={13} />
        </button>

        {/* 替换展开 */}
        <button className={`p-1 rounded ${showReplace ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:bg-gray-100"}`}
          onClick={() => setShowReplace((v) => !v)} title="替换">
          <Replace size={13} />
        </button>

        <button className="p-1 rounded text-gray-400 hover:bg-gray-100" onClick={onClose} title="关闭 (Esc)">
          <X size={13} />
        </button>
      </div>

      {/* 错误提示 */}
      {regexError && (
        <div className="px-3 py-1 text-xs text-red-600 bg-red-50 border-b border-red-100">
          正则错误：{regexError}
        </div>
      )}

      {/* 替换行 */}
      {showReplace && (
        <div className="flex items-center gap-1 px-2 py-1.5">
          <RotateCcw size={13} className="text-gray-400 flex-shrink-0" />
          <input
            className="flex-1 text-sm outline-none text-gray-700 placeholder:text-gray-300"
            placeholder="替换为…"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
          />
          <button className="px-2 py-0.5 text-xs text-gray-600 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            onClick={() => doReplace(false)} disabled={matches.length === 0}>替换</button>
          <button className="px-2 py-0.5 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-30"
            onClick={() => doReplace(true)} disabled={matches.length === 0}>全部</button>
        </div>
      )}

      {/* 当前匹配预览 */}
      {current && (
        <div className="px-3 py-1 border-t border-gray-100 text-xs text-gray-500 truncate">
          {direction === "up" ? "↑" : "↓"} {current.field === "key" ? "[key]" : "[val]"} {current.original.slice(0, 40)}
        </div>
      )}
    </div>
  );
}
