/**
 * LatexBlock — LaTeX 兼容块（::latex = ::math 别名）
 * AC04 补完：::LaTeX 字符串也通过 KaTeX 渲染
 */
import React, { useEffect, useRef } from "react";
import { parseBlock } from "../../utils/block-parser";
import type { JmBlockProps } from "../../types/blocks";
export function LatexBlock({ content }: JmBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parsed = parseBlock(content);
  const formula = (parsed?.content || parsed?.meta || "").trim();
  useEffect(() => {
    if (!containerRef.current || !formula) return;
    import("katex").then(({ default: katex }) => {
      try {
        katex.render(formula, containerRef.current!, { throwOnError: false, displayMode: true, output: "html" });
      } catch {
        if (containerRef.current) containerRef.current.textContent = formula;
      }
    }).catch(() => { if (containerRef.current) containerRef.current.textContent = formula; });
  }, [formula]);
  if (!formula) return <span className="text-sm text-gray-400 italic">（空公式）</span>;
  return <div ref={containerRef} className="py-2 px-3 my-1 bg-gray-50 rounded-lg border border-gray-100 text-center overflow-x-auto" />;
}
