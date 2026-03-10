/**
 * document-store.ts — Document Store (Zustand + Immer)
 *
 * 设计：
 * - SSOT 是内存中的 DocumentRoot（AST）
 * - jsonString 是序列化结果，仅用于 JSON Panel 同步显示
 * - 所有写操作通过 dispatch actions 进行，禁止直接 mutate state
 * - 撤销栈：字符串输入时批量合并（500ms 空闲提交），结构操作立即提交
 * - source 标记防止双向同步死循环
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import {
  JsonEntry,
  JsonType,
  JsonValue,
  DocumentRoot,
  JsonPath,
  parseJsonToRoot,
  rootToJson,
} from "../types/json-ast";

// ── 历史快照 ──────────────────────────────────────────────────────────────

interface HistorySnapshot {
  root: DocumentRoot;
  jsonString: string;
}

// ── Store 状态 ────────────────────────────────────────────────────────────

export type ChangeSource = "visual" | "json" | "file" | "initial";

export interface DocumentState {
  /** 当前文档根节点（SSOT） */
  root: DocumentRoot;
  /** 序列化后的 JSON 字符串（与 root 保持同步） */
  jsonString: string;
  /** 最近一次变更的来源（防死循环）*/
  lastChangeSource: ChangeSource;
  /** JSON Panel 错误提示（null 表示合法） */
  parseError: string | null;
  /** 文档是否有未保存的修改（T14/T16 dirty 标记）*/
  isDirty: boolean;

  /** 撤销栈（不含当前状态） */
  undoStack: HistorySnapshot[];
  /** 重做栈 */
  redoStack: HistorySnapshot[];
  /** 字符输入批次 timer（用于合并连续输入到同一历史节点） */
  _inputBatchTimer: ReturnType<typeof setTimeout> | null;
  /**
   * 当前 input batch 的起始快照（在第一次字符输入 mutation 前捕获）
   * timer 触发时将此快照推入 undoStack，确保 undo 能回到"输入前"状态
   */
  _batchStartSnapshot: HistorySnapshot | null;

  // ── Actions ───────────────────────────────────────────────────────────

  /**
   * 从 JSON 字符串初始化或更新文档
   * source: 'file' = 打开文件, 'json' = JSON Panel 编辑
   */
  loadFromJson: (jsonStr: string, source: ChangeSource) => void;

  /** 更新单个节点的 key（来自可视化区） */
  updateEntryKey: (path: JsonPath, newKey: string) => void;

  /** 更新单个节点的值（来自可视化区） */
  updateEntryValue: (path: JsonPath, newValue: JsonValue, newType: JsonType) => void;

  /** 在指定路径的父节点下插入新条目 */
  insertEntry: (parentPath: JsonPath, index: number, entry?: Partial<JsonEntry>) => void;

  /** 删除指定路径的条目 */
  deleteEntry: (path: JsonPath) => void;

  /** 移动同级节点（拖拽排序） */
  moveEntry: (parentPath: JsonPath, fromIndex: number, toIndex: number) => void;

  /** 切换节点折叠状态（不进历史栈） */
  toggleCollapsed: (path: JsonPath) => void;

  /** 撤销 */
  undo: () => void;

  /** 重做 */
  redo: () => void;

  /** 提交当前状态到撤销栈（清空重做栈） */
  _commitHistory: () => void;

  /**
   * 字符输入：延迟 500ms 提交历史（连续输入合并）
   * @param preMutation 仅新 batch 第一次调用时传入（mutation 前快照）；
   *                    batch 中后续调用传 null，只重置 timer，不更新起始快照
   */
  _scheduleHistoryCommit: (preMutation: HistorySnapshot | null) => void;
}

// ── 辅助：按路径查找节点 ──────────────────────────────────────────────────

function getChildren(root: DocumentRoot): JsonEntry[] | null {
  if (root.kind === "scalar") return null;
  return root.children;
}

function findEntryByPath(root: DocumentRoot, path: JsonPath): JsonEntry | null {
  if (path.length === 0) return null;

  const topLevel = getChildren(root);
  if (!topLevel) return null;

  let current: JsonEntry | undefined = topLevel.find((e) => e.id === path[0]);
  if (!current) return null;

  for (let i = 1; i < path.length; i++) {
    if (!Array.isArray(current.value)) return null;
    current = (current.value as JsonEntry[]).find((e) => e.id === path[i]);
    if (!current) return null;
  }
  return current;
}

function findParentChildren(root: DocumentRoot, path: JsonPath): JsonEntry[] | null {
  if (path.length === 0) return getChildren(root);
  // path.length === 1: 目标是根级节点，父容器就是 root
  if (path.length === 1) return getChildren(root);
  const parent = findEntryByPath(root, path.slice(0, -1));
  if (!parent || !Array.isArray(parent.value)) return null;
  return parent.value as JsonEntry[];
}

// ── 初始状态 ──────────────────────────────────────────────────────────────

const INITIAL_JSON = "{}";
const initialRoot: DocumentRoot = { kind: "entries", children: [] };

// ── Store 实例 ────────────────────────────────────────────────────────────

export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    root: initialRoot,
    jsonString: INITIAL_JSON,
    lastChangeSource: "initial",
    parseError: null,
    isDirty: false,
    undoStack: [],
    redoStack: [],
    _inputBatchTimer: null,
    _batchStartSnapshot: null,

    // ── loadFromJson ───────────────────────────────────────────────────

    loadFromJson(jsonStr, source) {
      const parsed = parseJsonToRoot(jsonStr);
      if (!parsed) {
        set((s) => {
          s.parseError = `JSON 语法错误`;
          s.lastChangeSource = source;
        });
        return;
      }

      // 来自文件/初始加载：立即提交历史
      if (source === "file") {
        get()._commitHistory();
      }

      set((s) => {
        s.root = parsed;
        s.jsonString = jsonStr;
        s.parseError = null;
        s.lastChangeSource = source;
        s.redoStack = [];
        // 来自文件/初始加载时 dirty=false；来自 json/visual 编辑时 dirty=true
        s.isDirty = source !== "file" && source !== "initial";
      });
    },

    // ── updateEntryKey ─────────────────────────────────────────────────

    updateEntryKey(path, newKey) {
      // 在 mutation 前：新 batch 才捕获快照；已有 timer 说明在 batch 中，不更新快照
      const isNewBatch = !get()._inputBatchTimer;
      const preMutation: HistorySnapshot | null = isNewBatch
        ? { root: get().root, jsonString: get().jsonString }
        : null;

      set((s) => {
        const entry = findEntryByPath(s.root as DocumentRoot, path);
        if (!entry) return;
        entry.key = newKey;
        s.jsonString = rootToJson(s.root as DocumentRoot);
        s.lastChangeSource = "visual";
              s.isDirty = true;
        s.redoStack = [];
      });
      get()._scheduleHistoryCommit(preMutation);
    },

    // ── updateEntryValue ───────────────────────────────────────────────

    updateEntryValue(path, newValue, newType) {
      // 在 mutation 前：新 batch 才捕获快照
      const isNewBatch = !get()._inputBatchTimer;
      const preMutation: HistorySnapshot | null = isNewBatch
        ? { root: get().root, jsonString: get().jsonString }
        : null;

      set((s) => {
        const entry = findEntryByPath(s.root as DocumentRoot, path);
        if (!entry) return;
        entry.value = newValue;
        entry.type = newType;
        s.jsonString = rootToJson(s.root as DocumentRoot);
        s.lastChangeSource = "visual";
              s.isDirty = true;
        s.redoStack = [];
      });
      get()._scheduleHistoryCommit(preMutation);
    },

    // ── insertEntry ────────────────────────────────────────────────────

    insertEntry(parentPath, index, partial = {}) {
      get()._commitHistory();
      set((s) => {
        const siblings =
          parentPath.length === 0
            ? getChildren(s.root as DocumentRoot)
            : (() => {
                const parent = findEntryByPath(s.root as DocumentRoot, parentPath);
                return parent && Array.isArray(parent.value)
                  ? (parent.value as JsonEntry[])
                  : null;
              })();

        if (!siblings) return;

        const newEntry: JsonEntry = {
          id: uuidv4(),
          key: partial.key ?? "",
          value: partial.value ?? "",
          type: partial.type ?? "string",
          collapsed: false,
        };
        siblings.splice(index, 0, newEntry);
        s.jsonString = rootToJson(s.root as DocumentRoot);
        s.lastChangeSource = "visual";
              s.isDirty = true;
        s.redoStack = [];
      });
    },

    // ── deleteEntry ────────────────────────────────────────────────────

    deleteEntry(path) {
      get()._commitHistory();
      set((s) => {
        const siblings = findParentChildren(s.root as DocumentRoot, path);
        if (!siblings) return;
        const targetId = path[path.length - 1];
        const idx = siblings.findIndex((e) => e.id === targetId);
        if (idx === -1) return;
        siblings.splice(idx, 1);
        s.jsonString = rootToJson(s.root as DocumentRoot);
        s.lastChangeSource = "visual";
              s.isDirty = true;
        s.redoStack = [];
      });
    },

    // ── moveEntry ──────────────────────────────────────────────────────

    moveEntry(parentPath, fromIndex, toIndex) {
      get()._commitHistory();
      set((s) => {
        const siblings =
          parentPath.length === 0
            ? getChildren(s.root as DocumentRoot)
            : (() => {
                const parent = findEntryByPath(s.root as DocumentRoot, parentPath);
                return parent && Array.isArray(parent.value)
                  ? (parent.value as JsonEntry[])
                  : null;
              })();

        if (!siblings) return;
        if (
          fromIndex < 0 ||
          fromIndex >= siblings.length ||
          toIndex < 0 ||
          toIndex >= siblings.length
        )
          return;

        const [moved] = siblings.splice(fromIndex, 1);
        siblings.splice(toIndex, 0, moved);
        s.jsonString = rootToJson(s.root as DocumentRoot);
        s.lastChangeSource = "visual";
              s.isDirty = true;
        s.redoStack = [];
      });
    },

    // ── toggleCollapsed ────────────────────────────────────────────────

    toggleCollapsed(path) {
      // 折叠状态不进历史栈
      set((s) => {
        const entry = findEntryByPath(s.root as DocumentRoot, path);
        if (!entry) return;
        entry.collapsed = !entry.collapsed;
      });
    },

    // ── undo ───────────────────────────────────────────────────────────

    undo() {
      const { undoStack, root, jsonString } = get();
      if (undoStack.length === 0) return;

      const prev = undoStack[undoStack.length - 1];
      set((s) => {
        s.redoStack.push({ root, jsonString });
        s.undoStack.pop();
        s.root = prev.root;
        s.jsonString = prev.jsonString;
        s.lastChangeSource = "visual";
              s.isDirty = true;
        s.parseError = null;
      });
    },

    // ── redo ───────────────────────────────────────────────────────────

    redo() {
      const { redoStack, root, jsonString } = get();
      if (redoStack.length === 0) return;

      const next = redoStack[redoStack.length - 1];
      set((s) => {
        s.undoStack.push({ root, jsonString });
        s.redoStack.pop();
        s.root = next.root;
        s.jsonString = next.jsonString;
        s.lastChangeSource = "visual";
              s.isDirty = true;
        s.parseError = null;
      });
    },

    // ── _commitHistory ─────────────────────────────────────────────────

    _commitHistory() {
      const { root, jsonString, _inputBatchTimer, _batchStartSnapshot } = get();

      // 如果有 active batch timer，优先使用 batch 起始快照（pre-mutation）
      // 而不是当前状态，避免把"已改状态"推入 undoStack
      const snapshot = _batchStartSnapshot ?? { root, jsonString };

      if (_inputBatchTimer) {
        clearTimeout(_inputBatchTimer);
      }
      set((s) => {
        s.undoStack.push(snapshot);
        // 撤销栈上限 1000（架构文档规格）
        if (s.undoStack.length > 1000) {
          s.undoStack.shift();
        }
        s._inputBatchTimer = null;
        s._batchStartSnapshot = null;
      });
    },

    // ── _scheduleHistoryCommit ─────────────────────────────────────────
    //
    // 修复：快照必须在 mutation 前由调用方捕获（pre-mutation），
    // 而不是在 setTimeout 回调里取 get()（那时已是 mutation 后状态）。
    //
    // 规则：
    // - 新 batch（preMutation !== null）：保存 _batchStartSnapshot，重置 timer
    // - batch 中（preMutation === null）：只重置 timer，不更新快照

    _scheduleHistoryCommit(preMutation) {
      const current = get()._inputBatchTimer;
      if (current) clearTimeout(current);

      // 新 batch：保存 pre-mutation 快照
      if (preMutation !== null) {
        set((s) => {
          s._batchStartSnapshot = preMutation;
        });
      }

      const timer = setTimeout(() => {
        const { _batchStartSnapshot } = get();
        if (!_batchStartSnapshot) return;

        set((s) => {
          s.undoStack.push(_batchStartSnapshot!);
          if (s.undoStack.length > 1000) {
            s.undoStack.shift();
          }
          s._inputBatchTimer = null;
          s._batchStartSnapshot = null;
        });
      }, 500);

      set((s) => {
        s._inputBatchTimer = timer;
      });
    },
  }))
);

// ── 便捷 selectors ────────────────────────────────────────────────────────

export const selectRoot = (s: DocumentState) => s.root;
export const selectJsonString = (s: DocumentState) => s.jsonString;
export const selectParseError = (s: DocumentState) => s.parseError;
export const selectCanUndo = (s: DocumentState) => s.undoStack.length > 0;
export const selectCanRedo = (s: DocumentState) => s.redoStack.length > 0;
export const selectLastChangeSource = (s: DocumentState) => s.lastChangeSource;

// ── 多文档支持（T14 用到，提前留接口） ────────────────────────────────────

export type DocumentStoreInstance = ReturnType<typeof createDocumentStore>;

export function createDocumentStore() {
  return create<DocumentState>()(
    immer((_set, _get) => ({
      ...useDocumentStore.getState(),
      // T14: Tab Manager 会为每个 tab 独立创建 Store 实例
      // 此处是占位，完整实现在 T14
    }))
  );
}
