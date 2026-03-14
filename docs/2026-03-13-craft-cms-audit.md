# Craft CMS Content Audit — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a comprehensive audit of the blackfreedomstudies.org Craft CMS 2.9.1 site, documenting all content types, fields, entries, assets, templates, plugins, and URL structure.

**Architecture:** SSH into the DigitalOcean server to pull down the database dump, templates, plugins, and config. Import the dump into a local MySQL instance and run structured queries. Analyze templates from the local copy. Compile all findings into a single audit document.

**Tech Stack:** MySQL (local), SSH/SCP, Craft CMS 2.9.1 database schema

**Spec:** `docs/2026-03-13-craft-cms-audit-design.md`
**Issue:** `cbfs-wbu.1`

---

## Chunk 1: Pull Data From Server

### Task 1: Get server connection details and database credentials

**Prerequisites:** User must provide SSH access details for the DigitalOcean droplet.

- [ ] **Step 1: SSH into the server and locate the Craft installation**

```bash
ssh <user>@<host>
# Find the Craft root directory
find / -name "craft" -type d -path "*/craft/app" 2>/dev/null | head -5
```

Verify: you should see a path like `/var/www/blackfreedomstudies.org/craft/app`. The **web root** is the parent of the `craft/` directory (e.g., `/var/www/blackfreedomstudies.org/`). All `<webroot>` references below use this path.

- [ ] **Step 2: Read database credentials from Craft's db.php**

```bash
cat <webroot>/craft/config/db.php
```

Expected output: PHP array with `server`, `user`, `password`, `database`, `tablePrefix` keys. Note the `tablePrefix` — the spec assumes `craft_` but verify.

- [ ] **Step 3: Verify database connectivity**

```bash
mysql -u <user> -p<password> -e "SHOW TABLES;" <database> | head -20
```

Expected: a list of tables starting with the prefix (e.g., `craft_sections`, `craft_entries`, etc.).

### Task 2: Dump database and pull files locally

**Files:**
- Create: `data/dump/craft_db.sql` (database dump)
- Create: `data/templates/` (copy of `craft/templates/`)
- Create: `data/plugins/` (copy of `craft/plugins/`)
- Create: `data/config/` (copy of `craft/config/`)

- [ ] **Step 1: Create local directory structure**

```bash
mkdir -p data/{dump,templates,plugins,config}
```

- [ ] **Step 2: Dump the MySQL database**

```bash
ssh <user>@<host> "mysqldump -u <dbuser> -p'<dbpass>' <dbname> --single-transaction" > data/dump/craft_db.sql
```

Verify: `wc -l data/dump/craft_db.sql` should return a non-trivial number of lines. `head -20 data/dump/craft_db.sql` should show MySQL dump header.

- [ ] **Step 3: Pull templates, plugins, and config via SCP**

```bash
scp -r <user>@<host>:<webroot>/craft/templates/ data/templates/
scp -r <user>@<host>:<webroot>/craft/plugins/ data/plugins/
scp -r <user>@<host>:<webroot>/craft/config/ data/config/
```

Verify: `ls data/templates/` should show `.html` or `.twig` files. `ls data/config/` should show `db.php`, `general.php`, `routes.php`.

- [ ] **Step 4: Commit the raw data pull**

```bash
git add data/
git commit -m "[cbfs-wbu.1] chore: pull Craft CMS database dump, templates, plugins, and config from server"
```

### Task 3: Import database dump into local MySQL

- [ ] **Step 1: Create a local database and import the dump**

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS cbfs_audit;"
mysql -u root cbfs_audit < data/dump/craft_db.sql
```

- [ ] **Step 2: Verify import — check table count and prefix**

```bash
mysql -u root cbfs_audit -e "SHOW TABLES;" | head -30
```

Expected: tables with `craft_` prefix (or whatever prefix was found in step 1.2). Count should be 40-60+ tables for a standard Craft 2 install.

- [ ] **Step 3: Quick sanity check — count entries**

```bash
mysql -u root cbfs_audit -e "SELECT COUNT(*) AS total_entries FROM craft_entries;"
```

Expected: a number (likely <100 for this small site). If 0 or error, something went wrong with the import.

---

## Chunk 2: Analyze Content Model

### Task 4: Document sections and entry types

**Files:**
- Create: `data/queries/sections.sql`

- [ ] **Step 1: Query all sections**

```sql
-- data/queries/sections.sql
SELECT
  s.id,
  s.name,
  s.handle,
  s.type,
  s.enableVersioning,
  sl.urlFormat,
  sl.nestedUrlFormat
FROM craft_sections s
LEFT JOIN craft_sections_i18n sl ON s.id = sl.sectionId
ORDER BY s.type, s.name;
```

```bash
mysql -u root cbfs_audit < data/queries/sections.sql
```

Record output: section names, handles, types (channel/structure/single), and URL formats.

- [ ] **Step 2: Query entry types per section**

```sql
SELECT
  s.name AS section_name,
  et.id AS entrytype_id,
  et.name AS entrytype_name,
  et.handle AS entrytype_handle,
  et.hasTitleField,
  et.titleLabel,
  et.fieldLayoutId
FROM craft_entrytypes et
JOIN craft_sections s ON et.sectionId = s.id
ORDER BY s.name, et.sortOrder;
```

Record: how many entry types per section and their field layout IDs (used in next step).

### Task 5: Document all fields and field layouts

**Files:**
- Create: `data/queries/fields.sql`

- [ ] **Step 1: Query all fields**

```sql
SELECT
  f.id,
  f.groupId,
  fg.name AS group_name,
  f.name,
  f.handle,
  f.type,
  f.translatable,
  f.settings
FROM craft_fields f
LEFT JOIN craft_fieldgroups fg ON f.groupId = fg.id
ORDER BY fg.name, f.name;
```

Record: every field with its type (e.g., `RichText`, `PlainText`, `Assets`, `Entries`, `Matrix`, `Tags`, `Categories`, etc.) and settings JSON.

- [ ] **Step 2: Map fields to entry types via field layouts**

```sql
SELECT
  s.name AS section_name,
  et.name AS entrytype_name,
  flt.name AS tab_name,
  f.name AS field_name,
  f.handle AS field_handle,
  f.type AS field_type,
  flf.required,
  flf.sortOrder
FROM craft_fieldlayoutfields flf
JOIN craft_fieldlayouttabs flt ON flf.layoutId = flt.layoutId AND flf.tabId = flt.id
JOIN craft_fields f ON flf.fieldId = f.id
JOIN craft_entrytypes et ON et.fieldLayoutId = flf.layoutId
JOIN craft_sections s ON et.sectionId = s.id
ORDER BY s.name, et.name, flt.sortOrder, flf.sortOrder;
```

This is the core output: which fields appear on which content types, grouped by tab.

- [ ] **Step 3: Query global sets — schema**

```sql
SELECT
  gs.name AS globalset_name,
  gs.handle AS globalset_handle,
  flt.name AS tab_name,
  f.name AS field_name,
  f.handle AS field_handle,
  f.type AS field_type
FROM craft_globalsets gs
JOIN craft_fieldlayoutfields flf ON gs.fieldLayoutId = flf.layoutId
JOIN craft_fieldlayouttabs flt ON flf.tabId = flt.id
JOIN craft_fields f ON flf.fieldId = f.id
ORDER BY gs.name, flt.sortOrder, flf.sortOrder;
```

Record: global field structure grouped by tab.

- [ ] **Step 3b: Query global sets — actual content values**

```sql
SELECT gs.name, gs.handle, c.*
FROM craft_globalsets gs
JOIN craft_elements el ON gs.id = el.id
JOIN craft_content c ON c.elementId = el.id
ORDER BY gs.name;
```

Content columns are named `field_{handle}` in Craft 2. Record the actual values (footer text, social links, etc.) — these need to be migrated, not just the schema.

- [ ] **Step 4: Check for Matrix fields and block types**

```sql
SELECT
  f.name AS matrix_field_name,
  f.handle AS matrix_field_handle,
  mbt.name AS block_type_name,
  mbt.handle AS block_type_handle
FROM craft_matrixblocktypes mbt
JOIN craft_fields f ON mbt.fieldId = f.id
ORDER BY f.name, mbt.sortOrder;
```

If results are non-empty, note the Matrix field handles — their content lives in `craft_matrixcontent_{handle}` tables.

- [ ] **Step 5: Commit query files**

```bash
git add data/queries/
git commit -m "[cbfs-wbu.1] chore: add content model SQL queries"
```

---

## Chunk 3: Inventory Content Volume

### Task 6: Count entries by section and status

**Files:**
- Create: `data/queries/inventory.sql`

- [ ] **Step 1: Count entries per section with status breakdown**

```sql
SELECT
  s.name AS section_name,
  s.type AS section_type,
  COUNT(*) AS total,
  SUM(CASE WHEN el.enabled = 1 AND e.postDate <= NOW()
            AND (e.expiryDate IS NULL OR e.expiryDate > NOW()) THEN 1 ELSE 0 END) AS live,
  SUM(CASE WHEN el.enabled = 1 AND e.postDate > NOW() THEN 1 ELSE 0 END) AS pending,
  SUM(CASE WHEN el.enabled = 1 AND e.expiryDate IS NOT NULL
            AND e.expiryDate <= NOW() THEN 1 ELSE 0 END) AS expired,
  SUM(CASE WHEN el.enabled = 0 THEN 1 ELSE 0 END) AS disabled
FROM craft_entries e
JOIN craft_elements el ON e.id = el.id
JOIN craft_sections s ON e.sectionId = s.id
GROUP BY s.name, s.type
ORDER BY s.name;
```

- [ ] **Step 2: Check for drafts and versions**

```sql
SELECT 'drafts' AS type, COUNT(*) AS count FROM craft_entrydrafts
UNION ALL
SELECT 'versions', COUNT(*) FROM craft_entryversions;
```

- [ ] **Step 3: Count assets**

```sql
SELECT
  aso.name AS source_name,
  COUNT(*) AS file_count
FROM craft_assetfiles af
JOIN craft_assetsources aso ON af.sourceId = aso.id
GROUP BY aso.name;
```

- [ ] **Step 4: Count categories, tags, and users**

```sql
SELECT 'categories' AS type, COUNT(*) AS count FROM craft_categories
UNION ALL
SELECT 'tags', COUNT(*) FROM craft_tags
UNION ALL
SELECT 'users', COUNT(*) FROM craft_users;
```

- [ ] **Step 5: Count relations (entries linking to other content)**

```sql
SELECT
  f.name AS field_name,
  f.type AS field_type,
  COUNT(*) AS relation_count
FROM craft_relations r
JOIN craft_fields f ON r.fieldId = f.id
GROUP BY f.name, f.type
ORDER BY relation_count DESC;
```

- [ ] **Step 6: If Matrix fields exist, count block instances**

```bash
# Dynamically discover Matrix content tables and count rows in each
mysql -u root cbfs_audit -N -e "
  SELECT CONCAT('SELECT ''', f.handle, ''' AS field_handle, COUNT(*) AS blocks FROM craft_matrixcontent_', f.handle, ';')
  FROM craft_fields f WHERE f.type = 'Matrix'" \
  | while read q; do mysql -u root cbfs_audit -e "$q"; done
```

If Task 5 Step 4 returned no rows, skip this step.

- [ ] **Step 7: Commit inventory queries**

```bash
git add data/queries/inventory.sql
git commit -m "[cbfs-wbu.1] chore: add content inventory SQL queries"
```

---

## Chunk 4: Templates, Plugins, Assets, and URL Structure

### Task 7: Map URL structure and templates

**Files:**
- Create: `data/analysis/url-map.md`

- [ ] **Step 1: Read routes.php for custom routes**

```bash
cat data/config/routes.php
```

Record any custom route definitions.

- [ ] **Step 2: Extract URL formats from sections query (Task 4 Step 1)**

The `urlFormat` column from `craft_sections_i18n` gives the URL pattern per section (e.g., `events/{slug}`). Combine with section type to build the URL map.

- [ ] **Step 3: Walk the templates directory**

```bash
find data/templates/ -type f | sort
```

For each template file, note:
- Is it a layout/base template (extends nothing, defines blocks)?
- Is it a section template (matches a section handle)?
- Is it an include/partial (referenced by other templates via `{% include %}`)?
- Is it a special page (404, search, index)?

- [ ] **Step 4: Query slugs from craft_elements_i18n**

```sql
SELECT
  s.name AS section_name,
  ei.slug,
  ei.uri,
  ei.enabled
FROM craft_elements_i18n ei
JOIN craft_elements el ON ei.elementId = el.id
JOIN craft_entries e ON e.id = el.id
JOIN craft_sections s ON e.sectionId = s.id
WHERE el.enabled = 1
ORDER BY s.name, ei.slug;
```

This gives the actual published URLs. Compare against the URL format patterns to verify consistency.

- [ ] **Step 4b: Check for locale-level disabled entries**

```sql
SELECT
  s.name AS section_name,
  COUNT(*) AS locale_disabled_count
FROM craft_elements_i18n ei
JOIN craft_elements el ON ei.elementId = el.id
JOIN craft_entries e ON e.id = el.id
JOIN craft_sections s ON e.sectionId = s.id
WHERE el.enabled = 1 AND ei.enabled = 0
GROUP BY s.name;
```

If any rows returned, these entries are element-enabled but suppressed at the locale level — document them as an edge case for migration.

- [ ] **Step 5: Write url-map.md summarizing the URL structure**

Format:
```
| URL Pattern          | Section         | Template          | Example URI        |
|----------------------|-----------------|-------------------|--------------------|
| /                    | Homepage        | index.html        | /                  |
| /events/{slug}       | Events          | events/_entry.html| /events/feb-2024   |
| ...                  | ...             | ...               | ...                |
```

### Task 8: Catalog plugins

**Files:**
- Create: `data/analysis/plugins.md`

- [ ] **Step 1: Query installed plugins**

```sql
SELECT
  p.class AS plugin_class,
  p.version,
  p.enabled,
  p.installDate
FROM craft_plugins p
ORDER BY p.enabled DESC, p.class;
```

- [ ] **Step 2: Cross-reference with plugins directory**

```bash
ls -la data/plugins/
```

For each plugin, note its name and look up what it does (Craft 2 plugin directory or README in the plugin folder).

- [ ] **Step 3: Write plugins.md with migration impact assessment**

For each plugin:
- Name and version
- Active or disabled
- What it does
- Migration impact: `must-replicate` / `nice-to-have` / `not-needed`

### Task 9: Document asset storage

**Files:**
- Create: `data/analysis/assets.md`

- [ ] **Step 1: Query asset sources and their configuration**

```sql
SELECT
  id,
  name,
  handle,
  type,
  settings
FROM craft_assetsources;
```

The `settings` JSON contains the filesystem path or S3 config. If it contains `{basePath}` or similar tags, check `data/config/general.php` for the resolved value.

- [ ] **Step 2: Count files and estimate total size**

```sql
SELECT
  aso.name AS source_name,
  COUNT(*) AS file_count,
  SUM(af.size) AS total_bytes,
  ROUND(SUM(af.size) / 1024 / 1024, 2) AS total_mb
FROM craft_assetfiles af
JOIN craft_assetsources aso ON af.sourceId = aso.id
GROUP BY aso.name;
```

- [ ] **Step 3: List image transforms**

```sql
SELECT
  name,
  handle,
  width,
  height,
  mode,
  format,
  quality
FROM craft_assettransforms;
```

- [ ] **Step 4: Write assets.md**

Document: source type (local/S3), file count, total size, transforms in use.

- [ ] **Step 5: Commit analysis files**

```bash
git add data/analysis/ data/queries/
git commit -m "[cbfs-wbu.1] chore: add URL map, plugin catalog, and asset documentation"
```

---

## Chunk 5: Compile Audit Document

### Task 10: Write the final audit document

**Files:**
- Create: `docs/audit/craft-cms-content-audit.md`

- [ ] **Step 1: Create the audit document directory**

```bash
mkdir -p docs/audit
```

- [ ] **Step 2: Write the audit document**

Compile all findings from Tasks 4–9 into `docs/audit/craft-cms-content-audit.md` with these sections:

1. **Site Overview** — Conversations in Black Freedom Studies, Schomburg Center, Craft 2.9.1, DigitalOcean hosting
2. **Content Model** — sections table, entry types table, fields-per-entry-type table (from Task 5 Step 2), global sets (from Task 5 Step 3), Matrix blocks if any
3. **Content Inventory** — entry counts by section/status (from Task 6), asset counts, categories/tags/users, relations, drafts/versions
4. **URL Structure** — URL map table (from Task 7), custom routes, template hierarchy
5. **Plugins** — plugin table with migration impact (from Task 8)
6. **Assets** — storage config, file counts, total size, transforms (from Task 9)
7. **Migration Considerations** — any surprises, complexity flags, or recommendations for downstream tasks (`cbfs-wbu.2`, `.3`, `.4`)

- [ ] **Step 3: Verify completeness against the spec**

Cross-check every item in the spec's "Steps" section (1–7) against the audit document. Every table, query, and analysis point should have a corresponding section in the document.

- [ ] **Step 4: Commit the audit document**

```bash
git add docs/audit/craft-cms-content-audit.md
git commit -m "[cbfs-wbu.1] feat: complete Craft CMS content audit for blackfreedomstudies.org"
```

- [ ] **Step 5: Close the issue**

```bash
ACTOR="${BR_ACTOR:-assistant}"
br close --actor "$ACTOR" cbfs-wbu.1 --reason "Audit complete. Document at docs/audit/craft-cms-content-audit.md" --json
br sync --flush-only
git add .beads/ && git commit -m "[cbfs-wbu.1] chore: close audit issue"
```
