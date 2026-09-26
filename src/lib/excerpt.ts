// Plain-text excerpt from a markdown body, for index cards
export function excerpt(markdown: string | undefined, max = 200): string {
  if (!markdown) return '';
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')        // links -> text
    .replace(/<[^>]+>/g, '')                        // html
    .replace(/^#+\s*/gm, '')                        // headings
    .replace(/[*_`>]/g, '')                         // emphasis, code, quotes
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-–—]+$/, '') + '…';
}
