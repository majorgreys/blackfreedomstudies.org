// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blackfreedomstudies.org',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
