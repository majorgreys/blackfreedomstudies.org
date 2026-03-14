# Frontend Implementation Plan — blackfreedomstudies.org

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dual-theme Astro site (classic recreation + academic/editorial redesign) with shared content collections and Decap CMS integration.

**Architecture:** Single Astro project with build-time theme switching via `THEME` env var. Shared content collections, routes, and data fetching. Theme-specific layouts, components, and styles. Two separate builds produce two deployable sites for stakeholder review.

**Tech Stack:** Astro 5.x, TypeScript, CSS (no framework), Decap CMS, Netlify

**Spec:** `docs/2026-03-13-frontend-design.md`
**Content Model:** `docs/2026-03-13-content-model-design.md`
**Issue:** `cbfs-wbu.5`

---

## Chunk 1: Project Setup & Shared Infrastructure

### Task 1: Initialize Astro project

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`

- [ ] **Step 1: Initialize Astro project**

```bash
cd /Users/tahirbutt/dev/git.lotus.yt/cbfs
npm create astro@latest . -- --template minimal --typescript strict --install --no-git
```

If prompted about overwriting, select yes for new files only. The project already has a git repo.

- [ ] **Step 2: Verify dev server starts**

```bash
npx astro dev
```

Expected: Server starts on `http://localhost:4321`. Kill with Ctrl+C after verifying.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src/
git commit -m "[cbfs-wbu.5] chore: initialize Astro project"
```

### Task 2: Configure content collections

**Files:**
- Create: `src/content.config.ts`

- [ ] **Step 1: Write the content collections config**

```typescript
// src/content.config.ts
import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    seasonYear: z.number().int().min(2013),
    seasonPart: z.enum(['fall', 'spring', 'special']),
    eventbrite: z.string().url().optional(),
    speakers: z.array(z.string()).default([]),
    books: z.array(image()).default([]),
    video: z.string().optional(),
    primaryResources: z.array(z.string()).default([]),
  }),
});

const speakers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/speakers' }),
  schema: ({ image }) => z.object({
    name: z.string(),
    affiliation: z.string().optional(),
    image: image().optional(),
    email: z.string().optional(),
    twitter: z.string().optional(),
    homepage: z.string().url().optional(),
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    resourceType: z.enum(['video', 'document', 'external', 'text', 'image', 'audio']),
    sourceUrl: z.string().url().optional(),
    videoEmbedCode: z.string().optional(),
    document: z.string().optional(),
    authorship: z.string().optional(),
    publicationDate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    date: z.coerce.date().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    image: image().optional(),
    imageCaption: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    heading: z.string().optional(),
    image: image().optional(),
  }),
});

export const collections = { events, speakers, resources, news, pages };
```

Note: References to other collections use slugs as plain strings rather than Astro's `reference()` helper. This is simpler for Decap CMS compatibility and avoids build-time validation failures during incremental content development. Resolution happens at render time.

- [ ] **Step 2: Create placeholder content files for testing**

Create one placeholder file per collection to verify the schema works:

```bash
mkdir -p src/content/{events,speakers,resources,news,pages}
```

```markdown
<!-- src/content/events/test-event.md -->
---
title: "Test Event"
date: 2024-01-15
seasonYear: 2024
seasonPart: spring
speakers: []
books: []
---
Test event description.
```

```markdown
<!-- src/content/speakers/test-speaker.md -->
---
name: "Test Speaker"
affiliation: "Test University"
---
Test bio.
```

```markdown
<!-- src/content/resources/test-resource.md -->
---
title: "Test Resource"
resourceType: video
---
Test description.
```

```markdown
<!-- src/content/news/test-news.md -->
---
title: "Test News"
date: 2024-01-15
---
Test body.
```

```markdown
<!-- src/content/pages/about.md -->
---
title: "About"
---
Test about page.
```

- [ ] **Step 3: Verify content collections load**

```bash
npx astro build 2>&1 | head -20
```

Expected: Build succeeds with no schema validation errors.

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/
git commit -m "[cbfs-wbu.5] feat: configure content collections with Zod schemas"
```

### Task 3: Build theme switching system

**Files:**
- Create: `src/lib/theme.ts`

- [ ] **Step 1: Write the theme resolver**

```typescript
// src/lib/theme.ts
// Static imports — Astro dead-code-eliminates the unused theme at build time
import ClassicBaseLayout from '../layouts/classic/BaseLayout.astro';
import RedesignBaseLayout from '../layouts/redesign/BaseLayout.astro';

import ClassicNavbar from '../components/classic/Navbar.astro';
import RedesignNavbar from '../components/redesign/Navbar.astro';

import ClassicFooter from '../components/classic/Footer.astro';
import RedesignFooter from '../components/redesign/Footer.astro';

import ClassicEventCard from '../components/classic/EventCard.astro';
import RedesignEventCard from '../components/redesign/EventCard.astro';

import ClassicSpeakerCard from '../components/classic/SpeakerCard.astro';
import RedesignSpeakerCard from '../components/redesign/SpeakerCard.astro';

import ClassicBookGrid from '../components/classic/BookGrid.astro';
import RedesignBookGrid from '../components/redesign/BookGrid.astro';

const theme = import.meta.env.THEME || 'redesign';
const isClassic = theme === 'classic';

export const Layout = isClassic ? ClassicBaseLayout : RedesignBaseLayout;
export const Navbar = isClassic ? ClassicNavbar : RedesignNavbar;
export const Footer = isClassic ? ClassicFooter : RedesignFooter;
export const EventCard = isClassic ? ClassicEventCard : RedesignEventCard;
export const SpeakerCard = isClassic ? ClassicSpeakerCard : RedesignSpeakerCard;
export const BookGrid = isClassic ? ClassicBookGrid : RedesignBookGrid;
```

Note: This file will not compile until the layout and component files exist. We create stubs in the next tasks.

- [ ] **Step 2: Add THEME to Astro env config**

```typescript
// env.d.ts (update existing or create)
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly THEME: 'classic' | 'redesign';
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme.ts env.d.ts
git commit -m "[cbfs-wbu.5] feat: add build-time theme switching system"
```

### Task 4: Build shared components

**Files:**
- Create: `src/components/shared/VideoEmbed.astro`
- Create: `src/components/shared/SEOHead.astro`
- Create: `src/components/shared/ShareLinks.astro`
- Create: `src/lib/video.ts`

- [ ] **Step 1: Write the video URL parser**

```typescript
// src/lib/video.ts
export function parseVideoUrl(url: string): { provider: 'youtube' | 'vimeo' | null; id: string | null } {
  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return { provider: 'youtube', id: ytMatch[1] };

  // Vimeo: vimeo.com/ID, player.vimeo.com/video/ID
  const vimeoMatch = url.match(
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/
  );
  if (vimeoMatch) return { provider: 'vimeo', id: vimeoMatch[1] };

  return { provider: null, id: null };
}
```

- [ ] **Step 2: Write VideoEmbed component**

```astro
---
// src/components/shared/VideoEmbed.astro
import { parseVideoUrl } from '../../lib/video';

interface Props {
  url?: string;
  embedCode?: string;
}

const { url, embedCode } = Astro.props;

let embedHtml = '';
if (embedCode) {
  embedHtml = embedCode;
} else if (url) {
  const { provider, id } = parseVideoUrl(url);
  if (provider === 'youtube' && id) {
    embedHtml = `<iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
  } else if (provider === 'vimeo' && id) {
    embedHtml = `<iframe src="https://player.vimeo.com/video/${id}" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
  }
}
---
{embedHtml && (
  <div class="video-embed">
    <Fragment set:html={embedHtml} />
  </div>
)}

<style>
  .video-embed {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
  }
  .video-embed :global(iframe) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>
```

- [ ] **Step 3: Write SEOHead component**

```astro
---
// src/components/shared/SEOHead.astro
interface Props {
  title: string;
  description?: string;
  image?: string;
  url?: string;
}

const { title, description = 'Conversations in Black Freedom Studies', image, url } = Astro.props;
const siteName = 'Black Freedom Studies';
const fullTitle = title === siteName ? title : `${title} - ${siteName}`;
---
<title>{fullTitle}</title>
<meta name="description" content={description} />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:type" content="website" />
{url && <meta property="og:url" content={url} />}
{image && <meta property="og:image" content={image} />}
```

- [ ] **Step 4: Write ShareLinks component**

```astro
---
// src/components/shared/ShareLinks.astro
interface Props {
  title: string;
  url: string;
}

const { title, url } = Astro.props;
const encodedTitle = encodeURIComponent(title);
const encodedUrl = encodeURIComponent(url);
---
<div class="share-links">
  <a href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} target="_blank" rel="noopener" aria-label="Share on Twitter">Twitter</a>
  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener" aria-label="Share on Facebook">Facebook</a>
  <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`} aria-label="Share via email">Email</a>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/ src/lib/video.ts
git commit -m "[cbfs-wbu.5] feat: add shared components (VideoEmbed, SEOHead, ShareLinks)"
```

---

## Chunk 2: Classic Theme

### Task 5: Build classic layout and structural components

**Files:**
- Create: `src/layouts/classic/BaseLayout.astro`
- Create: `src/components/classic/Navbar.astro`
- Create: `src/components/classic/Footer.astro`
- Create: `src/styles/classic/main.css`

- [ ] **Step 1: Write classic CSS**

```css
/* src/styles/classic/main.css */
/* Faithful recreation of the current blackfreedomstudies.org design */
/* Uses Open Sans, same color palette, modern CSS Grid/Flexbox instead of Bootstrap 3 */

@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');

:root {
  --font-body: 'Open Sans', sans-serif;
  --color-text: #333;
  --color-link: #337ab7;
  --color-link-hover: #23527c;
  --color-muted: #777;
  --color-bg: #fff;
  --color-nav-bg: #f8f8f8;
  --color-nav-border: #e7e7e7;
  --color-footer-bg: #f5f5f5;
  --max-width: 1170px;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.42857;
  color: var(--color-text);
  background-color: var(--color-bg);
}

a { color: var(--color-link); text-decoration: none; }
a:hover { color: var(--color-link-hover); text-decoration: underline; }

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 15px;
}

img { max-width: 100%; height: auto; }

/* Navbar */
.navbar {
  background-color: var(--color-nav-bg);
  border-bottom: 1px solid var(--color-nav-border);
  padding: 10px 0;
}
.navbar .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.navbar-brand {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}
.navbar-brand:hover { text-decoration: none; color: var(--color-text); }
.nav-links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 20px;
}
.nav-links a { font-size: 14px; }

/* Mobile nav */
.nav-toggle { display: none; background: none; border: none; font-size: 24px; cursor: pointer; }
@media (max-width: 768px) {
  .nav-toggle { display: block; }
  .nav-links { display: none; flex-direction: column; width: 100%; gap: 10px; padding-top: 10px; }
  .nav-links.open { display: flex; }
}

/* Footer */
.footer {
  background-color: var(--color-footer-bg);
  padding: 20px 0;
  margin-top: 40px;
  text-align: center;
}
.footer p { color: var(--color-muted); margin: 5px 0; font-size: 13px; }

/* Content area */
main { padding: 20px 0; }

/* Event styles */
.event-header { display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
.event-date { text-align: center; min-width: 60px; }
.event-date-month { display: block; font-size: 14px; text-transform: uppercase; color: var(--color-muted); }
.event-date-day { display: block; font-size: 28px; font-weight: 700; }

.book-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; }
.book-grid img { width: 120px; height: auto; }

.speaker-list { list-style: none; padding: 0; }
.speaker-item { display: flex; gap: 15px; padding: 15px 0; border-bottom: 1px solid #eee; }
.speaker-headshot { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
.speaker-info h3 { margin: 0 0 5px; }
.speaker-info .affiliation { font-style: italic; color: var(--color-muted); }
.speaker-social { display: flex; gap: 10px; margin-top: 5px; }

/* News styles */
.news-list { list-style: none; padding: 0; }
.news-item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
.news-item h2 { margin: 5px 0; }
.news-date { color: var(--color-muted); font-size: 13px; }

/* Homepage hero */
.hero { position: relative; margin-bottom: 20px; }
.hero img { width: 100%; }
.hero-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: rgba(0,0,0,0.6); color: #fff; padding: 15px;
}
.hero-overlay a { color: #fff; }

/* Utility */
.text-muted { color: var(--color-muted); }
.lead { font-size: 16px; line-height: 1.6; }
.video-embed { margin: 20px 0; }

/* Resource list */
.resource-group { margin-bottom: 30px; }
.resource-group h3 { border-bottom: 2px solid #eee; padding-bottom: 8px; }
.resource-item { padding: 8px 0; }
```

- [ ] **Step 2: Write classic Navbar component**

```astro
---
// src/components/classic/Navbar.astro
---
<nav class="navbar">
  <div class="container">
    <a class="navbar-brand" href="/">Black<br/>Freedom<br/>Studies</a>
    <button class="nav-toggle" aria-label="Toggle navigation" id="nav-toggle">☰</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="/events/">Conversations Series</a></li>
      <li><a href="/neh-seminar-2015">NEH Summer Seminar</a></li>
      <li><a href="/news/">News</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </div>
</nav>

<script>
  document.getElementById('nav-toggle')?.addEventListener('click', () => {
    document.getElementById('nav-links')?.classList.toggle('open');
  });
</script>
```

- [ ] **Step 3: Write classic Footer component**

```astro
---
// src/components/classic/Footer.astro
---
<footer class="footer">
  <div class="container">
    <p class="text-muted">Follow us on <a href="https://twitter.com/SchomburgCBFS">@SchomburgCBFS</a></p>
    <p class="text-muted">Send comments and questions to <a href="mailto:blackfreedomstudies@gmail.com">blackfreedomstudies@gmail.com</a></p>
    <p class="text-muted">CBFS is supported by the <a href="https://www.nypl.org/locations/schomburg">Schomburg Center for Research in Black Culture</a> and the <a href="https://gc.cuny.edu">City University of New York (CUNY) Graduate Center</a>.</p>
  </div>
</footer>
```

- [ ] **Step 4: Write classic BaseLayout**

```astro
---
// src/layouts/classic/BaseLayout.astro
import SEOHead from '../../components/shared/SEOHead.astro';
import Navbar from '../../components/classic/Navbar.astro';
import Footer from '../../components/classic/Footer.astro';
import '../../styles/classic/main.css';

interface Props {
  title: string;
  description?: string;
  image?: string;
}

const { title, description, image } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <SEOHead title={title} description={description} image={image} url={Astro.url.href} />
</head>
<body>
  <Navbar />
  <main class="container">
    <slot />
  </main>
  <Footer />
</body>
</html>
```

- [ ] **Step 5: Commit**

```bash
git add src/layouts/classic/ src/components/classic/ src/styles/classic/
git commit -m "[cbfs-wbu.5] feat: add classic theme layout, navbar, footer, and CSS"
```

### Task 6: Build classic content components

**Files:**
- Create: `src/components/classic/EventCard.astro`
- Create: `src/components/classic/SpeakerCard.astro`
- Create: `src/components/classic/BookGrid.astro`

- [ ] **Step 1: Write EventCard**

```astro
---
// src/components/classic/EventCard.astro
interface Props {
  title: string;
  date: Date;
  slug: string;
  seasonSlug: string;
  speakerCount?: number;
}

const { title, date, slug, seasonSlug, speakerCount } = Astro.props;
const month = date.toLocaleDateString('en-US', { month: 'short' });
const day = date.getDate();
---
<li class="event-item">
  <a href={`/events/${seasonSlug}/${slug}`}>
    <div class="event-header">
      <div class="event-date">
        <span class="event-date-month">{month}</span>
        <span class="event-date-day">{day}</span>
      </div>
      <div>
        <h3 style="margin:0">{title}</h3>
        {speakerCount && speakerCount > 0 && <span class="text-muted">{speakerCount} speaker{speakerCount > 1 ? 's' : ''}</span>}
      </div>
    </div>
  </a>
</li>
```

- [ ] **Step 2: Write SpeakerCard**

```astro
---
// src/components/classic/SpeakerCard.astro
import { Image } from 'astro:assets';

interface Props {
  name: string;
  slug: string;
  affiliation?: string;
  image?: ImageMetadata;
  bio?: string;
  email?: string;
  twitter?: string;
  homepage?: string;
  compact?: boolean;
}

const { name, slug, affiliation, image, bio, email, twitter, homepage, compact = false } = Astro.props;
---
<li class="speaker-item">
  {image ? (
    <Image src={image} alt={name} class="speaker-headshot" width={80} height={80} />
  ) : (
    <div class="speaker-headshot" style="background:#eee;display:flex;align-items:center;justify-content:center;font-size:2em;color:#999;">👤</div>
  )}
  <div class="speaker-info">
    <h3><a href={`/speakers/${slug}`}>{name}</a></h3>
    {affiliation && <span class="affiliation">{affiliation}</span>}
    {!compact && bio && <div class="speaker-bio"><Fragment set:html={bio} /></div>}
    <div class="speaker-social">
      {homepage && <a href={homepage} aria-label="Homepage">🏠</a>}
      {email && <a href={`mailto:${email}`} aria-label="Email">✉️</a>}
      {twitter && <a href={`https://twitter.com/${twitter}`} aria-label="Twitter">🐦</a>}
    </div>
  </div>
</li>
```

- [ ] **Step 3: Write BookGrid**

```astro
---
// src/components/classic/BookGrid.astro
import { Image } from 'astro:assets';

interface Props {
  books: ImageMetadata[];
}

const { books } = Astro.props;
---
{books.length > 0 && (
  <div class="book-grid">
    {books.map((book) => (
      <Image src={book} alt="Book cover" width={120} />
    ))}
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/classic/
git commit -m "[cbfs-wbu.5] feat: add classic EventCard, SpeakerCard, BookGrid components"
```

### Task 7: Build classic pages — homepage, static pages, 404

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/[slug].astro`
- Create: `src/pages/404.astro`

- [ ] **Step 1: Write homepage**

```astro
---
// src/pages/index.astro
import { getCollection } from 'astro:content';
import { Layout } from '../lib/theme';

const pagesCollection = await getCollection('pages');
const homepage = pagesCollection.find(p => p.id === 'homepage' || p.id === 'index');
const newsEntries = await getCollection('news');
const latestNews = newsEntries
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .slice(0, 2);

let homepageContent = '';
if (homepage) {
  const { Content } = await homepage.render();
  // We'll render Content in the template
}
---
<Layout title="Conversations in Black Freedom Studies">
  <div class="hero">
    {homepage?.data.image && (
      <img src={homepage.data.image.src} alt="Conversations in Black Freedom Studies" />
    )}
    <div class="hero-overlay">
      <ul style="list-style:none;padding:0;margin:0;">
        {latestNews.map(entry => (
          <li style="margin-bottom:8px;">
            <a href={`/news/${entry.data.date.getFullYear()}/${entry.id}`}>{entry.data.title}</a>
          </li>
        ))}
      </ul>
    </div>
  </div>
  {homepage && (
    <div class="lead">
      {await homepage.render().then(({ Content }) => <Content />)}
    </div>
  )}
</Layout>
```

- [ ] **Step 2: Write static pages route**

```astro
---
// src/pages/[slug].astro
import { getCollection } from 'astro:content';
import { Layout } from '../lib/theme';

export async function getStaticPaths() {
  const pagesCollection = await getCollection('pages');
  return pagesCollection
    .filter(page => page.id !== 'homepage' && page.id !== 'index')
    .map(page => ({
      params: { slug: page.id },
      props: { page },
    }));
}

const { page } = Astro.props;
const { Content } = await page.render();
---
<Layout title={page.data.title}>
  <h1>{page.data.title}</h1>
  <Content />
</Layout>
```

- [ ] **Step 3: Write 404 page**

```astro
---
// src/pages/404.astro
import { Layout } from '../lib/theme';
---
<Layout title="Page Not Found">
  <h1>404 — Page Not Found</h1>
  <p>The page you're looking for doesn't exist.</p>
  <p><a href="/">Return to homepage</a></p>
</Layout>
```

- [ ] **Step 4: Verify pages render**

```bash
npx astro build 2>&1 | tail -20
```

Expected: Build succeeds. Homepage, about, and 404 pages are generated.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/pages/\[slug\].astro src/pages/404.astro
git commit -m "[cbfs-wbu.5] feat: add homepage, static pages, and 404"
```

### Task 8: Build classic pages — events

**Files:**
- Create: `src/pages/events/index.astro`
- Create: `src/pages/events/[season].astro`
- Create: `src/pages/events/[season]/[slug].astro`

- [ ] **Step 1: Write events index**

```astro
---
// src/pages/events/index.astro
import { getCollection } from 'astro:content';
import { Layout } from '../../lib/theme';

const events = await getCollection('events');

// Group events by season
const seasons = new Map<string, typeof events>();
for (const event of events) {
  const key = `${event.data.seasonPart}-${event.data.seasonYear}`;
  if (!seasons.has(key)) seasons.set(key, []);
  seasons.get(key)!.push(event);
}

// Sort seasons reverse chronologically
const sortedSeasons = [...seasons.entries()].sort((a, b) => {
  const [aPart, aYear] = [a[0].split('-')[0], parseInt(a[0].split('-')[1])];
  const [bPart, bYear] = [b[0].split('-')[0], parseInt(b[0].split('-')[1])];
  if (aYear !== bYear) return bYear - aYear;
  const partOrder = { fall: 2, spring: 1, special: 0 };
  return (partOrder[bPart as keyof typeof partOrder] ?? 0) - (partOrder[aPart as keyof typeof partOrder] ?? 0);
});
---
<Layout title="Conversations Series">
  <h1>Conversations Series</h1>
  <ul style="list-style:none;padding:0;">
    {sortedSeasons.map(([season, seasonEvents]) => {
      const [part, year] = season.split('-');
      const label = `${part.charAt(0).toUpperCase() + part.slice(1)} ${year}`;
      return (
        <li style="margin-bottom:15px;">
          <h2><a href={`/events/${season}`}>{label}</a></h2>
          <span class="text-muted">{seasonEvents.length} event{seasonEvents.length > 1 ? 's' : ''}</span>
        </li>
      );
    })}
  </ul>
</Layout>
```

- [ ] **Step 2: Write season page**

```astro
---
// src/pages/events/[season].astro
import { getCollection } from 'astro:content';
import { Layout, EventCard } from '../../lib/theme';

export async function getStaticPaths() {
  const events = await getCollection('events');
  const seasons = new Set(events.map(e => `${e.data.seasonPart}-${e.data.seasonYear}`));
  return [...seasons].map(season => ({
    params: { season },
    props: { season },
  }));
}

const { season } = Astro.props;
const [part, year] = season.split('-');
const label = `${part.charAt(0).toUpperCase() + part.slice(1)} ${year}`;

const events = await getCollection('events');
const seasonEvents = events
  .filter(e => `${e.data.seasonPart}-${e.data.seasonYear}` === season)
  .sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
---
<Layout title={label}>
  <h1>{label}</h1>
  <ul style="list-style:none;padding:0;">
    {seasonEvents.map(event => (
      <EventCard
        title={event.data.title}
        date={event.data.date}
        slug={event.id}
        seasonSlug={season}
        speakerCount={event.data.speakers.length}
      />
    ))}
  </ul>
</Layout>
```

- [ ] **Step 3: Write event detail page**

```astro
---
// src/pages/events/[season]/[slug].astro
import { getCollection } from 'astro:content';
import { Layout, SpeakerCard, BookGrid } from '../../../lib/theme';
import VideoEmbed from '../../../components/shared/VideoEmbed.astro';

export async function getStaticPaths() {
  const events = await getCollection('events');
  return events.map(event => ({
    params: {
      season: `${event.data.seasonPart}-${event.data.seasonYear}`,
      slug: event.id,
    },
    props: { event },
  }));
}

const { event } = Astro.props;
const { Content } = await event.render();
const month = event.data.date.toLocaleDateString('en-US', { month: 'short' });
const day = event.data.date.getDate();

// Resolve speaker references
const allSpeakers = await getCollection('speakers');
const speakers = event.data.speakers
  .map(slug => allSpeakers.find(s => s.id === slug))
  .filter(Boolean);

// Resolve video reference
const allResources = await getCollection('resources');
const video = event.data.video
  ? allResources.find(r => r.id === event.data.video)
  : null;

// Resolve primary resources
const primaryResources = event.data.primaryResources
  .map(slug => allResources.find(r => r.id === slug))
  .filter(Boolean);

const isFuture = event.data.date > new Date();
---
<Layout title={event.data.title}>
  <div class="event-header">
    <div class="event-date">
      <span class="event-date-month">{month}</span>
      <span class="event-date-day">{day}</span>
    </div>
    <div>
      <h1 style="margin:0">{event.data.title}</h1>
    </div>
  </div>

  {isFuture && event.data.eventbrite && (
    <a href={event.data.eventbrite} target="_blank" rel="noopener" style="display:inline-block;padding:8px 16px;background:var(--color-link);color:#fff;border-radius:4px;margin-bottom:20px;">Register on Eventbrite</a>
  )}

  <BookGrid books={event.data.books} />

  <section>
    <h2>Description</h2>
    <Content />
  </section>

  {speakers.length > 0 && (
    <section>
      <h2>Speakers</h2>
      <ul class="speaker-list">
        {speakers.map(async (speaker) => {
          const { Content: SpeakerBio } = await speaker!.render();
          return (
            <SpeakerCard
              name={speaker!.data.name}
              slug={speaker!.id}
              affiliation={speaker!.data.affiliation}
              image={speaker!.data.image}
              email={speaker!.data.email}
              twitter={speaker!.data.twitter}
              homepage={speaker!.data.homepage}
            />
          );
        })}
      </ul>
    </section>
  )}

  {video && (
    <section>
      <h2>Recording</h2>
      <VideoEmbed
        url={video.data.sourceUrl}
        embedCode={video.data.videoEmbedCode}
      />
    </section>
  )}

  {primaryResources.length > 0 && (
    <section>
      <h2>Primary Resources</h2>
      <ul>
        {primaryResources.map(resource => (
          <li>
            {resource!.data.sourceUrl ? (
              <a href={resource!.data.sourceUrl} target="_blank" rel="noopener">{resource!.data.title}</a>
            ) : (
              <span>{resource!.data.title}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )}
</Layout>
```

- [ ] **Step 4: Verify events pages build**

```bash
npx astro build 2>&1 | tail -20
```

Expected: Build succeeds. Events index, season pages, and event detail pages are generated.

- [ ] **Step 5: Commit**

```bash
git add src/pages/events/
git commit -m "[cbfs-wbu.5] feat: add events index, season, and detail pages"
```

### Task 9: Build classic pages — news, speakers, resources

**Files:**
- Create: `src/pages/news/index.astro`
- Create: `src/pages/news/[year]/[slug].astro`
- Create: `src/pages/speakers/index.astro`
- Create: `src/pages/speakers/[slug].astro`
- Create: `src/pages/resources/index.astro`

- [ ] **Step 1: Write news index**

```astro
---
// src/pages/news/index.astro
import { getCollection } from 'astro:content';
import { Layout } from '../../lib/theme';

const news = (await getCollection('news'))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---
<Layout title="News">
  <h1>News</h1>
  <ul class="news-list">
    {news.map(entry => (
      <li class="news-item">
        <span class="news-date">{entry.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <h2><a href={`/news/${entry.data.date.getFullYear()}/${entry.id}`}>{entry.data.title}</a></h2>
      </li>
    ))}
  </ul>
</Layout>
```

- [ ] **Step 2: Write news detail page**

```astro
---
// src/pages/news/[year]/[slug].astro
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import { Layout } from '../../../lib/theme';

export async function getStaticPaths() {
  const news = await getCollection('news');
  return news.map(entry => ({
    params: {
      year: String(entry.data.date.getFullYear()),
      slug: entry.id,
    },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();
---
<Layout title={entry.data.title}>
  {entry.data.image && (
    <figure>
      <Image src={entry.data.image} alt={entry.data.title} width={800} />
      {entry.data.imageCaption && <figcaption class="text-muted">{entry.data.imageCaption}</figcaption>}
    </figure>
  )}
  <h1>{entry.data.title}</h1>
  <p class="news-date">{entry.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  <Content />
  {entry.data.tags.length > 0 && (
    <p class="text-muted">Tags: {entry.data.tags.join(', ')}</p>
  )}
</Layout>
```

- [ ] **Step 3: Write speakers index**

```astro
---
// src/pages/speakers/index.astro
import { getCollection } from 'astro:content';
import { Layout, SpeakerCard } from '../../lib/theme';

const speakers = (await getCollection('speakers'))
  .sort((a, b) => a.data.name.localeCompare(b.data.name));
---
<Layout title="Speakers">
  <h1>Speakers</h1>
  <ul class="speaker-list">
    {speakers.map(speaker => (
      <SpeakerCard
        name={speaker.data.name}
        slug={speaker.id}
        affiliation={speaker.data.affiliation}
        image={speaker.data.image}
        compact
      />
    ))}
  </ul>
</Layout>
```

- [ ] **Step 4: Write speaker detail page**

```astro
---
// src/pages/speakers/[slug].astro
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import { Layout } from '../../lib/theme';

export async function getStaticPaths() {
  const speakers = await getCollection('speakers');
  return speakers.map(speaker => ({
    params: { slug: speaker.id },
    props: { speaker },
  }));
}

const { speaker } = Astro.props;
const { Content } = await speaker.render();

// Find events this speaker appeared in
const events = await getCollection('events');
const appearances = events
  .filter(e => e.data.speakers.includes(speaker.id))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---
<Layout title={speaker.data.name}>
  <div style="display:flex;gap:20px;margin-bottom:20px;">
    {speaker.data.image && (
      <Image src={speaker.data.image} alt={speaker.data.name} width={150} height={150} style="border-radius:50%;object-fit:cover;" />
    )}
    <div>
      <h1 style="margin-top:0">{speaker.data.name}</h1>
      {speaker.data.affiliation && <p class="text-muted" style="font-style:italic">{speaker.data.affiliation}</p>}
      <div style="display:flex;gap:10px;">
        {speaker.data.homepage && <a href={speaker.data.homepage}>Website</a>}
        {speaker.data.email && <a href={`mailto:${speaker.data.email}`}>Email</a>}
        {speaker.data.twitter && <a href={`https://twitter.com/${speaker.data.twitter}`}>Twitter</a>}
      </div>
    </div>
  </div>

  <Content />

  {appearances.length > 0 && (
    <section>
      <h2>Events</h2>
      <ul>
        {appearances.map(event => (
          <li>
            <a href={`/events/${event.data.seasonPart}-${event.data.seasonYear}/${event.id}`}>
              {event.data.title}
            </a>
            <span class="text-muted"> — {event.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
          </li>
        ))}
      </ul>
    </section>
  )}
</Layout>
```

- [ ] **Step 5: Write resources index**

```astro
---
// src/pages/resources/index.astro
import { getCollection } from 'astro:content';
import { Layout } from '../../lib/theme';

const resources = await getCollection('resources');

const grouped = {
  video: resources.filter(r => r.data.resourceType === 'video'),
  document: resources.filter(r => r.data.resourceType === 'document'),
  external: resources.filter(r => ['external', 'text', 'image', 'audio'].includes(r.data.resourceType)),
};
---
<Layout title="Resources">
  <h1>Resources</h1>

  {grouped.video.length > 0 && (
    <div class="resource-group">
      <h3>Video Recordings</h3>
      {grouped.video.map(r => (
        <div class="resource-item">
          {r.data.sourceUrl ? (
            <a href={r.data.sourceUrl} target="_blank" rel="noopener">{r.data.title}</a>
          ) : (
            <span>{r.data.title}</span>
          )}
          {r.data.date && <span class="text-muted"> — {r.data.date.toLocaleDateString('en-US', { year: 'numeric' })}</span>}
        </div>
      ))}
    </div>
  )}

  {grouped.document.length > 0 && (
    <div class="resource-group">
      <h3>Primary Documents</h3>
      {grouped.document.map(r => (
        <div class="resource-item">
          {r.data.document ? (
            <a href={r.data.document} download>{r.data.title}</a>
          ) : (
            <span>{r.data.title}</span>
          )}
          {r.data.authorship && <span class="text-muted"> — {r.data.authorship}</span>}
        </div>
      ))}
    </div>
  )}

  {grouped.external.length > 0 && (
    <div class="resource-group">
      <h3>External Resources</h3>
      {grouped.external.map(r => (
        <div class="resource-item">
          {r.data.sourceUrl ? (
            <a href={r.data.sourceUrl} target="_blank" rel="noopener">{r.data.title}</a>
          ) : (
            <span>{r.data.title}</span>
          )}
        </div>
      ))}
    </div>
  )}
</Layout>
```

- [ ] **Step 6: Verify all pages build**

```bash
npx astro build 2>&1 | tail -20
```

Expected: Build succeeds with all page routes generated.

- [ ] **Step 7: Commit**

```bash
git add src/pages/news/ src/pages/speakers/ src/pages/resources/
git commit -m "[cbfs-wbu.5] feat: add news, speakers, and resources pages"
```

- [ ] **Step 8: Verify classic theme end-to-end**

```bash
npx astro dev
```

Open `http://localhost:4321` and verify:
- Homepage loads with hero image and news overlay
- `/events/` shows seasons
- `/speakers/` shows speaker list
- `/news/` shows news articles
- `/resources/` shows grouped resources
- `/about` shows static page content
- Navigation links work between pages

Kill dev server after verifying.

- [ ] **Step 9: Commit any fixes**

```bash
git add -A && git commit -m "[cbfs-wbu.5] fix: classic theme adjustments from manual review"
```

Only commit if there were fixes. Skip if everything worked.

---

## Chunk 3: Redesign Theme

### Task 10: Build redesign layout and structural components

**Files:**
- Create: `src/layouts/redesign/BaseLayout.astro`
- Create: `src/components/redesign/Navbar.astro`
- Create: `src/components/redesign/Footer.astro`
- Create: `src/styles/redesign/main.css`

- [ ] **Step 1: Write redesign CSS**

Create `src/styles/redesign/main.css` with the academic + editorial design system:

- Import Playfair Display (headings) and Inter (body) from Google Fonts
- Color palette: `--navy: #1a1a2e`, `--gold: #c9a227`, `--cream: #f5f0e8`, `--text: #2d2d2d`
- Strong typographic hierarchy with serif headings, generous whitespace
- Bold section dividers using color blocks and horizontal rules
- Card-based layouts for events and speakers
- Grid layouts for book covers and speaker directories
- Responsive breakpoints at 768px and 1024px

This CSS file should be ~200-300 lines. Use the classic CSS as a structural reference but apply completely different visual styling.

- [ ] **Step 2: Write redesign Navbar**

Similar structure to classic but with:
- Site name displayed as a single line in larger serif font
- Nav links with subtle gold underline on hover
- Full-width container with more padding

- [ ] **Step 3: Write redesign Footer**

Same content as classic but styled with:
- Navy background, cream text
- Schomburg/CUNY attribution more prominent
- Social links as icon buttons

- [ ] **Step 4: Write redesign BaseLayout**

Same structure as classic BaseLayout but imports redesign CSS and components.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/redesign/ src/components/redesign/Navbar.astro src/components/redesign/Footer.astro src/styles/redesign/
git commit -m "[cbfs-wbu.5] feat: add redesign theme layout, navbar, footer, and CSS"
```

### Task 11: Build redesign content components

**Files:**
- Create: `src/components/redesign/EventCard.astro`
- Create: `src/components/redesign/SpeakerCard.astro`
- Create: `src/components/redesign/BookGrid.astro`
- Create: `src/components/redesign/SeasonTimeline.astro`

- [ ] **Step 1: Write redesign EventCard**

Card-based layout with:
- Date badge (colored accent)
- Title in serif font
- Speaker count, book cover thumbnails as a row
- Subtle shadow on hover

- [ ] **Step 2: Write redesign SpeakerCard**

Grid-friendly card with:
- Circular headshot image (larger than classic)
- Name in serif, affiliation below
- Social icons as small buttons
- Bio truncated in compact mode

- [ ] **Step 3: Write redesign BookGrid**

Larger book covers than classic, displayed in a CSS Grid with gap. Hover effect showing slight scale.

- [ ] **Step 4: Write redesign SeasonTimeline**

Visual component for events index showing seasons as a vertical or horizontal timeline:
- Each season is a card/node with date range and event count
- Connected visually (line or border)
- Links to season pages

- [ ] **Step 5: Commit**

```bash
git add src/components/redesign/
git commit -m "[cbfs-wbu.5] feat: add redesign content components"
```

### Task 12: Verify redesign theme builds

The page files in `src/pages/` are shared — they already import from `src/lib/theme.ts` which re-exports the active theme's components. No new page files needed.

- [ ] **Step 1: Build with redesign theme**

```bash
THEME=redesign npx astro build 2>&1 | tail -20
```

Expected: Build succeeds with all pages generated using redesign components.

- [ ] **Step 2: Build with classic theme**

```bash
THEME=classic npx astro build 2>&1 | tail -20
```

Expected: Build succeeds with all pages generated using classic components.

- [ ] **Step 3: Visual verification**

```bash
THEME=redesign npx astro dev
```

Open `http://localhost:4321` and verify the redesign theme looks distinct from classic:
- Different fonts (serif headings)
- Different color palette (navy, gold, cream)
- Different layout for events (cards, timeline)
- Same content, different presentation

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "[cbfs-wbu.5] fix: redesign theme adjustments from manual review"
```

---

## Chunk 4: Decap CMS & Final Touches

### Task 13: Configure Decap CMS

**Files:**
- Create: `public/admin/index.html`
- Create: `public/admin/config.yml`

- [ ] **Step 1: Write admin HTML**

```html
<!-- public/admin/index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CBFS Admin</title>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</head>
<body></body>
</html>
```

- [ ] **Step 2: Write Decap CMS config**

```yaml
# public/admin/config.yml
backend:
  name: git-gateway
  branch: main

media_folder: src/assets
public_folder: /src/assets

collections:
  - name: events
    label: Events
    folder: src/content/events
    create: true
    extension: md
    fields:
      - { name: title, label: Title, widget: string }
      - { name: date, label: Date, widget: datetime }
      - { name: seasonYear, label: Season Year, widget: number, value_type: int }
      - { name: seasonPart, label: Season, widget: select, options: [fall, spring, special] }
      - { name: eventbrite, label: Eventbrite URL, widget: string, required: false }
      - name: speakers
        label: Speakers
        widget: relation
        collection: speakers
        search_fields: [name]
        value_field: "{{slug}}"
        display_fields: [name]
        multiple: true
        required: false
      - { name: books, label: Book Covers, widget: list, field: { name: image, widget: image }, required: false }
      - name: video
        label: Video Recording
        widget: relation
        collection: resources
        search_fields: [title]
        value_field: "{{slug}}"
        display_fields: [title]
        required: false
      - name: primaryResources
        label: Primary Resources
        widget: relation
        collection: resources
        search_fields: [title]
        value_field: "{{slug}}"
        display_fields: [title]
        multiple: true
        required: false
      - { name: body, label: Description, widget: markdown }

  - name: speakers
    label: Speakers
    folder: src/content/speakers
    create: true
    extension: md
    identifier_field: name
    fields:
      - { name: name, label: Name, widget: string }
      - { name: affiliation, label: Affiliation, widget: string, required: false }
      - { name: image, label: Photo, widget: image, required: false }
      - { name: email, label: Email, widget: string, required: false }
      - { name: twitter, label: Twitter Handle, widget: string, required: false }
      - { name: homepage, label: Website, widget: string, required: false }
      - { name: body, label: Bio, widget: markdown }

  - name: resources
    label: Resources
    folder: src/content/resources
    create: true
    extension: md
    fields:
      - { name: title, label: Title, widget: string }
      - { name: resourceType, label: Type, widget: select, options: [video, document, external, text, image, audio] }
      - { name: sourceUrl, label: Source URL, widget: string, required: false }
      - { name: videoEmbedCode, label: Embed Code, widget: text, required: false }
      - { name: document, label: Document Path, widget: string, required: false }
      - { name: authorship, label: Author, widget: string, required: false }
      - { name: publicationDate, label: Publication Date, widget: string, required: false }
      - { name: tags, label: Tags, widget: list, required: false }
      - { name: date, label: Recording Date, widget: datetime, required: false }
      - { name: body, label: Description, widget: markdown }

  - name: news
    label: News
    folder: src/content/news
    create: true
    extension: md
    fields:
      - { name: title, label: Title, widget: string }
      - { name: date, label: Date, widget: datetime }
      - { name: image, label: Banner Image, widget: image, required: false }
      - { name: imageCaption, label: Image Caption, widget: string, required: false }
      - { name: tags, label: Tags, widget: list, required: false }
      - { name: body, label: Body, widget: markdown }

  - name: pages
    label: Pages
    folder: src/content/pages
    create: false
    extension: md
    fields:
      - { name: title, label: Title, widget: string }
      - { name: heading, label: Heading, widget: string, required: false }
      - { name: image, label: Image, widget: image, required: false }
      - { name: body, label: Content, widget: markdown }
```

- [ ] **Step 3: Verify admin page loads**

```bash
npx astro dev
```

Open `http://localhost:4321/admin/` — should show Decap CMS login screen (will fail to authenticate without Netlify Identity, but the UI should load).

- [ ] **Step 4: Commit**

```bash
git add public/admin/
git commit -m "[cbfs-wbu.5] feat: add Decap CMS admin configuration"
```

### Task 14: Add Netlify deployment config

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Write Netlify config**

```toml
# netlify.toml
[build]
  command = "npx astro build"
  publish = "dist"

[build.environment]
  THEME = "redesign"

# Redirect /admin to Decap CMS
[[redirects]]
  from = "/admin"
  to = "/admin/index.html"
  status = 200
```

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "[cbfs-wbu.5] feat: add Netlify deployment config"
```

### Task 15: Final build verification and issue closure

- [ ] **Step 1: Clean build both themes**

```bash
rm -rf dist/
THEME=classic npx astro build 2>&1 | tail -5
rm -rf dist/
THEME=redesign npx astro build 2>&1 | tail -5
```

Expected: Both builds succeed with no errors.

- [ ] **Step 2: Remove placeholder test content**

Delete the placeholder `.md` files created in Task 2 Step 2 (only if real content from cbfs-wbu.4 export is present).

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "[cbfs-wbu.5] chore: final build verification"
```

- [ ] **Step 4: Close the issue**

```bash
ACTOR="${BR_ACTOR:-assistant}"
br close --actor "$ACTOR" cbfs-wbu.5 --reason "Dual-theme Astro frontend built: classic recreation + academic/editorial redesign. Decap CMS configured. Netlify deployment ready." --json
br sync --flush-only
git add .beads/ && git commit -m "[cbfs-wbu.5] chore: close frontend issue"
```
