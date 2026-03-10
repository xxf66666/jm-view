/**
 * html-export.ts — JSON AST → 独立 HTML（T23）
 *
 * 输出：含内联 CSS 的单文件 HTML，可离线浏览
 * 支持：标题/段落/代码/引用/表格/列表/特殊块
 */

import type { JsonEntry, DocumentRoot } from "../types/json-ast";

export function exportToHtml(root: DocumentRoot, title = "jm-view export"): string {
  const entries = root.kind === "scalar" ? [root.entry] : root.children;
  const body = entryListToHtml(entries, 0);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         max-width: 820px; margin: 40px auto; padding: 0 20px;
         color: #111; line-height: 1.7; }
  h1,h2,h3,h4,h5,h6 { margin: 1.4em 0 .4em; font-weight: 600; }
  h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; }
  p { margin: .5em 0; }
  pre { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px;
        padding: 12px 16px; overflow-x: auto; font-size: .875em; }
  code { font-family: "SFMono-Regular", Consolas, monospace; font-size: .875em; }
  blockquote { border-left: 4px solid #d0d7de; padding: 4px 12px; color: #555;
               margin: .5em 0; }
  table { border-collapse: collapse; width: 100%; margin: .8em 0; }
  th, td { border: 1px solid #d0d7de; padding: 6px 12px; text-align: left; }
  th { background: #f6f8fa; font-weight: 600; }
  ul, ol { padding-left: 1.5em; margin: .5em 0; }
  .callout { border-radius: 6px; padding: 10px 14px; margin: .6em 0; }
  .callout.note    { background: #fff8e6; border-left: 4px solid #f5a623; }
  .callout.tip     { background: #edf7ed; border-left: 4px solid #4caf50; }
  .callout.warning { background: #fff3e0; border-left: 4px solid #ff9800; }
  .callout.info    { background: #e3f2fd; border-left: 4px solid #2196f3; }
  .callout.error   { background: #fdecea; border-left: 4px solid #f44336; }
  .meta-tag { display: inline-block; background: #f1f3f5; border-radius: 4px;
              padding: 1px 8px; font-size: .8em; font-family: monospace; color: #555; }
  hr { border: none; border-top: 2px solid #e1e4e8; margin: 1.5em 0; }
  .kv-pair { margin: .3em 0; }
  .kv-key { font-weight: 600; }
  img { max-width: 100%; border-radius: 4px; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ── 递归 ──────────────────────────────────────────────────────────────────

function entryListToHtml(entries: JsonEntry[], depth: number): string {
  return entries.map((e) => entryToHtml(e, depth)).join("\n");
}

function entryToHtml(entry: JsonEntry, depth: number): string {
  // 特殊块
  if (entry.type === "string" && typeof entry.value === "string" && entry.value.startsWith("::")) {
    return blockToHtml(entry.value);
  }

  // object → section
  if (entry.type === "object" && Array.isArray(entry.value)) {
    const level = Math.min(depth + 2, 6);
    const inner = entryListToHtml(entry.value as JsonEntry[], depth + 1);
    return `<h${level}>${escHtml(entry.key)}</h${level}>\n${inner}`;
  }

  // array
  if (entry.type === "array" && Array.isArray(entry.value)) {
    const children = entry.value as JsonEntry[];
    if (children.length === 0) return "";

    // 对象数组 → 表格
    if (children[0].type === "object") {
      return arrayToHtmlTable(entry.key, children);
    }
    // 标量数组 → ul
    const items = children.map((c) => `<li>${escHtml(String(c.value ?? ""))}</li>`).join("");
    return `<p><strong>${escHtml(entry.key)}</strong></p><ul>${items}</ul>`;
  }

  // null
  if (entry.type === "null") return `<p class="kv-pair"><span class="kv-key">${escHtml(entry.key)}</span>: <em>null</em></p>`;

  // boolean
  if (entry.type === "boolean") return `<p class="kv-pair"><span class="kv-key">${escHtml(entry.key)}</span>: <code>${entry.value}</code></p>`;

  // number / string
  const val = String(entry.value ?? "").replace(/\n/g, "<br>");
  return `<p class="kv-pair"><span class="kv-key">${escHtml(entry.key)}</span>: ${val}</p>`;
}

// ── 特殊块 → HTML ─────────────────────────────────────────────────────────

function blockToHtml(raw: string): string {
  const firstNewline = raw.indexOf("\n");
  const header = firstNewline > 0 ? raw.slice(0, firstNewline) : raw;
  const content = firstNewline > 0 ? raw.slice(firstNewline + 1) : "";

  const spaceIdx = header.indexOf(" ");
  const blockType = (spaceIdx > 0 ? header.slice(2, spaceIdx) : header.slice(2)).toLowerCase();
  const meta = spaceIdx > 0 ? escHtml(header.slice(spaceIdx + 1)) : "";
  const body = escHtml(content);

  switch (blockType) {
    case "heading": {
      const level = Math.min(6, Math.max(1, parseInt(meta) || 2));
      return `<h${level}>${escHtml(content) || meta}</h${level}>`;
    }
    case "code":
      return `<pre><code class="language-${meta}">${escHtml(content)}</code></pre>`;
    case "quote":
      return `<blockquote><p>${body}</p></blockquote>`;
    case "image": {
      const src = content.trim();
      return `<p><img src="${escAttr(src)}" alt="${meta}" loading="lazy"></p>`;
    }
    case "math": case "latex":
      return `<pre class="math">$$${content}$$</pre>`;
    case "divider":
      return `<hr>`;
    case "note":
      return `<div class="callout note"><strong>📝 笔记</strong><p>${body}</p></div>`;
    case "tip":
      return `<div class="callout tip"><strong>💡 提示</strong><p>${body}</p></div>`;
    case "warning":
      return `<div class="callout warning"><strong>⚠️ 警告</strong><p>${body}</p></div>`;
    case "callout":
      return `<div class="callout info"><strong>${meta}</strong><p>${body}</p></div>`;
    case "meta":
      return `<span class="meta-tag">${meta}: ${body}</span>`;
    case "link": {
      const [href, label] = content.split("\n");
      return `<p><a href="${escAttr(href)}" target="_blank" rel="noopener">${escHtml(label || href)}</a></p>`;
    }
    default:
      return `<p><em>[${escHtml(blockType)}]</em> ${body || meta}</p>`;
  }
}

// ── 对象数组 → table ──────────────────────────────────────────────────────

function arrayToHtmlTable(key: string, rows: JsonEntry[]): string {
  const cols = new Set<string>();
  rows.forEach((row) => (row.value as JsonEntry[]).forEach((c) => cols.add(c.key)));
  const colArr = [...cols];

  const thead = `<tr>${colArr.map((c) => `<th>${escHtml(c)}</th>`).join("")}</tr>`;
  const tbody = rows.map((row) => {
    const map = new Map((row.value as JsonEntry[]).map((c) => [c.key, c.value]));
    return `<tr>${colArr.map((c) => `<td>${escHtml(String(map.get(c) ?? ""))}</td>`).join("")}</tr>`;
  }).join("");

  return `<p><strong>${escHtml(key)}</strong></p><table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

// ── 工具 ──────────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
