/**
 * CodeBlock — 代码块（AC04）
 *
 * 格式：`::code [language]\ncode_content`
 * 渲染：CodeMirror 6 只读模式，含语法高亮 + 行号
 * AC04：::code 块正确渲染含语法高亮和行号
 */

import React, { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { Copy, Check } from "lucide-react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

// ── 语言映射 ──────────────────────────────────────────────────────────────

function getLanguageExtension(lang: string) {
  switch (lang.toLowerCase()) {
    case "js": case "javascript": case "ts": case "typescript":
      return javascript({ typescript: lang.includes("ts") });
    case "python": case "py": return python();
    case "html": return html();
    case "css": return css();
    case "rust": case "rs": return rust();
    case "sql": return sql();
    case "xml": return xml();
    case "json": return json();
    default: return null;
  }
}

export function CodeBlock({ content, jsonPath: _jsonPath, onUpdate: _onUpdate }: JmBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);

  const parsed = parseBlock(content);
  const language = parsed?.meta?.trim() || "text";
  const code = parsed?.content ?? "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const langExt = getLanguageExtension(language);
    const extensions = [
      lineNumbers(),
      syntaxHighlighting(defaultHighlightStyle),
      highlightActiveLine(),
      EditorState.readOnly.of(true),
      EditorView.theme({
        "&": { fontSize: "12px", borderRadius: "0" },
        ".cm-scroller": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
        ".cm-gutters": { backgroundColor: "#f8f8f8", borderRight: "1px solid #e5e7eb" },
        ".cm-lineNumbers .cm-gutterElement": { color: "#9ca3af", padding: "0 8px" },
      }),
      EditorView.lineWrapping,
      ...(langExt ? [langExt] : []),
    ];

    const state = EditorState.create({ doc: code, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => { view.destroy(); viewRef.current = null; };
  }, [code, language]);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden my-1">
      {/* 头部：语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-wide">
          {language || "text"}
        </span>
        <button
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          onClick={handleCopy}
          title="复制代码"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      {/* CodeMirror 只读编辑器 */}
      <div ref={containerRef} className="max-h-80 overflow-auto" />
    </div>
  );
}
