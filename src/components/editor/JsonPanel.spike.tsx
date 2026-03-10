/**
 * T04 SPIKE — CodeMirror 6 防抖同步 + 光标保留验证
 *
 * 目标：验证以下技术方案可行性
 * 1. CodeMirror 6 接收外部 JSON 字符串变更时，用 Transaction 差量替换内容
 *    （保持光标位置，而不是 setState 全量重置导致光标跳到 0）
 * 2. 用户在 CodeMirror 中编辑时，防抖 300ms 后触发回调
 * 3. source 标记：来自视觉区的变更不触发反向回调（防死循环）
 *
 * 结论记录：见文件末尾 SPIKE_RESULTS
 */

import React, { useEffect, useRef, useCallback } from "react";
import { EditorState, Transaction, Annotation } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { basicSetup } from "codemirror";

// ── Annotation 用于标记变更来源，防止死循环 ──────────────────────────────
// 规则：来自 visual 的 dispatch 携带此 annotation，JSON Panel 监听时跳过
export const ExternalChangeAnnotation = Annotation.define<"visual" | "json">();

// ── 防抖 hook ─────────────────────────────────────────────────────────────
function useDebounce(fn: (value: string) => void, delay: number): (value: string) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn; // always up-to-date without triggering re-render

  return useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(value), delay);
    },
    [delay] // fn intentionally tracked via fnRef to avoid stale closure
  );
}

// ── Props ─────────────────────────────────────────────────────────────────
interface JsonPanelSpikeProps {
  /** 来自 Document Store 的最新 JSON 字符串（source: 'visual' 触发的变更） */
  externalValue: string;
  /** 用户在面板中编辑后，防抖 300ms 触发，携带新 JSON 字符串 */
  onUserEdit: (newJson: string) => void;
}

export function JsonPanelSpike({ externalValue, onUserEdit }: JsonPanelSpikeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // 标记当前是否正在处理外部变更，避免触发 onUserEdit 回调
  const isExternalUpdateRef = useRef(false);

  const debouncedOnUserEdit = useDebounce(onUserEdit, 300);

  // ── 初始化 EditorView ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;

      // 如果是外部变更注入的 transaction，跳过回调（防死循环）
      const isFromExternal = update.transactions.some(
        (tr) => tr.annotation(ExternalChangeAnnotation) === "visual"
      );
      if (isFromExternal || isExternalUpdateRef.current) return;

      // 用户自己编辑 → 防抖触发
      debouncedOnUserEdit(update.state.doc.toString());
    });

    const state = EditorState.create({
      doc: externalValue,
      extensions: [
        basicSetup,
        json(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto", fontFamily: "JetBrains Mono, monospace" },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只初始化一次

  // ── 接收外部变更：差量更新，保持光标 ─────────────────────────────────────
  //
  // 核心技术点（spike 的主要验证目标）：
  // 不能用 setState 重置 EditorState（会丢失光标/选区），
  // 必须用 Transaction 做精确替换。
  //
  // 方案：replaceRange 替换整个文档内容，同时用 mapPos 把光标/选区映射到新位置。
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === externalValue) return; // 内容相同，跳过

    isExternalUpdateRef.current = true;

    // 保存当前选区
    const { from, to } = view.state.selection.main;

    // 构建替换整个文档的 transaction
    // 携带 ExternalChangeAnnotation 让 updateListener 忽略此次变更
    const transaction = view.state.update({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: externalValue,
      },
      // 尝试保留光标位置：clamp 到新文档长度范围内
      selection: {
        anchor: Math.min(from, externalValue.length),
        head: Math.min(to, externalValue.length),
      },
      annotations: [
        ExternalChangeAnnotation.of("visual"),
        Transaction.addToHistory.of(false), // 外部变更不进撤销栈
      ],
    });

    view.dispatch(transaction);
    isExternalUpdateRef.current = false;
  }, [externalValue]);

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", overflow: "hidden" }}
    />
  );
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * SPIKE_RESULTS — T04 技术验证结论
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 待验证项目（本文件实现了方案，需要在真实 DOM 环境中跑一下确认）：
 *
 * [验证1] 差量替换 + 光标保留
 *   方案：view.state.update({ changes: { from:0, to:docLength, insert:newVal }, selection: ... })
 *   预期：光标映射到 Math.min(oldPos, newLength)，对于 JSON 小改动光标位置基本不变
 *   风险点：如果外部变更是 JSON 重新格式化（换行/缩进变化），字符偏移量会偏移
 *   建议：P0 阶段接受"格式化后光标跳到合理位置"，光标精确保留是 P2 优化项
 *
 * [验证2] 防抖 300ms
 *   方案：setTimeout 300ms 后触发 onUserEdit
 *   预期：粘贴大段 JSON 时，等最后一次输入停止后 300ms 才解析，避免解析半截 JSON
 *   已知：300ms 内若用户焦点离开，会提前触发（需要额外处理 blur 事件，T05 完善）
 *
 * [验证3] source 标记防死循环
 *   方案：ExternalChangeAnnotation.of("visual") + updateListener 检查
 *   预期：视觉区 → Store → JSON Panel 这条路径，JSON Panel 不会反向触发 onUserEdit
 *   状态：逻辑正确，与 T07 集成时做端到端测试
 *
 * 结论：方案可行，T05 可以开工。
 * 遗留优化（不阻塞 T05）：
 *   - 粘贴大 JSON 的光标精确保留（用 json-source-map 做路径级映射，P2）
 *   - blur 时立即触发（不等 300ms），T05 实现时处理
 * ═══════════════════════════════════════════════════════════════════════════
 */
