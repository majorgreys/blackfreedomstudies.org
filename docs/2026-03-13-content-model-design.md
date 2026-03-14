# Content Model Design — blackfreedomstudies.org on Astro

**Issue:** `cbfs-wbu.3` — Design content model for new platform
**Epic:** `cbfs-wbu` — Migrate blackfreedomstudies.org from Craft CMS
**Stack:** Astro + Decap CMS + Netlify/Cloudflare Pages

## Context

Migrating blackfreedomstudies.org from Craft CMS 2.9.1 to Astro with Decap CMS. The audit (`docs/audit/craft-cms-content-audit.md`) documented 570 entries across 8 sections, 755 assets (~145 MB), and relational content linking events to speakers, books, videos, and resources.

Key decisions made during design:
- **Seasons are denormalized** onto events (`seasonYear` + `seasonPart` fields) rather than a separate collection. Seasons are lightweight (year + part + optional body) and don't justify a join.
- **Resources use a single collection** with a `resourceType` discriminator rather than three separate collections. Only 87 resources, fields overlap, and events link to resources generically.

## Content Collections

```
src/content/
├── events/          # 139 entries — core content type
├── speakers/        # 288 entries
├── resources/       # 87 entries (3 subtypes via discriminator)
├── news/            # 52 entries
└── pages/           # 4 singles (homepage, about, syllabus, neh-seminar)
```

### events

One `.md` file per event. The markdown body contains the event description (migrated from Craft's `description` RichText field).

```yaml
# frontmatter schema
title: string (required)
slug: string
date: date (required)
seasonYear: number (required)        # e.g. 2025
seasonPart: enum [fall, spring, special] (required)
eventbrite: string (optional)        # Eventbrite registration URL
speakers: reference[] → speakers     # links to speaker slugs
books: image[] (required in Craft, default [] for migration safety)  # book cover images
video: reference → resources (optional, limit 1)  # link to video resource
primaryResources: reference[] → resources (optional)
```

**Zod schema:**
```typescript
const events = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.date(),
    seasonYear: z.number().int().min(2013),
    seasonPart: z.enum(['fall', 'spring', 'special']),  // Craft stores as 'Fall'/'Spring'/'Special' — migration must lowercase
    eventbrite: z.string().url().optional(),
    speakers: z.array(reference('speakers')).default([]),
    books: z.array(image()).default([]),
    video: reference('resources').optional(),
    primaryResources: z.array(reference('resources')).default([]),
  }),
});
```

### speakers

One `.md` file per speaker. The markdown body contains the bio (migrated from Craft's `bio` RichText field).

```yaml
# frontmatter schema
name: string (required)              # used as display title
slug: string
affiliation: string (optional)
image: image (optional)              # speaker headshot
email: string (optional)
twitter: string (optional)           # handle without @
homepage: string (optional)          # URL
```

**Zod schema:**
```typescript
const speakers = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    name: z.string(),
    affiliation: z.string().optional(),
    image: image().optional(),
    email: z.string().email().optional(),
    twitter: z.string().optional(),
    homepage: z.string().url().optional(),
  }),
});
```

### resources

Single collection with `resourceType` discriminator. Three subtypes share overlapping fields. The markdown body contains the description or body text.

```yaml
# frontmatter schema
title: string (required)
slug: string
resourceType: enum [video, document, external, text, image, audio] (required)
sourceUrl: string (optional)          # YouTube/Vimeo URL or external link
videoEmbedCode: string (optional)     # raw embed HTML, video type only
document: string (optional)           # path to document file, document type only
authorship: string (optional)         # author attribution
publicationDate: string (optional)    # stored as string (not always a proper date)
tags: string[] (optional)
date: date (optional)                 # video recording date
```

**Zod schema:**
```typescript
const resources = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    resourceType: z.enum(['video', 'document', 'external', 'text', 'image', 'audio']),
    sourceUrl: z.string().url().optional(),
    videoEmbedCode: z.string().optional(),
    document: z.string().optional(),     // path string — Astro has no built-in non-image asset type; validated at migration time
    authorship: z.string().optional(),
    publicationDate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    date: z.date().optional(),
  }),
});
```

### news

One `.md` file per news post. The markdown body is the article content.

```yaml
# frontmatter schema
title: string (required)
slug: string
date: date (required)
image: image (optional)               # banner image
imageCaption: string (optional)       # caption for banner image (from Craft imagebanner Matrix)
tags: string[] (optional)
```

**Zod schema:**
```typescript
const news = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.date(),
    image: image().optional(),
    imageCaption: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});
```

### pages

Static single pages (Homepage, About, CBFS Syllabus, NEH Seminar 2015). The markdown body is the page content.

```yaml
# frontmatter schema
title: string (required)
slug: string
heading: string (optional)            # homepage only
image: image (optional)               # homepage only
```

**Zod schema:**
```typescript
const pages = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    heading: z.string().optional(),
    image: image().optional(),
  }),
});
```

## Season Pages

No collection needed. Season landing pages are generated dynamically by an Astro route:

```
src/pages/events/[season].astro
```

The `[season]` param is derived by grouping events on `seasonPart-seasonYear` (e.g., `spring-2025`, `fall-2024`). The route queries all events matching that season and renders them sorted by date.

`getStaticPaths()` builds the list of seasons from the events collection at build time.

## Assets

Images and documents stored in `src/assets/` mirroring the Craft asset source structure:

```
src/assets/
├── bookcovers/      # 343 files, 51.59 MB
├── speakers/        # 296 files, 66.84 MB
├── graphics/        # 107 files, 15.92 MB
├── events/          # 3 files, 10.52 MB
├── archive/         # 1 file, 0.04 MB
└── documents/       # 5 files, 0.38 MB
```

Astro's built-in `<Image>` component handles responsive image optimization, replacing Craft's 7 image transform definitions (thumbcc, eventbannersmall, eventbannerlarge, fullWidth, footer, photo, header).

## Global/Site Data

Footer content is hardcoded in Craft's `_layout.html` template. Keep it hardcoded in Astro's base layout component:
- Twitter: @SchomburgCBFS
- Email: blackfreedomstudies@gmail.com
- Sponsors: Schomburg Center + CUNY Graduate Center

The `Graphics` global set (single image) becomes a static asset reference in the layout.

## Decap CMS Configuration

Decap CMS config at `public/admin/config.yml` maps 1:1 to these collections:

| Collection | Decap Widget Notes |
|-----------|-------------------|
| events | Relation widget for speakers (search by name), image widget for books, date picker for date/season |
| speakers | Standard text/image fields |
| resources | Select widget for resourceType, conditional fields based on type |
| news | Standard text/image/date fields |
| pages | Simple body editor, limited to 4 files |

## Mapping from Craft CMS

| Craft Section | Craft Entry Type | Astro Collection | Notes |
|--------------|-----------------|-----------------|-------|
| Events | Events | events | seasonYear/seasonPart denormalized from parent Season |
| Events | Seasons | (none) | Dissolved into event fields + dynamic route |
| Speakers | Speakers | speakers | Direct 1:1 mapping |
| Resources | Video recording | resources | resourceType: video |
| Resources | Primary Documents | resources | resourceType: document |
| Resources | Resources (generic) | resources | resourceType: mapped from Craft `resourceType` dropdown value |
| Resources | External Resource | resources | resourceType: external |
| News | News | news | Direct 1:1 mapping |
| Homepage | Homepage | pages | slug: index |
| About | About | pages | slug: about |
| CBFS Syllabus | CBFS Syllabus | pages | slug: cbfs-syllabus |
| NEH Seminar 2015 | Summer 2015 Seminar | pages | slug: neh-seminar-2015, sectionedContent Matrix → markdown |

## URL Structure

Preserve existing URL patterns to maintain SEO and allow 1:1 redirects:

| Collection | URL Pattern | Astro Route |
|-----------|------------|-------------|
| events (seasons) | `/events/{season}` | `src/pages/events/[season].astro` |
| events (entries) | `/events/{season}/{slug}` | `src/pages/events/[season]/[slug].astro` |
| news | `/news/{year}/{slug}` | `src/pages/news/[year]/[slug].astro` |
| speakers | `/speakers/{slug}` | `src/pages/speakers/[slug].astro` |
| resources | `/resources/{slug}` | `src/pages/resources/[slug].astro` |
| pages | `/{slug}` | `src/pages/[slug].astro` or named files |

News URLs include the year from `postDate` to match the existing Craft pattern `/news/{postDate.year}/{slug}`.

## Video Embed Handling

Craft's `VideoEmbedUtility` plugin provided a `|videoEmbed` Twig filter. In Astro, this becomes a simple utility function or Astro component that converts YouTube/Vimeo URLs to responsive embed iframes. For resources with raw `videoEmbedCode`, render the HTML directly.
