# Craft CMS Content Audit — Design Spec

**Issue:** `cbfs-wbu.1` — Audit existing Craft CMS site content and structure
**Epic:** `cbfs-wbu` — Migrate blackfreedomstudies.org from Craft CMS

## Context

blackfreedomstudies.org is the site for Conversations in Black Freedom Studies, a monthly roundtable discussion series at the Schomburg Center featuring authors and experts in Black history. The site runs Craft CMS 2.9.1, self-hosted on DigitalOcean. Content is primarily past events, a few static pages (About, Contact), infrequent announcements, and YouTube video links.

We have full admin panel access and SSH/database access to the server.

## Approach

Database-first audit: SSH into the DigitalOcean server, dump the MySQL database and pull the template/plugin directories locally, then analyze everything from the local copies. The site is small enough that a full dump is fast and gives a single source of truth.

## Steps

### 1. Pull data from server

- SSH into the DigitalOcean droplet
- `mysqldump` the full Craft database to a local SQL file
- Copy `craft/templates/` locally (template files define page types and layout)
- Copy `craft/plugins/` locally (to identify custom functionality)
- Copy `craft/config/` locally (routes, general config, db config structure)
- Asset source config lives in the database (`craft_assetsources`), but paths may contain environment variable tags (e.g., `{basePath}`) resolved in `craft/config/general.php` — check both

### 2. Analyze sections and entry types

Query the database to document all content structures:

- `craft_sections` — list all sections (channel, structure, single) with URL formats
- `craft_entrytypes` — entry types within each section
- `craft_fieldlayouts` + `craft_fieldlayoutfields` + `craft_fieldlayouttabs` — which fields appear on which entry types, grouped by tab
- `craft_fields` — all field definitions with type, handle, and settings
- `craft_elements_i18n` — holds slugs, locale, and per-locale enabled status (required for accurate URL mapping)
- `craft_globals` / `craft_globalsets` — site-wide content (footer text, social links, contact info, meta defaults)

Expected sections based on site purpose:
- Events / Roundtables (channel or structure)
- Announcements / News (channel)
- Static pages (singles: About, Contact, Home)

### 3. Inventory content volume

Count actual content to understand migration scale:

- Entries per section, broken down by status: live vs. pending vs. expired vs. disabled (derived from `craft_elements.enabled` + `craft_entries.postDate`/`expiryDate`)
- Check `craft_entrydrafts` and `craft_entryversions` for orphaned/unsaved drafts
- Total assets (files/images) with size breakdown
- Categories and tags (if used)
- Users (admin accounts, author accounts)
- Matrix blocks: query `craft_matrixblocktypes` to identify block types, then query corresponding `craft_matrixcontent_{fieldHandle}` tables to count instances
- Relational field data (entries linking to entries, entries linking to assets) via `craft_relations`

### 4. Map URL structure and templates

- Read `craft/config/routes.php` for custom routes
- Extract section URL format settings from `craft_sections` (e.g., `events/{slug}`)
- Walk `craft/templates/` directory tree to identify:
  - Layout templates (base layouts, includes, partials)
  - Section/entry type templates (mapped to sections)
  - Special templates (404, search, etc.)
- Produce a URL map: pattern -> template -> content type

### 5. Catalog plugins

- Query `craft_plugins` table for installed plugins and versions (distinguish active vs. disabled via `enabled` flag)
- Cross-reference with `craft/plugins/` directory contents
- For each plugin, document:
  - What it does
  - Whether it's essential (affects content or routing) or cosmetic
  - Whether its functionality needs to be replicated in the new platform

### 6. Document asset storage

- Identify asset sources from `craft_assetsources` table
  - Local filesystem path, or S3/CDN configuration
- Count files per source
- Approximate total size (query filesystem or `craft_assetfiles` table)
- Note any image transforms defined in `craft_assettransforms`

### 7. Write audit document

Compile all findings into `docs/audit/craft-cms-content-audit.md` with sections:

1. **Site overview** — purpose, tech stack, hosting
2. **Content model** — sections, entry types, fields (with types and relationships)
3. **Content inventory** — counts and volume
4. **URL structure** — route map
5. **Plugins** — list with migration impact notes
6. **Assets** — storage, volume, transforms
7. **Migration considerations** — anything notable for downstream tasks

## Output

A single audit document at `docs/audit/craft-cms-content-audit.md` that directly informs:
- `cbfs-wbu.2` — Select target platform and tech stack
- `cbfs-wbu.3` — Design content model for new platform
- `cbfs-wbu.4` — Export content from Craft CMS

## Assumptions

- Craft 2.9.1 database uses `craft_` table prefix (standard default)
- The site is small: likely <100 entries, <500 assets
- No complex e-commerce, user registration, or membership features
- Video content is hosted on YouTube (linked, not self-hosted)
