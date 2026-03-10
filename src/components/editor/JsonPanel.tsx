/**
 * JsonPanel.tsx — 右侧 JSON 源码面板（T07/T08）
 *
 * 双向同步实现（基于 T04 spike 结论）：
 *
 * ① Visual → JSON Panel（外部驱动）：
 *    useEffect 监听 [jsonString, lastSource]
 *    仅当 lastSource !== 'json' 时才用差量 Transaction 更新 CM6
 *    （'json' 来源的变更是 CM6 自己触发的，跳过防死循环）
 *
 * ② JSON Panel → Store（用户输入）：
 *    CM6 updateListener 过滤 ExternalChangeAnnotation
 *    防抖 300ms 后调用 loadFromJson(newVal, 'json')
 *    source 标记保证 Visual 不会反向触发
 *
 * ③ 光标保留（T04 spike 验证）：
 *    差量 Transaction replace 整个文档 + Math.min(oldPos, newLen)
 *    外部变更不进撤销栈（Transaction.addToHistory.of(false)）
 */

import React, { useEffect, useRef, useCallback } from "react";
import { ValidationPanel } from "./ValidationPanel";
import { EditorState, Transaction, Annotation } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { basicSetup } from "codemirror";
import {
  useDocumentStore,
  selectJsonString,
  selectLastChangeSource,
} from "../../store/document-store";

// ── 来自 T04 spike：Annotation 标记外部变更来源 ───────────────────────────
// 规则：来自 visual 的 dispatch 携带 "visual"，CM6 updateListener 跳过该类事务
const ExternalChangeAnnotation = Annotation.define<"visual" | "json">();

export function JsonPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // 防止 useEffect 里的 dispatch 触发自身 updateListener 的标志（双重防护）
  const isExternalUpdateRef = useRef(false);

  const jsonString = useDocumentStore(selectJsonString);
  const lastSource = useDocumentStore(selectLastChangeSource);
  const loadFromJson = useDocumentStore((s) => s.loadFromJson);

  // ── 防抖 onUserEdit（使用 ref 防止闭包陷阱）────────────────────────────
  const loadFromJsonRef = useRef(loadFromJson);
  useEffect(() => {
    loadFromJsonRef.current = loadFromJson;
  }, [loadFromJson]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onUserEdit = useCallback((newJson: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      loadFromJsonRef.current(newJson, "json");
    }, 300);
  }, []);

  // ── 初始化 CM6 EditorView ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;

      // 过滤外部注入的 transaction（防死循环）
      const isFromExternal = update.transactions.some(
        (tr) => tr.annotation(ExternalChangeAnnotation) === "visual"
      );
      if (isFromExternal || isExternalUpdateRef.current) return;

      // 用户自己编辑 → 防抖触发 Store 更新
      onUserEdit(update.state.doc.toString());
    });

    const initialJson = useDocumentStore.getState().jsonString;

    const state = EditorState.create({
      doc: initialJson,
      extensions: [
        basicSetup,
        json(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          },
          ".cm-content": { padding: "8px 0" },
          ".cm-line": { padding: "0 12px" },
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      view.destroy();
      viewRef.current = null;
    };
    // 只初始化一次，依赖 onUserEdit（useCallback 稳定引用）
  }, [onUserEdit]);

  // ── ① Visual → JSON Panel：差量 Transaction 更新，保留光标 ─────────────
  //
  // useEffect 直接从 closure 消费 jsonString / lastSource（Zustand selector 值），
  // React 保证同一 render 内两个 selector 的一致性，不需要额外 ref 追踪。
  // architect review 注：之前的 lastSourceRef/jsonStringRef 是死代码，已删除。

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // 来自 'json' 的变更是 CM6 自己触发的，跳过（防死循环核心逻辑）
    if (lastSource === "json") return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === jsonString) return; // 内容相同，无需更新

    isExternalUpdateRef.current = true;

    // 保留光标/选区：clamp 到新文档长度
    const { from, to } = view.state.selection.main;
    const newLength = jsonString.length;

    const transaction = view.state.update({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: jsonString,
      },
      selection: {
        anchor: Math.min(from, newLength),
        head: Math.min(to, newLength),
      },
      annotations: [
        ExternalChangeAnnotation.of("visual"),
        // 外部变更不进 CM6 自身的撤销栈
        Transaction.addToHistory.of(false),
      ],
    });

    view.dispatch(transaction);
    isExternalUpdateRef.current = false;
  }, [jsonString, lastSource]);

  return (
    <div className="flex flex-col h-full" aria-label="JSON 源码面板">
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        aria-label="JSON 源码编辑器"
      />
      {/* T15 校验面板 */}
      <ValidationPanel />
    </div>
  );
}
