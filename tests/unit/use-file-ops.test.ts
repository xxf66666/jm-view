/**
 * use-file-ops.test.ts — T13 修复：isDirty 订阅 DocumentStore
 *
 * 覆盖场景：
 * - 初始状态 isDirty = false
 * - 用户编辑（store jsonString 变化）后 isDirty = true
 * - handleOpen 成功后 isDirty 重置为 false
 * - 继续编辑后再次变为 true
 * - handleSave 成功后 isDirty 重置为 false
 * - handleSaveAs 成功后 isDirty 重置为 false
 * - handleNew 后 isDirty = false，后续编辑再次变 true
 * - handleSave 失败时 isDirty 保持 true
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFileOps } from "../../src/hooks/useFileOps";
import { useDocumentStore } from "../../src/store/document-store";

// ── Mock IPC 模块 ─────────────────────────────────────────────────────────

vi.mock("../../src/utils/ipc", () => ({
  openFile: vi.fn(),
  saveFile: vi.fn(),
  saveFileAs: vi.fn(),
}));

import { openFile, saveFile, saveFileAs } from "../../src/utils/ipc";

const mockOpenFile = vi.mocked(openFile);
const mockSaveFile = vi.mocked(saveFile);
const mockSaveFileAs = vi.mocked(saveFileAs);

// ── 辅助：重置 store ──────────────────────────────────────────────────────

function resetStore() {
  useDocumentStore.setState({
    root: { kind: "entries", children: [] },
    jsonString: "{}",
    lastChangeSource: "initial",
    parseError: null,
    undoStack: [],
    redoStack: [],
  });
}

// ── 测试套件 ──────────────────────────────────────────────────────────────

describe("useFileOps — isDirty 订阅 store 变化", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初始 isDirty 为 false", () => {
    const { result } = renderHook(() => useFileOps());
    expect(result.current.isDirty).toBe(false);
  });

  it("store jsonString 变化后 isDirty 变为 true", async () => {
    const { result } = renderHook(() => useFileOps());
    expect(result.current.isDirty).toBe(false);

    // 模拟用户编辑：直接改变 store 的 jsonString
    act(() => {
      useDocumentStore.setState({ jsonString: '{"edited":true}' });
    });

    await waitFor(() => {
      expect(result.current.isDirty).toBe(true);
    });
  });

  it("handleOpen 成功后 isDirty 重置为 false", async () => {
    const { result } = renderHook(() => useFileOps());

    // 先把 store 改脏
    act(() => {
      useDocumentStore.setState({ jsonString: '{"dirty":true}' });
    });
    await waitFor(() => expect(result.current.isDirty).toBe(true));

    // 打开新文件
    mockOpenFile.mockResolvedValueOnce({
      path: "/tmp/test.json",
      content: '{"fresh":true}',
    });

    await act(async () => {
      await result.current.handleOpen();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.currentPath).toBe("/tmp/test.json");
  });

  it("handleOpen 后继续编辑 → isDirty 再次变 true", async () => {
    const { result } = renderHook(() => useFileOps());

    mockOpenFile.mockResolvedValueOnce({
      path: "/tmp/test.json",
      content: '{"a":1}',
    });

    await act(async () => {
      await result.current.handleOpen();
    });
    expect(result.current.isDirty).toBe(false);

    // 模拟用户在打开文件后继续编辑
    act(() => {
      useDocumentStore.setState({ jsonString: '{"a":2}' });
    });

    await waitFor(() => {
      expect(result.current.isDirty).toBe(true);
    });
  });

  it("handleSave 成功后 isDirty 重置为 false", async () => {
    // 先 open 一个文件获得 currentPath
    const { result } = renderHook(() => useFileOps());

    mockOpenFile.mockResolvedValueOnce({
      path: "/tmp/doc.json",
      content: '{"v":1}',
    });
    await act(async () => {
      await result.current.handleOpen();
    });

    // 编辑 → dirty
    act(() => {
      useDocumentStore.setState({ jsonString: '{"v":2}' });
    });
    await waitFor(() => expect(result.current.isDirty).toBe(true));

    // 保存
    mockSaveFile.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("handleSave 失败时 isDirty 保持 true", async () => {
    const { result } = renderHook(() => useFileOps());

    mockOpenFile.mockResolvedValueOnce({
      path: "/tmp/doc.json",
      content: '{"v":1}',
    });
    await act(async () => {
      await result.current.handleOpen();
    });

    act(() => {
      useDocumentStore.setState({ jsonString: '{"v":2}' });
    });
    await waitFor(() => expect(result.current.isDirty).toBe(true));

    // 模拟保存失败
    mockSaveFile.mockRejectedValueOnce(new Error("disk full"));
    await act(async () => {
      await result.current.handleSave();
    });

    // 保存失败，dirty 应保持 true
    expect(result.current.isDirty).toBe(true);
  });

  it("handleSaveAs 成功后 isDirty 重置为 false", async () => {
    const { result } = renderHook(() => useFileOps());

    act(() => {
      useDocumentStore.setState({ jsonString: '{"unsaved":true}' });
    });
    await waitFor(() => expect(result.current.isDirty).toBe(true));

    mockSaveFileAs.mockResolvedValueOnce("/tmp/new-file.json");
    await act(async () => {
      await result.current.handleSaveAs();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.currentPath).toBe("/tmp/new-file.json");
  });

  it("handleNew 后 isDirty = false，再编辑变 true", async () => {
    const { result } = renderHook(() => useFileOps());

    // 先制造 dirty
    act(() => {
      useDocumentStore.setState({ jsonString: '{"x":1}' });
    });
    await waitFor(() => expect(result.current.isDirty).toBe(true));

    // 新建文档
    act(() => {
      result.current.handleNew();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.currentPath).toBe(null);

    // 新建后编辑再次触发 dirty
    act(() => {
      useDocumentStore.setState({ jsonString: '{"y":2}' });
    });
    await waitFor(() => {
      expect(result.current.isDirty).toBe(true);
    });
  });
});
