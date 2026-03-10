import "@testing-library/jest-dom";

// ── @dnd-kit mock（jsdom 无 PointerEvent / BroadcastChannel）────────────
// DndContext 和 SortableContext 在测试环境中直接穿透渲染子节点
import { vi } from "vitest";

vi.mock("@dnd-kit/core", async () => {
  const React = await import("react");
  return {
    DndContext: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    PointerSensor: class {},
    KeyboardSensor: class {},
    useSensor: () => ({}),
    useSensors: (...args: unknown[]) => args,
    closestCenter: () => null,
    DragOverlay: ({ children }: { children: React.ReactNode }) => children ?? null,
  };
});

vi.mock("@dnd-kit/sortable", async () => {
  const React = await import("react");
  return {
    SortableContext: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    sortableKeyboardCoordinates: () => ({}),
    verticalListSortingStrategy: {},
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));
