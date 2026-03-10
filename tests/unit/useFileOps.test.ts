/**
 * useFileOps.test.ts — T13 单元测试（文件操作 hook）
 *
 * 覆盖场景：
 * - isDirty 初始为 false
 * - DocumentStore jsonString 变更 → isDirty 置 true
 * - 内容未变时订阅不误触发 isDirty
 * - handleOpen 成功后 isDirty 重置为 false
 * - handleSave（已知路径）成功后 isDirty 重置为 false
 * - handleSaveAs 成功后 isDirty 重置为 false
 * - handleNew 后 isDirty 重置为 false
 * - 用户取消 openFile 时 isDirty 不变
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFileOps } from "../../src/hooks/useFileOps";
import { useDocumentStore } from "../../src/store/document-store";

// ── Mock IPC ──────────────────────────────────────────────────────────────

vi.mock("../../src/utils/ipc", () => ({
  openFile: vi.fn(),
  saveFile: vi.fn(),
  saveFileAs: vi.fn(),
}));

import { openFile, saveFile, saveFileAs } from "../../src/utils/ipc";

const mockOpenFile = openFile as ReturnType<typeof vi.fn>;
const mockSaveFile = saveFile as ReturnType<typeof vi.fn>;
const mockSaveFileAs = saveFileAs as ReturnType<typeof vi.fn>;

// ── Store 重置 ────────────────────────────────────────────────────────────

function resetStore() {
  useDocumentStore.setState({
    root: { kind: "entries", children: [] },
    jsonString: "{}",
    lastChangeSource: "initial",
    parseError: null,
    undoStack: [],
    redoStack: [],
    _inputBatchTimer: null,
    _batchStartSnapshot: null,
  } as Parameters<typeof useDocumentStore.setState>[0]);
}

// ── 测试 ──────────────────────────────────────────────────────────────────

describe("useFileOps", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    // 默认 mock 返回值，避免各 case 重复设置
    mockOpenFile.mockResolvedValue(null);
    mockSaveFile.mockResolvedValue(undefined);
    mockSaveFileAs.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 初始状态 ──────────────────────────────────────────────────────────

  it("初始 isDirty 为 false", () => {
    const { result } = renderHook(() => useFileOps());
    expect(result.current.isDirty).toBe(false);
  });

  it("初始 currentPath 为 null", () => {
    const { result } = renderHook(() => useFileOps());
    expect(result.current.currentPath).toBeNull();
  });

  // ── isDirty 订阅联动 ──────────────────────────────────────────────────

  it("DocumentStore jsonString 变更后 isDirty 变为 true", async () => {
    const { result } = renderHook(() => useFileOps());
    expect(result.current.isDirty).toBe(false);

    await act(async () => {
      useDocumentStore.getState().loadFromJson('{"a":1}', "visual");
    });

    expect(result.current.isDirty).toBe(true);
  });

  it("jsonString 未变时不误触发 isDirty", async () => {
    const { result } = renderHook(() => useFileOps());

    await act(async () => {
      // 设置相同内容，不应触发 dirty
      useDocumentStore.setState({ jsonString: "{}" });
    });

    expect(result.current.isDirty).toBe(false);
  });

  // ── handleOpen ────────────────────────────────────────────────────────

  it("handleOpen 成功：currentPath 更新，isDirty 重置为 false", async () => {
    const { result } = renderHook(() => useFileOps());

    // 先让 store 内容变化以触发 dirty
    await act(async () => {
      useDocumentStore.getState().loadFromJson('{"x":1}', "visual");
    });
    expect(result.current.isDirty).toBe(true);

    // 模拟打开文件
    mockOpenFile.mockResolvedValueOnce({
      path: "/home/user/doc.json",
      content: '{"opened":true}',
    });

    await act(async () => {
      await result.current.handleOpen();
    });

    expect(result.current.currentPath).toBe("/home/user/doc.json");
    expect(result.current.isDirty).toBe(false);
  });

  it("handleOpen 用户取消：isDirty 保持不变", async () => {
    const { result } = renderHook(() => useFileOps());

    // 先触发 dirty
    await act(async () => {
      useDocumentStore.getState().loadFromJson('{"x":1}', "visual");
    });
    expect(result.current.isDirty).toBe(true);

    // 用户取消 → openFile 返回 null
    mockOpenFile.mockResolvedValueOnce(null);

    await act(async () => {
      await result.current.handleOpen();
    });

    expect(result.current.isDirty).toBe(true); // 未被重置
    expect(result.current.currentPath).toBeNull();
  });

  // ── handleSave ────────────────────────────────────────────────────────

  it("handleSave（已知路径）成功后 isDirty 重置为 false", async () => {
    const { result } = renderHook(() => useFileOps());

    // 先模拟打开文件，建立 currentPath
    mockOpenFile.mockResolvedValueOnce({
      path: "/home/user/doc.json",
      content: "{}",
    });
    await act(async () => {
      await result.current.handleOpen();
    });

    // 用户编辑
    await act(async () => {
      useDocumentStore.getState().loadFromJson('{"edited":true}', "visual");
    });
    expect(result.current.isDirty).toBe(true);

    // 保存
    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockSaveFile).toHaveBeenCalledWith("/home/user/doc.json", expect.any(String));
    expect(result.current.isDirty).toBe(false);
  });

  // ── handleSaveAs ──────────────────────────────────────────────────────

  it("handleSaveAs 成功后 currentPath 更新，isDirty 重置为 false", async () => {
    const { result } = renderHook(() => useFileOps());

    // 触发 dirty
    await act(async () => {
      useDocumentStore.getState().loadFromJson('{"k":1}', "visual");
    });
    expect(result.current.isDirty).toBe(true);

    mockSaveFileAs.mockResolvedValueOnce("/home/user/new-doc.json");

    await act(async () => {
      await result.current.handleSaveAs();
    });

    expect(result.current.currentPath).toBe("/home/user/new-doc.json");
    expect(result.current.isDirty).toBe(false);
  });

  it("handleSaveAs 用户取消时 isDirty 保持不变", async () => {
    const { result } = renderHook(() => useFileOps());

    await act(async () => {
      useDocumentStore.getState().loadFromJson('{"k":1}', "visual");
    });
    expect(result.current.isDirty).toBe(true);

    mockSaveFileAs.mockResolvedValueOnce(null); // 用户取消

    await act(async () => {
      await result.current.handleSaveAs();
    });

    expect(result.current.isDirty).toBe(true);
  });

  // ── handleNew ─────────────────────────────────────────────────────────

  it("handleNew 后 isDirty 重置为 false，currentPath 清空", async () => {
    const { result } = renderHook(() => useFileOps());

    // 先打开一个文件
    mockOpenFile.mockResolvedValueOnce({ path: "/some/file.json", content: '{"a":1}' });
    await act(async () => {
      await result.current.handleOpen();
    });

    // 编辑 → dirty
    await act(async () => {
      useDocumentStore.getState().loadFromJson('{"b":2}', "visual");
    });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.currentPath).toBe("/some/file.json");

    // 新建
    await act(async () => {
      result.current.handleNew();
    });

    expect(result.current.currentPath).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });
});
