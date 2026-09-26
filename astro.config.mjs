// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blackfreedomstudies.org',
  trailingSlash: 'ignore',
  // Keep editor-only pages (e.g. /admin/media/) out of the sitemap
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') })],
  // The image audit became a filter on the media page
  redirects: { '/admin/image-audit': '/admin/media/?status=attention' },
});
