'use client';

interface DocumentViewerProps {
  content: string;
}

/**
 * Renders markdown content with basic styling.
 * Converts common markdown patterns to HTML and applies prose-like Tailwind classes.
 */
export function DocumentViewer({ content }: DocumentViewerProps) {
  const html = markdownToHtml(content);

  return (
    <div
      className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:font-semibold prose-a:text-emerald-700 prose-a:underline prose-a:underline-offset-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToHtml(md: string): string {
  let html = escapeHtml(md);

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-4 border-slate-200" />');

  // Headers (process before inline patterns)
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="mt-6 mb-2">$1</h3>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="mt-8 mb-3">$1</h2>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="mt-8 mb-4">$1</h1>',
  );

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-xs">$1</code>');

  // Links (markdown-style)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Unordered lists — collect consecutive lines starting with "- "
  html = html.replace(
    /(^- .+$(\n^- .+$)*)/gm,
    (match) => {
      const items = match
        .split('\n')
        .map((line) => `<li>${line.replace(/^- /, '')}</li>`)
        .join('');
      return `<ul class="my-2 list-disc pl-6 space-y-1">${items}</ul>`;
    },
  );

  // Ordered lists — collect consecutive lines starting with "N. "
  html = html.replace(
    /(^\d+\. .+$(\n^\d+\. .+$)*)/gm,
    (match) => {
      const items = match
        .split('\n')
        .map((line) => `<li>${line.replace(/^\d+\. /, '')}</li>`)
        .join('');
      return `<ol class="my-2 list-decimal pl-6 space-y-1">${items}</ol>`;
    },
  );

  // Paragraphs: wrap non-tag lines separated by blank lines
  html = html
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // Don't wrap blocks that are already HTML elements
      if (/^<(h[1-6]|ul|ol|hr|div|blockquote|pre|table)/.test(trimmed)) {
        return trimmed;
      }
      return `<p class="my-2">${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}
