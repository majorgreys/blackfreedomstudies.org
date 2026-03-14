# Craft CMS Content Audit — blackfreedomstudies.org

**Date:** 2026-03-13
**Issue:** `cbfs-wbu.1`
**Epic:** `cbfs-wbu` — Migrate blackfreedomstudies.org from Craft CMS

---

## 1. Site Overview

**Purpose:** Website for Conversations in Black Freedom Studies (CBFS), a monthly roundtable discussion series at the Schomburg Center for Research in Black Culture featuring authors and experts in Black history. Co-sponsored by the CUNY Graduate Center.

**Tech Stack:**
- Craft CMS 2.9.1 (PHP, Yii 1.x)
- MySQL database (user: `craft`, db: `craft`, prefix: `craft_`)
- Bootstrap 3.2.0 frontend
- jQuery 1.11.1
- Twig templates
- Google Analytics (UA-53205754-1)
- Disqus comments on event pages
- Shareaholic social sharing
- Font Awesome icons
- Google Fonts (Open Sans)

**Hosting:** Self-hosted on DigitalOcean droplet, root SSH access. Web root at `/var/www/`. Craft installation at `/var/www/craft/`.

**Config:**
- `omitScriptNameInUrls: true`
- `maxUploadFileSize: 16MB`
- No custom routes defined in `routes.php`

---

## 2. Content Model

### Sections

| ID | Name | Handle | Type | URL Format | Nested URL Format |
|----|------|--------|------|------------|-------------------|
| 7 | About | about | single | `about` | — |
| 8 | CBFS Syllabus | cbfsSyllabus | single | `cbfs-syllabus` | — |
| 1 | Homepage | homepage | single | `__home__` | — |
| 6 | NEH Seminar 2015 | nehSeminar2015 | single | `neh-seminar-2015` | — |
| 2 | News | news | channel | `news/{postDate.year}/{slug}` | — |
| 3 | Events | events | structure | `events/{slug}` | `{parent.uri}/{slug}` |
| 5 | Resources | resources | structure | `resources/{slug}` | `{parent.uri}/{slug}` |
| 4 | Speakers | speakers | structure | `speakers/{slug}` | `{parent.uri}/{slug}` |

### Entry Types

| Section | Entry Type | Handle | Has Title | Title Label | Field Layout ID |
|---------|-----------|--------|-----------|-------------|-----------------|
| About | About | about | No | — | 37 |
| CBFS Syllabus | CBFS Syllabus | cbfsSyllabus | Yes | CBFS Syllabus | 98 |
| Events | Events | events | Yes | Title | 51 |
| Events | Seasons | seasons | Yes | Title | 95 |
| Homepage | Homepage | homepage | No | — | 38 |
| NEH Seminar 2015 | Summer 2015 Seminar | summer2015Seminar | No | — | 62 |
| News | News | news | Yes | Title | 84 |
| Resources | Primary Documents | primaryDocuments | Yes | Title | 49 |
| Resources | External Resource | externalResource | Yes | Title | 94 |
| Resources | Resources | resources | Yes | Title | 28 |
| Resources | Video recording | videoRecording | Yes | Title | 54 |
| Speakers | Speakers | speakers | Yes | Name | 20 |

### Fields by Entry Type

| Section | Entry Type | Tab | Field | Handle | Type | Required |
|---------|-----------|-----|-------|--------|------|----------|
| About | About | Tab 1 | Body | body | RichText | Yes |
| CBFS Syllabus | CBFS Syllabus | Tab 1 | Body | body | RichText | No |
| Events | Events | Tab 1 | Date | date | Date | Yes |
| Events | Events | Tab 1 | Description | description | RichText | No |
| Events | Events | Tab 1 | Books | books | Assets | Yes |
| Events | Events | Tab 1 | Speakers | speakers | Entries | No |
| Events | Events | Tab 1 | Eventbrite | eventbrite | PlainText | No |
| Events | Events | Tab 1 | Primary Resources | primaryResources | Entries | No |
| Events | Events | Tab 1 | Video | video | Entries | No |
| Events | Seasons | Tab 1 | Season Year | seasonYear | Number | Yes |
| Events | Seasons | Tab 1 | Season Part | seasonPart | Dropdown | Yes |
| Events | Seasons | Tab 1 | Body | body | RichText | No |
| Homepage | Homepage | Content | Heading | heading | PlainText | Yes |
| Homepage | Homepage | Content | Image | image | Assets | No |
| Homepage | Homepage | Content | Body | body | RichText | Yes |
| NEH Seminar 2015 | Summer 2015 Seminar | Tab 1 | Sectioned Content | sectionedContent | Matrix | No |
| News | News | Content | ImageBanner | imagebanner | Matrix | No |
| News | News | Content | Body | body | RichText | Yes |
| News | News | Content | Tags | tags | Tags | No |
| Resources | External Resource | Tab 1 | Resource Type | resourceType | Dropdown | Yes |
| Resources | External Resource | Tab 1 | Source URL | sourceUrl | PlainText | Yes |
| Resources | External Resource | Tab 1 | Publication date | publicationDate | PlainText | No |
| Resources | External Resource | Tab 1 | Description | description | RichText | No |
| Resources | External Resource | Tab 1 | Tags | tags | Tags | No |
| Resources | Primary Documents | Tab 1 | Document | document | Assets | Yes |
| Resources | Primary Documents | Tab 1 | Authorship | authorship | PlainText | No |
| Resources | Primary Documents | Tab 1 | Publication date | publicationDate | PlainText | No |
| Resources | Primary Documents | Tab 1 | Description | description | RichText | No |
| Resources | Video recording | Tab 1 | Video Embed Code | videoEmbedCode | PlainText | No |
| Resources | Video recording | Tab 1 | Source URL | sourceUrl | PlainText | No |
| Resources | Video recording | Tab 1 | Date | date | Date | No |
| Resources | Video recording | Tab 1 | Body | body | RichText | No |
| Resources | Video recording | Tab 1 | Tags | tags | Tags | No |
| Speakers | Speakers | Speakers | Affiliation | affiliation | PlainText | No |
| Speakers | Speakers | Speakers | Image | image | Assets | No |
| Speakers | Speakers | Speakers | Bio | bio | RichText | No |
| Speakers | Speakers | Speakers | Email | email | PlainText | No |
| Speakers | Speakers | Speakers | Twitter | twitter | PlainText | No |
| Speakers | Speakers | Speakers | Homepage | homepage | PlainText | No |

### Dropdown Options

**Resource Type** (`resourceType`): Text, Video, Image, Audio

**Season Part** (`seasonPart`): Fall, Spring, Special

### Global Sets

| Global Set | Handle | Fields |
|-----------|--------|--------|
| Graphics | graphics | Image (Assets) |

The Graphics global set contains a single image asset. Content query shows no text content stored — only an image reference. Footer text, social links, and contact info are **hardcoded in the `_layout.html` template**, not stored in globals.

### Matrix Fields

| Matrix Field | Handle | Block Types |
|-------------|--------|-------------|
| ImageBanner | imagebanner | Image |
| Sectioned Content | sectionedContent | HeaderImage, Summary, Text Section |

**ImageBanner** (used in News): Single block type with Image and Caption fields.
**Sectioned Content** (used in NEH Seminar 2015): Three block types for building rich page sections with headers, summaries, and text blocks.

### Relational Fields

Events link to:
- **Speakers** (Entries field → Speakers section)
- **Books** (Assets field → Book Covers source)
- **Video** (Entries field → Resources section, limit 1)
- **Primary Resources** (Entries field → Resources section)

---

## 3. Content Inventory

### Entries by Section and Status

| Section | Type | Total | Live | Pending | Expired | Disabled |
|---------|------|-------|------|---------|---------|----------|
| About | single | 1 | 1 | 0 | 0 | 0 |
| CBFS Syllabus | single | 1 | 1 | 0 | 0 | 0 |
| Events | structure | 139 | 138 | 0 | 0 | 1 |
| Homepage | single | 1 | 1 | 0 | 0 | 0 |
| NEH Seminar 2015 | single | 1 | 1 | 0 | 0 | 0 |
| News | channel | 52 | 52 | 0 | 0 | 0 |
| Resources | structure | 87 | 87 | 0 | 0 | 0 |
| Speakers | structure | 288 | 288 | 0 | 0 | 0 |
| **Total** | | **570** | **569** | **0** | **0** | **1** |

### Drafts and Versions

| Type | Count |
|------|-------|
| Drafts | 2 |
| Versions | 1,673 |

### Other Content

| Type | Count |
|------|-------|
| Categories | 3 |
| Tags | 12 |
| Users | 3 |

### Relations

| Field | Type | Count |
|-------|------|-------|
| Speakers | Entries | 374 |
| Books | Assets | 318 |
| Image | Assets | 297 |
| Video | Entries | 72 |
| ImageAsset | Assets | 43 |
| Tags | Tags | 14 |
| Primary Resources | Entries | 5 |
| Document | Assets | 3 |

### Matrix Blocks

| Field | Block Count |
|-------|-------------|
| imagebanner | 43 |
| sectionedcontent | 13 |

### Locale-Level Disabled Entries

None found — no entries are element-enabled but locale-disabled.

---

## 4. URL Structure

### URL Map

| URL Pattern | Section | Entry Type | Template | Example |
|-------------|---------|-----------|----------|---------|
| `/` | Homepage | Homepage | `index.html` | `/` |
| `/about` | About | About | `about.html` | `/about` |
| `/cbfs-syllabus` | CBFS Syllabus | CBFS Syllabus | — | `/cbfs-syllabus` |
| `/neh-seminar-2015` | NEH Seminar 2015 | Summer 2015 Seminar | `neh-seminar-2015.html` | `/neh-seminar-2015` |
| `/events/` | Events | — | `events/index.html` | `/events/` |
| `/events/{slug}` | Events | Seasons | `events/_entry.html` | `/events/spring-2025` |
| `/events/{season}/{slug}` | Events | Events | `events/_entry.html` | `/events/spring-2025/a-century-of-preserving...` |
| `/news/` | News | — | `news/index.html` | `/news/` |
| `/news/{year}/{slug}` | News | News | `news/_entry.html` | `/news/2024/cbfs-spring-2024` |
| `/resources/` | Resources | — | `resources/index.html` | `/resources/` |
| `/resources/{slug}` | Resources | * | — | `/resources/video-name` |
| `/speakers/` | Speakers | — | `speakers/index.html` | `/speakers/` |
| `/speakers/{slug}` | Speakers | Speakers | `speakers/_entry.html` | `/speakers/john-doe` |

### Template Hierarchy

```
_layout.html              ← Base layout (all pages extend this)
├── index.html            ← Homepage
├── about.html            ← About single
├── neh-seminar-2015.html ← NEH Seminar single
├── 404.html              ← Not found
├── events/
│   ├── index.html        ← Events listing
│   └── _entry.html       ← Event detail (handles both Events and Seasons entry types)
├── news/
│   ├── index.html        ← News listing
│   └── _entry.html       ← News article detail
├── resources/
│   └── index.html        ← Resources listing (no detail template)
└── speakers/
    ├── index.html        ← Speakers listing
    └── _entry.html       ← Speaker detail
```

### Custom Routes

None defined in `routes.php`.

---

## 5. Plugins

| Plugin | Version | Active | Purpose | Migration Impact |
|--------|---------|--------|---------|-----------------|
| Export | 0.5.10 | Yes | Export content data from Craft | `not-needed` — one-time admin tool |
| TheArchitect | 1.6.0 | Yes | Import/export field layouts and section structures | `not-needed` — admin/migration tool |
| UptimeRobot | 1.0.1 | Yes | Uptime monitoring integration | `not-needed` — monitoring, not content |
| VideoEmbedUtility | 1.0.0 | Yes | `|videoEmbed` Twig filter — converts YouTube/Vimeo URLs to embed iframes | `must-replicate` — used in event templates for video recordings |

**Key finding:** The `VideoEmbedUtility` plugin provides a `|videoEmbed` Twig filter used in `events/_entry.html` to render video recordings from YouTube/Vimeo URLs. This functionality must be replicated in the new platform.

---

## 6. Assets

### Asset Sources

| ID | Name | Handle | Type | Path | URL |
|----|------|--------|------|------|-----|
| 1 | Book Covers | bookCovers | Local | `images/bookcovers/` | `http://www.blackfreedomstudies.org/images/bookcovers/` |
| 2 | Speakers | speakers | Local | `images/speakers/` | `http://www.blackfreedomstudies.org/images/speakers/` |
| 3 | Archive | archive | Local | `images/archive/` | `http://www.blackfreedomstudies.org/images/archive/` |
| 4 | Event Photos | eventPhotos | Local | `images/events/` | `http://www.blackfreedomstudies.org/images/events/` |
| 5 | Graphics | graphics | Local | `images/graphics/` | `http://www.blackfreedomstudies.org/images/graphics/` |
| 6 | Documents | documents | Local | `assets/documents/` | `http://www.blackfreedomstudies.org/assets/documents/` |

All asset sources are **local filesystem** — no S3/CDN. Relative paths from web root.

### Asset Volume

| Source | Files | Size |
|--------|-------|------|
| Book Covers | 343 | 51.59 MB |
| Speakers | 296 | 66.84 MB |
| Graphics | 107 | 15.92 MB |
| Documents | 5 | 0.38 MB |
| Event Photos | 3 | 10.52 MB |
| Archive | 1 | 0.04 MB |
| **Total** | **755** | **145.29 MB** |

### Image Transforms

| Name | Handle | Width | Height | Mode | Quality |
|------|--------|-------|--------|------|---------|
| Thumb Center | thumbcc | 150 | — | crop | 82 |
| Event Banner Small | eventbannersmall | 150 | 150 | crop | 82 |
| Event Banner Large | eventbannerlarge | 400 | 200 | crop | 82 |
| Full Width | fullWidth | 800 | — | fit | 82 |
| Footer | footer | — | 80 | fit | — |
| Photo | photo | 300 | — | fit | 82 |
| Header | header | — | 150 | stretch | — |

---

## 7. Migration Considerations

### Complexity Assessment: Low-Medium

This is a straightforward content site with well-structured data. The main complexity is the volume of relational data (speakers ↔ events ↔ books ↔ resources).

### Key Findings

1. **Content is almost entirely live.** Only 1 disabled entry out of 570. No pending or expired entries. No locale issues. Clean dataset for migration.

2. **Events are the core content type.** 139 events with rich relational structure: each links to speakers, book cover images, video recordings, and primary resources. The event entry template is the most complex template.

3. **Speakers are the largest section** (288 entries) but structurally simple: name, affiliation, image, bio, email, twitter, homepage.

4. **Events use a nested structure.** Seasons (e.g., "Spring 2025") are parent entries; individual events are children. URLs reflect this: `/events/spring-2025/event-slug`.

5. **Video is linked, not hosted.** Video recordings are Resources entries (type: Video recording or External Resource) linked to Events via an Entries relation field. The `VideoEmbedUtility` plugin converts YouTube/Vimeo URLs to embeds.

6. **Footer/contact info is hardcoded** in `_layout.html`, not stored in the CMS. Twitter: @SchomburgCBFS, email: blackfreedomstudies@gmail.com, sponsors: Schomburg Center + CUNY Graduate Center.

7. **Third-party services to evaluate:**
   - Disqus comments (on event pages) — keep or drop?
   - Shareaholic social sharing — keep or drop?
   - Google Analytics (UA property) — needs migration to GA4
   - Eventbrite integration (registration links stored as plain text URLs)

8. **Assets are all local filesystem** (~145 MB total). Need to download from server and re-host. No CDN.

9. **Frontend is Bootstrap 3** with custom CSS. Old IE conditional comments, jQuery 1.x. Full frontend rebuild is expected.

10. **No custom routes, no complex config.** Simple `omitScriptNameInUrls` and upload size limit. No environment variable tags in asset paths.

### Recommendations for Downstream Tasks

- **`cbfs-wbu.2` (Tech Selection):** Site is read-heavy with infrequent updates. Strong candidate for static site generator. Content relationships (events ↔ speakers ↔ resources) need a data layer that supports relational queries.
- **`cbfs-wbu.3` (Content Modeling):** Start with Events as the central content type. Model Season → Event parent-child. Speakers and Resources are supporting types linked via relations.
- **`cbfs-wbu.4` (Content Export):** 570 entries + 755 assets. Small enough for a single export script. Key tables: `craft_content`, `craft_entries`, `craft_elements`, `craft_elements_i18n`, `craft_relations`, `craft_assetfiles`. The database dump is already saved locally at `data/dump/craft_db.sql`.
