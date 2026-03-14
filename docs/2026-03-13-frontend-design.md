# Frontend Design — blackfreedomstudies.org on Astro

**Issue:** `cbfs-wbu.5` — Build frontend for new site
**Epic:** `cbfs-wbu` — Migrate blackfreedomstudies.org from Craft CMS
**Stack:** Astro + Decap CMS + Netlify/Cloudflare Pages

## Context

Two frontend themes built in a single Astro project: a faithful recreation of the current site ("classic") and a full redesign with an academic + editorial aesthetic ("redesign"). Both share the same content collections, routes, and data fetching. A build-time config variable selects the active theme, allowing both to be deployed separately for stakeholder review.

## Architecture

```
src/
├── content/              # shared content collections (from cbfs-wbu.4 export)
├── layouts/
│   ├── classic/          # faithful recreation layouts
│   │   └── BaseLayout.astro
│   └── redesign/         # redesign layouts
│       └── BaseLayout.astro
├── components/
│   ├── shared/           # theme-agnostic components
│   │   ├── VideoEmbed.astro
│   │   ├── SEOHead.astro
│   │   └── ShareLinks.astro
│   ├── classic/          # classic-specific components
│   │   ├── Navbar.astro
│   │   ├── Footer.astro
│   │   ├── EventCard.astro
│   │   ├── SpeakerCard.astro
│   │   └── BookGrid.astro
│   └── redesign/         # redesign-specific components
│       ├── Navbar.astro
│       ├── Footer.astro
│       ├── EventCard.astro
│       ├── SpeakerCard.astro
│       ├── BookGrid.astro
│       └── SeasonTimeline.astro
├── pages/                # shared routes — import layout via theme resolver
│   ├── index.astro
│   ├── [slug].astro           # static pages (about, cbfs-syllabus, neh-seminar-2015)
│   ├── events/
│   │   ├── index.astro
│   │   ├── [season].astro
│   │   └── [season]/[slug].astro
│   ├── news/
│   │   ├── index.astro
│   │   └── [year]/[slug].astro
│   ├── speakers/
│   │   ├── index.astro
│   │   └── [slug].astro
│   ├── resources/
│   │   └── index.astro       # listing only — no detail pages (matches current site)
│   └── 404.astro              # styled 404 page (both themes)
├── styles/
│   ├── classic/          # CSS recreating the current look
│   │   └── main.css
│   └── redesign/         # new design system
│       └── main.css
├── lib/
│   ├── theme.ts          # reads THEME env var, exports layout/component resolver
│   └── video.ts          # YouTube/Vimeo URL → embed iframe utility
└── assets/               # images and documents (from cbfs-wbu.4 export)
```

## Theme Switching

```typescript
// src/lib/theme.ts
// Re-exports the active layout as a static import — Astro resolves at build time
import ClassicLayout from '../layouts/classic/BaseLayout.astro';
import RedesignLayout from '../layouts/redesign/BaseLayout.astro';

const theme = import.meta.env.THEME || 'redesign';
export const Layout = theme === 'classic' ? ClassicLayout : RedesignLayout;
```

Each page file uses a single static import — Astro's bundler dead-code-eliminates the unused theme at build time:

```astro
---
// src/pages/events/[season]/[slug].astro
import { Layout } from '../../../lib/theme';
// ... data fetching is identical regardless of theme
---
<Layout title={entry.data.title}>
  <!-- page content uses theme-specific components -->
</Layout>
```

The same pattern applies to theme-specific components — `src/lib/theme.ts` re-exports the active Navbar, Footer, EventCard, etc.

**Deployment:** Build twice with different `THEME` values for review:
- `THEME=classic astro build` → deploy to `classic.blackfreedomstudies.org` or a Netlify preview URL
- `THEME=redesign astro build` → deploy to `redesign.blackfreedomstudies.org` or a Netlify preview URL

## Classic Theme

### Design Principles
- Structurally faithful to the current site
- Same layout: top navbar with 4 links, content area, footer with social/contact/sponsors
- Rebuilt with modern CSS (CSS Grid/Flexbox) instead of Bootstrap 3
- Same color palette and Open Sans typography
- Font Awesome icons preserved (via CDN or local subset)
- Better responsive behavior than the original
- Dropped: jQuery, Modernizr, IE conditionals, Shareaholic, inline scripts

### Pages

**Homepage**
- Hero image with news article overlay (2 latest news items)
- Intro body text below

**Events Index** (`/events/`)
- List of seasons, each expandable/linked to show events
- Seasons sorted reverse chronologically

**Season Page** (`/events/spring-2025`)
- List of events in this season with dates and titles
- Links to individual event pages

**Event Detail** (`/events/spring-2025/event-slug`)
- Date header, title
- Book cover grid
- Description
- Speakers section with headshots, names, affiliations, bios, social links
- Video recording embed (if present)
- Primary resources (if present)
- Eventbrite registration link (if future event)

**News Index/Detail** (`/news/`, `/news/2024/slug`)
- Chronological listing with banner images
- Detail page with banner (+ caption), body, tags

**Speakers Index/Detail** (`/speakers/`, `/speakers/slug`)
- Grid/list of all speakers with headshots and affiliations
- Detail page with full bio, social links, events they've appeared at

**Resources Index** (`/resources/`)
- Listing of all resources grouped by type
- No detail pages — resources were never individually routable in the current site. Videos and external resources link out directly; primary documents download directly.

**Static Pages** (`/about`, `/cbfs-syllabus`, `/neh-seminar-2015`)
- Simple body content pages
- **NEH Seminar 2015** is an exception: the original used a `sectionedContent` Matrix with 13 blocks (HeaderImage, Summary, Text Section). The migration flattens these into structured Markdown with headings and images. The page template should render Markdown content with no special handling — the structure is preserved in the Markdown itself.

## Redesign Theme

### Design Principles
- Academic foundation with bold editorial flair
- Strong typographic hierarchy: serif headings (Playfair Display or Source Serif Pro), clean sans-serif body (Inter or Source Sans Pro)
- Color palette: deep navy/black, warm accent color (gold or terracotta), cream/white backgrounds
- Bold section headers with horizontal rules or color block dividers
- Generous whitespace, clear visual rhythm
- Schomburg Center / CUNY branding integrated naturally
- Event pages are the editorial centerpiece

### Pages

**Homepage**
- Full-width hero with a striking image, site title overlay
- "Upcoming" or "Latest" event featured prominently
- Recent news below
- Brief intro text about the series

**Events Index** (`/events/`)
- Visual timeline or grid of seasons
- Each season card shows a representative image, date range, event count

**Season Page** (`/events/spring-2025`)
- Season header with date range
- Event cards in a grid or editorial list layout
- Each card shows date, title, speaker count, book cover thumbnails

**Event Detail** (`/events/spring-2025/event-slug`)
- Large-format header with date and title
- Book cover grid with larger, more prominent display
- Description set in readable, editorial typography
- Speaker cards: photo, name, affiliation, bio — laid out as a magazine-style feature
- Video embed with responsive container
- Primary resources styled as a curated reading list

**News Index/Detail**
- Magazine-style listing with banner images and date badges
- Detail with prominent banner, caption, rich body typography

**Speakers Index** (`/speakers/`)
- Filterable grid of speaker cards with headshots
- Search/filter by name or affiliation

**Speaker Detail** (`/speakers/slug`)
- Profile page with photo, bio, all events they've participated in (reverse chronological)

**Resources Index** (`/resources/`)
- Categorized listing: Videos, Documents, External Resources
- Visual distinction between resource types

**Static Pages**
- Clean editorial layouts with generous typography

## Shared Components

### VideoEmbed (`src/components/shared/VideoEmbed.astro`)
Replaces Craft's `VideoEmbedUtility` plugin. Accepts either:
- A YouTube/Vimeo URL → extracts video ID, renders responsive `<iframe>`
- Raw embed HTML → renders directly via `set:html`

### SEOHead (`src/components/shared/SEOHead.astro`)
Generates `<title>`, `<meta>` description, Open Graph tags. Replaces the manual OG tags in the current `_layout.html`.

### ShareLinks (`src/components/shared/ShareLinks.astro`)
Simple share links (Twitter, Facebook, email) replacing Shareaholic.

## Third-Party Services

| Service | Decision | Notes |
|---------|----------|-------|
| Disqus | Drop | Low usage on academic sites, adds JS bloat |
| Shareaholic | Drop | Replace with simple share links component |
| Google Analytics | Drop | Migrate to privacy-friendly analytics or GA4 at user's discretion |
| Eventbrite | Keep | Plain URL links in event frontmatter, rendered as buttons |
| Font Awesome | Keep (subset) | Used for social icons — load only needed glyphs |
| Google Fonts | Keep | Open Sans for classic, Playfair Display + Inter for redesign |

## URL Structure

Preserved from current site to maintain SEO (matches content model spec):

| Pattern | Page |
|---------|------|
| `/` | Homepage |
| `/about` | About |
| `/cbfs-syllabus` | CBFS Syllabus |
| `/neh-seminar-2015` | NEH Seminar 2015 |
| `/events/` | Events index |
| `/events/{season}` | Season page |
| `/events/{season}/{slug}` | Event detail |
| `/news/` | News index |
| `/news/{year}/{slug}` | News detail |
| `/speakers/` | Speakers index |
| `/speakers/{slug}` | Speaker detail |
| `/resources/` | Resources index (no detail pages — matches current site) |

## Decap CMS Admin

Decap CMS config at `public/admin/config.yml`:
- Accessible at `/admin/`
- Git Gateway backend (Netlify Identity or GitHub OAuth)
- Collections matching the 5 content types
- Relation widgets for cross-references (speakers on events, etc.)
- Image widgets pointing to `src/assets/` subdirectories
- Markdown editor for body content
