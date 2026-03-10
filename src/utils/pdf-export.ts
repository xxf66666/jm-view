/**
 * pdf-export.ts — HTML → PDF（T24）
 *
 * 方案：将 HTML 注入隐藏 iframe，触发浏览器/Tauri WebView 打印对话框
 * Tauri v2 WebView 支持 window.print()，用户可选"另存为 PDF"
 *
 * 局限：PDF 内容和样式由 WebView 打印引擎决定；
 *       不依赖第三方 PDF 库，避免 bundle 膨胀。
 */

import { exportToHtml } from "./html-export";
import type { DocumentRoot } from "../types/json-ast";

export function exportToPdf(root: DocumentRoot, title = "jm-view"): void {
  const html = exportToHtml(root, title);

  // 创建隐藏 iframe
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    console.error("[pdf-export] 无法访问 iframe.contentDocument");
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // 等 iframe 渲染完成后打印
  iframe.onload = () => {
    try {
      iframe.contentWindow?.print();
    } finally {
      // 打印对话框关闭后清理（setTimeout 确保对话框弹出后再移除）
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1000);
    }
  };
}
