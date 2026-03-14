export function parseVideoUrl(url: string): { provider: 'youtube' | 'vimeo' | null; id: string | null } {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return { provider: 'youtube', id: ytMatch[1] };

  const vimeoMatch = url.match(
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/
  );
  if (vimeoMatch) return { provider: 'vimeo', id: vimeoMatch[1] };

  return { provider: null, id: null };
}
