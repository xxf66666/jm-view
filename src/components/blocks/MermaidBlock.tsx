/**
 * MermaidBlock — Mermaid.js 图表（::mermaid）
 * 格式：`::mermaid\ngraph TD\n  A --> B`
 */

import React, { useEffect, useRef, useState } from "react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";

let mermaidId = 0;

export function MermaidBlock({ content }: JmBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useRef(`mermaid-${++mermaidId}`);

  const parsed = parseBlock(content);
  const diagram = (parsed?.content || parsed?.meta || "").trim();

  useEffect(() => {
    if (!containerRef.current || !diagram) return;
    setError(null);

    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "default" });
      mermaid.render(id.current, diagram).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      }).catch((err: unknown) => {
        setError(String(err));
      });
    }).catch(() => {
      setError("Mermaid.js 加载失败");
    });
  }, [diagram]);

  if (!diagram) {
    return <span className="text-sm text-gray-400 italic">（空图表）</span>;
  }

  if (error) {
    return (
      <div className="px-3 py-2 my-1 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-mono">
        [Mermaid 错误: {error}]
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="py-2 px-3 my-1 bg-white rounded-lg border border-gray-200 overflow-x-auto"
    />
  );
}
