// ════════════════════════════════════════════════════════════════
// TeraLoka — Markdown Parser (Shared)
// PATH: src/lib/markdown.ts
// ────────────────────────────────────────────────────────────────
// SESI 7 (22 Mei 2026) — Extract dari OfficeBakabarHubNew-page.tsx
// Reusable di BAKABAR + Advertorial + future content surfaces.
//
// Supported markdown syntax:
//   # H1 / ## H2 / ### H3
//   > Blockquote
//   - List item (becomes <ul><li>)
//   **bold** / *italic*
//   [text](url)               → <a href target=_blank>
//   ![alt](url)               → <figure> dengan caption, atau <img class="bk-inline">
//   Paragraph (default)       → <p>
//
// Safety: escapeHtml() di awal supaya semua user input safe.
//         Hanya markdown syntax patterns yang di-unescape jadi HTML.
//
// Patterns: DRY (1 parser untuk multiple consumers)
// ════════════════════════════════════════════════════════════════

/**
 * Escape HTML entities untuk safe rendering.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parse markdown text → HTML string.
 *
 * Usage di React: <div dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
 *
 * Output classes:
 *   .bk-fig      — figure container untuk image dengan alt (caption shown)
 *   .bk-inline   — img tanpa alt (no caption)
 *
 * Untuk style figure/img, consumer apply CSS sendiri ke class ini.
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);

  // Headings (lenient: allow # without space after, for user-friendly UX)
  html = html.replace(/^###\s*(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s*(.+)$/gm,  '<h2>$1</h2>');
  html = html.replace(/^#\s*(.+)$/gm,   '<h1>$1</h1>');

  // Blockquote (note: > sudah jadi &gt; setelah escapeHtml)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // List item + wrap dengan <ul>
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>$2');

  // Bold + italic
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');

  // Image — dengan/tanpa alt
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    const safeAlt = alt || '';
    if (safeAlt.trim()) {
      return `<figure class="bk-fig"><img src="${src}" alt="${safeAlt}" /><figcaption>${safeAlt}</figcaption></figure>`;
    }
    return `<img class="bk-inline" src="${src}" alt="" />`;
  });

  // Link
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Block wrapping — split by double newline, wrap non-block dengan <p>
  const blocks = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-3]|ul|blockquote|figure|img)/.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean);

  return blocks.join('\n');
}
