// 이력서 미리보기용 최소 마크다운 렌더러 (제목, 목록, 표, 인용, 굵게). 모든 입력은 먼저 HTML 이스케이프한다.

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const inline = (s) =>
  escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[보완 필요:([^\]]*)\]/g, '<mark class="need">[보완 필요:$1]</mark>');

const cells = (row) => row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function renderMarkdown(md) {
  const lines = String(md ?? '').split('\n');
  const html = [];
  let list = null;
  let para = [];

  const flushPara = () => {
    if (para.length) html.push(`<p>${para.map(inline).join('<br>')}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    } else if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] || '')) {
      flush();
      const head = cells(line.trim());
      const rows = [];
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++].trim()));
      i--;
      html.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
    } else if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
      flushPara();
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(line.replace(/^\s*([-*]|\d+[.)])\s+/, ''));
    } else if (/^>\s?/.test(line)) {
      flush();
      html.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
    } else if (!line.trim()) {
      flush();
    } else {
      flushList();
      para.push(line);
    }
  }
  flush();
  return html.join('\n');
}
