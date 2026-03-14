#!/usr/bin/env python3
"""Export Craft CMS content to Astro markdown files."""

import subprocess
import json
import os
import re
import html
from pathlib import Path

SSH_HOST = "blackfreedomstudies.org"
DB_USER = "craft"
DB_PASS = "AwAybiaj0"
DB_NAME = "craft"

CONTENT_DIR = Path("src/content")
ASSETS_DIR = Path("src/assets")


def query_with_headers(sql: str) -> list[dict]:
    """Run a SQL query via SSH using XML output for reliable parsing."""
    # Use --xml output to avoid TSV parsing issues with embedded tabs/newlines
    result = subprocess.run(
        ["ssh", SSH_HOST, f"mysql -u {DB_USER} -p'{DB_PASS}' {DB_NAME} --xml -e \"{sql}\""],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        # Filter out the password warning
        lines = [l for l in stderr.split('\n') if 'password' not in l.lower() and l.strip()]
        if lines:
            print(f"  SQL error: {'; '.join(lines)}")
        return []

    import xml.etree.ElementTree as ET
    try:
        root = ET.fromstring(result.stdout)
    except ET.ParseError:
        print(f"  XML parse error")
        return []

    rows = []
    for row_el in root.findall('.//row'):
        row_dict = {}
        for field_el in row_el.findall('field'):
            name = field_el.get('name', '')
            # NULL fields have xsi:nil="true" attribute
            if field_el.get('{http://www.w3.org/2001/XMLSchema-instance}nil') == 'true':
                row_dict[name] = 'NULL'
            else:
                row_dict[name] = field_el.text or ''
        rows.append(row_dict)
    return rows


def html_to_markdown(html_str: str) -> str:
    """Simple HTML to markdown conversion."""
    if not html_str or html_str == "NULL":
        return ""
    text = html_str
    # Paragraphs
    text = re.sub(r'<p\b[^>]*>', '\n\n', text)
    text = re.sub(r'</p>', '', text)
    # Line breaks
    text = re.sub(r'<br\s*/?>', '\n', text)
    # Bold
    text = re.sub(r'<(?:strong|b)>(.*?)</(?:strong|b)>', r'**\1**', text, flags=re.DOTALL)
    # Italic
    text = re.sub(r'<(?:em|i)>(.*?)</(?:em|i)>', r'*\1*', text, flags=re.DOTALL)
    # Links
    text = re.sub(r'<a\s+href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.DOTALL)
    # Headers
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n# \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', text, flags=re.DOTALL)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', text, flags=re.DOTALL)
    # Lists
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1', text, flags=re.DOTALL)
    text = re.sub(r'</?[ou]l[^>]*>', '', text)
    # Images
    text = re.sub(r'<img\s+[^>]*src="([^"]*)"[^>]*/?\s*>', r'![](\1)', text)
    # Blockquotes
    text = re.sub(r'<blockquote[^>]*>(.*?)</blockquote>', lambda m: '\n'.join('> ' + l for l in m.group(1).strip().split('\n')), text, flags=re.DOTALL)
    # Strip remaining tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode entities
    text = html.unescape(text)
    # Clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def sanitize_slug(slug: str) -> str:
    """Make a filesystem-safe slug."""
    return re.sub(r'[^a-z0-9-]', '-', slug.lower()).strip('-')


def null(val: str) -> str | None:
    """Convert SQL NULL to Python None."""
    return None if val == "NULL" or val == "\\N" or not val else val


def yaml_str(val: str) -> str:
    """Escape a string for YAML."""
    if not val:
        return '""'
    if any(c in val for c in ':"{}[]&*?|>!%@`\n'):
        escaped = val.replace('\\', '\\\\').replace('"', '\\"')
        return f'"{escaped}"'
    return f'"{val}"'


def export_speakers():
    """Export speakers to src/content/speakers/."""
    print("Exporting speakers...")
    outdir = CONTENT_DIR / "speakers"
    outdir.mkdir(parents=True, exist_ok=True)

    rows = query_with_headers(
        "SELECT e.id, ei.slug, el.enabled, c.title, "
        "c.field_affiliation, c.field_twitter, c.field_email, "
        "c.field_homepage, c.field_bio "
        "FROM craft_entries e "
        "JOIN craft_elements el ON e.id = el.id "
        "JOIN craft_elements_i18n ei ON ei.elementId = el.id "
        "JOIN craft_content c ON c.elementId = el.id "
        "JOIN craft_entrytypes et ON e.typeId = et.id "
        "WHERE et.handle = 'speakers' AND el.enabled = 1 "
        "ORDER BY c.title"
    )

    # Get speaker images via relations
    img_rows = query_with_headers(
        "SELECT r.sourceId, af.filename, aso.handle AS source_handle "
        "FROM craft_relations r "
        "JOIN craft_fields f ON r.fieldId = f.id "
        "JOIN craft_assetfiles af ON r.targetId = af.id "
        "JOIN craft_assetsources aso ON af.sourceId = aso.id "
        "WHERE f.handle = 'image' AND r.sourceId IN ("
        "  SELECT e.id FROM craft_entries e "
        "  JOIN craft_entrytypes et ON e.typeId = et.id "
        "  WHERE et.handle = 'speakers'"
        ")"
    )
    img_map = {}
    for row in img_rows:
        img_map[row['sourceId']] = f"../../assets/{row['source_handle']}/{row['filename']}"

    count = 0
    if rows:
        print(f"  DEBUG keys: {list(rows[0].keys())}")
        print(f"  DEBUG row0: {rows[0]}")
    for row in rows:
        slug = sanitize_slug(row.get('slug', row.get('id', 'unknown')))
        name = row.get('title', '')
        if not name or name == 'NULL':
            continue

        lines = ["---"]
        lines.append(f"name: {yaml_str(name)}")
        aff = null(row.get('field_affiliation'))
        if aff:
            lines.append(f"affiliation: {yaml_str(aff)}")
        if row['id'] in img_map:
            lines.append(f"image: {yaml_str(img_map[row['id']])}")
        email = null(row.get('field_email'))
        if email:
            lines.append(f"email: {yaml_str(email)}")
        twitter = null(row.get('field_twitter'))
        if twitter:
            lines.append(f"twitter: {yaml_str(twitter)}")
        homepage = null(row.get('field_homepage'))
        if homepage:
            lines.append(f"homepage: {yaml_str(homepage)}")
        lines.append("---")

        bio = html_to_markdown(row.get('field_bio', ''))
        lines.append("")
        lines.append(bio)

        (outdir / f"{slug}.md").write_text("\n".join(lines) + "\n")
        count += 1

    print(f"  Exported {count} speakers")


def export_news():
    """Export news to src/content/news/."""
    print("Exporting news...")
    outdir = CONTENT_DIR / "news"
    outdir.mkdir(parents=True, exist_ok=True)

    rows = query_with_headers(
        "SELECT e.id, ei.slug, e.postDate, c.title, c.field_body "
        "FROM craft_entries e "
        "JOIN craft_elements el ON e.id = el.id "
        "JOIN craft_elements_i18n ei ON ei.elementId = el.id "
        "JOIN craft_content c ON c.elementId = el.id "
        "JOIN craft_entrytypes et ON e.typeId = et.id "
        "WHERE et.handle = 'news' AND el.enabled = 1 "
        "ORDER BY e.postDate DESC"
    )

    # Get image banners from matrix
    banner_rows = query_with_headers(
        "SELECT mb.ownerId, mc.field_image_caption AS field_caption, af.filename, aso.handle AS source_handle "
        "FROM craft_matrixblocks mb "
        "JOIN craft_matrixcontent_imagebanner mc ON mc.elementId = mb.id "
        "JOIN craft_relations r ON r.sourceId = mb.id "
        "JOIN craft_assetfiles af ON r.targetId = af.id "
        "JOIN craft_assetsources aso ON af.sourceId = aso.id "
        "JOIN craft_fields f ON r.fieldId = f.id "
        "WHERE f.handle = 'imageasset'"
    )
    banner_map = {}
    for row in banner_rows:
        banner_map[row['ownerId']] = {
            'image': f"../../assets/{row['source_handle']}/{row['filename']}",
            'caption': null(row.get('field_caption', ''))
        }

    # Get tags
    tag_rows = query_with_headers(
        "SELECT r.sourceId, c.title AS name "
        "FROM craft_relations r "
        "JOIN craft_fields f ON r.fieldId = f.id "
        "JOIN craft_content c ON c.elementId = r.targetId "
        "WHERE f.handle = 'tags'"
    )
    tag_map: dict[str, list[str]] = {}
    for row in tag_rows:
        tag_map.setdefault(row['sourceId'], []).append(row['name'])

    count = 0
    for row in rows:
        slug = sanitize_slug(row['slug'])
        title = row.get('title', '')
        if not title or title == 'NULL':
            continue

        date = row.get('postDate', '')[:10]  # YYYY-MM-DD

        lines = ["---"]
        lines.append(f"title: {yaml_str(title)}")
        lines.append(f"date: {date}")
        banner = banner_map.get(row['id'])
        if banner:
            lines.append(f"image: {yaml_str(banner['image'])}")
            if banner.get('caption'):
                lines.append(f"imageCaption: {yaml_str(banner['caption'])}")
        tags = tag_map.get(row['id'], [])
        if tags:
            lines.append("tags:")
            for tag in tags:
                lines.append(f"  - {yaml_str(tag)}")
        lines.append("---")

        body = html_to_markdown(row.get('field_body', ''))
        lines.append("")
        lines.append(body)

        (outdir / f"{slug}.md").write_text("\n".join(lines) + "\n")
        count += 1

    print(f"  Exported {count} news entries")


def export_resources():
    """Export resources to src/content/resources/."""
    print("Exporting resources...")
    outdir = CONTENT_DIR / "resources"
    outdir.mkdir(parents=True, exist_ok=True)

    # Entry type handle → resourceType mapping
    type_map = {
        'videoRecording': 'video',
        'primaryDocuments': 'document',
        'externalResource': 'external',
        'resources': None,  # use dropdown value
    }

    rows = query_with_headers(
        "SELECT e.id, ei.slug, et.handle AS type_handle, "
        "c.title, c.field_videoEmbedCode, c.field_sourceUrl, "
        "c.field_authorship, c.field_publicationDate, "
        "c.field_description, c.field_body, c.field_date, "
        "c.field_resourceType "
        "FROM craft_entries e "
        "JOIN craft_elements el ON e.id = el.id "
        "JOIN craft_elements_i18n ei ON ei.elementId = el.id "
        "JOIN craft_content c ON c.elementId = el.id "
        "JOIN craft_entrytypes et ON e.typeId = et.id "
        "JOIN craft_sections s ON e.sectionId = s.id "
        "WHERE s.handle = 'resources' AND el.enabled = 1 "
        "ORDER BY c.title"
    )

    # Get document assets
    doc_rows = query_with_headers(
        "SELECT r.sourceId, af.filename, aso.handle AS source_handle "
        "FROM craft_relations r "
        "JOIN craft_fields f ON r.fieldId = f.id "
        "JOIN craft_assetfiles af ON r.targetId = af.id "
        "JOIN craft_assetsources aso ON af.sourceId = aso.id "
        "WHERE f.handle = 'document'"
    )
    doc_map = {}
    for row in doc_rows:
        doc_map[row['sourceId']] = f"/assets/{row['source_handle']}/{row['filename']}"

    # Get tags
    tag_rows = query_with_headers(
        "SELECT r.sourceId, c.title AS name "
        "FROM craft_relations r "
        "JOIN craft_fields f ON r.fieldId = f.id "
        "JOIN craft_content c ON c.elementId = r.targetId "
        "WHERE f.handle = 'tags'"
    )
    tag_map: dict[str, list[str]] = {}
    for row in tag_rows:
        tag_map.setdefault(row['sourceId'], []).append(row['name'])

    count = 0
    for row in rows:
        slug = sanitize_slug(row['slug'])
        title = row.get('title', '')
        if not title or title == 'NULL':
            continue

        th = row.get('type_handle', '')
        if th in type_map and type_map[th] is not None:
            resource_type = type_map[th]
        else:
            dropdown = null(row.get('field_resourceType'))
            resource_type = dropdown.lower() if dropdown else 'external'

        lines = ["---"]
        lines.append(f"title: {yaml_str(title)}")
        lines.append(f"resourceType: {resource_type}")
        source_url = null(row.get('field_sourceUrl'))
        if source_url:
            lines.append(f"sourceUrl: {yaml_str(source_url)}")
        embed = null(row.get('field_videoEmbedCode'))
        if embed:
            lines.append(f"videoEmbedCode: {yaml_str(embed)}")
        doc = doc_map.get(row['id'])
        if doc:
            lines.append(f"document: {yaml_str(doc)}")
        authorship = null(row.get('field_authorship'))
        if authorship:
            lines.append(f"authorship: {yaml_str(authorship)}")
        pub_date = null(row.get('field_publicationDate'))
        if pub_date:
            lines.append(f"publicationDate: {yaml_str(pub_date)}")
        date = null(row.get('field_date'))
        if date:
            lines.append(f"date: {date[:10]}")
        tags = tag_map.get(row['id'], [])
        if tags:
            lines.append("tags:")
            for tag in tags:
                lines.append(f"  - {yaml_str(tag)}")
        lines.append("---")

        body_html = null(row.get('field_description')) or null(row.get('field_body')) or ''
        body = html_to_markdown(body_html)
        lines.append("")
        lines.append(body)

        (outdir / f"{slug}.md").write_text("\n".join(lines) + "\n")
        count += 1

    print(f"  Exported {count} resources")


def export_events():
    """Export events to src/content/events/."""
    print("Exporting events...")
    outdir = CONTENT_DIR / "events"
    outdir.mkdir(parents=True, exist_ok=True)

    # First get seasons to map parent → season info
    season_rows = query_with_headers(
        "SELECT e.id, c.field_seasonYear, c.field_seasonPart "
        "FROM craft_entries e "
        "JOIN craft_content c ON c.elementId = e.id "
        "JOIN craft_entrytypes et ON e.typeId = et.id "
        "WHERE et.handle = 'seasons'"
    )
    season_map = {}
    for row in season_rows:
        season_map[row['id']] = {
            'year': row['field_seasonYear'],
            'part': row['field_seasonPart'].lower() if row.get('field_seasonPart') else 'spring',
        }

    # Get events
    event_rows = query_with_headers(
        "SELECT e.id, ei.slug, c.title, c.field_date, c.field_description, "
        "c.field_eventbrite "
        "FROM craft_entries e "
        "JOIN craft_elements el ON e.id = el.id "
        "JOIN craft_elements_i18n ei ON ei.elementId = el.id "
        "JOIN craft_content c ON c.elementId = el.id "
        "JOIN craft_entrytypes et ON e.typeId = et.id "
        "WHERE et.handle = 'events' AND el.enabled = 1 "
        "ORDER BY c.field_date"
    )

    # Get parent via structureelements (nested set: parent is one level up)
    parent_rows = query_with_headers(
        "SELECT child_se.elementId AS child_id, parent_se.elementId AS parent_id "
        "FROM craft_structureelements child_se "
        "JOIN craft_structureelements parent_se "
        "  ON parent_se.structureId = child_se.structureId "
        "  AND parent_se.lft < child_se.lft "
        "  AND parent_se.rgt > child_se.rgt "
        "  AND parent_se.level = child_se.level - 1 "
        "WHERE child_se.elementId IS NOT NULL AND parent_se.elementId IS NOT NULL"
    )
    parent_map = {}
    for row in parent_rows:
        parent_map[row['child_id']] = row['parent_id']

    # Get speaker relations
    speaker_rows = query_with_headers(
        "SELECT r.sourceId, ei.slug AS speaker_slug "
        "FROM craft_relations r "
        "JOIN craft_fields f ON r.fieldId = f.id "
        "JOIN craft_elements_i18n ei ON ei.elementId = r.targetId "
        "WHERE f.handle = 'speakers' "
        "ORDER BY r.sortOrder"
    )
    speaker_map: dict[str, list[str]] = {}
    for row in speaker_rows:
        speaker_map.setdefault(row['sourceId'], []).append(sanitize_slug(row['speaker_slug']))

    # Get video relations
    video_rows = query_with_headers(
        "SELECT r.sourceId, ei.slug AS resource_slug "
        "FROM craft_relations r "
        "JOIN craft_fields f ON r.fieldId = f.id "
        "JOIN craft_elements_i18n ei ON ei.elementId = r.targetId "
        "WHERE f.handle = 'video' "
        "ORDER BY r.sortOrder"
    )
    video_map = {}
    for row in video_rows:
        video_map[row['sourceId']] = sanitize_slug(row['resource_slug'])

    # Get primary resource relations
    pr_rows = query_with_headers(
        "SELECT r.sourceId, ei.slug AS resource_slug "
        "FROM craft_relations r "
        "JOIN craft_fields f ON r.fieldId = f.id "
        "JOIN craft_elements_i18n ei ON ei.elementId = r.targetId "
        "WHERE f.handle = 'primaryResources' "
        "ORDER BY r.sortOrder"
    )
    pr_map: dict[str, list[str]] = {}
    for row in pr_rows:
        pr_map.setdefault(row['sourceId'], []).append(sanitize_slug(row['resource_slug']))

    count = 0
    for row in event_rows:
        slug = sanitize_slug(row['slug'])
        title = row.get('title', '')
        if not title or title == 'NULL':
            continue

        date = null(row.get('field_date'))
        if not date:
            continue
        date = date[:10]

        # Get season from parent
        parent_id = parent_map.get(row['id'])
        season = season_map.get(parent_id, {'year': '2024', 'part': 'spring'})

        lines = ["---"]
        lines.append(f"title: {yaml_str(title)}")
        lines.append(f"date: {date}")
        lines.append(f"seasonYear: {season['year']}")
        lines.append(f"seasonPart: {season['part']}")
        eventbrite = null(row.get('field_eventbrite'))
        if eventbrite:
            lines.append(f"eventbrite: {yaml_str(eventbrite)}")
        speakers = speaker_map.get(row['id'], [])
        if speakers:
            lines.append("speakers:")
            for s in speakers:
                lines.append(f"  - {yaml_str(s)}")
        else:
            lines.append("speakers: []")
        lines.append("books: []")  # Book images need separate asset handling
        video = video_map.get(row['id'])
        if video:
            lines.append(f"video: {yaml_str(video)}")
        prs = pr_map.get(row['id'], [])
        if prs:
            lines.append("primaryResources:")
            for pr in prs:
                lines.append(f"  - {yaml_str(pr)}")
        lines.append("---")

        desc = html_to_markdown(row.get('field_description', ''))
        lines.append("")
        lines.append(desc)

        (outdir / f"{slug}.md").write_text("\n".join(lines) + "\n")
        count += 1

    print(f"  Exported {count} events")


def export_pages():
    """Export static pages to src/content/pages/."""
    print("Exporting pages...")
    outdir = CONTENT_DIR / "pages"
    outdir.mkdir(parents=True, exist_ok=True)

    # Singles: Homepage, About, CBFS Syllabus, NEH Seminar 2015
    singles = [
        ('homepage', 'homepage'),
        ('about', 'about'),
        ('cbfsSyllabus', 'cbfs-syllabus'),
        ('nehSeminar2015', 'neh-seminar-2015'),
    ]

    for section_handle, slug in singles:
        rows = query_with_headers(
            f"SELECT c.title, c.field_heading, c.field_body "
            f"FROM craft_entries e "
            f"JOIN craft_elements el ON e.id = el.id "
            f"JOIN craft_content c ON c.elementId = el.id "
            f"JOIN craft_sections s ON e.sectionId = s.id "
            f"WHERE s.handle = '{section_handle}' AND el.enabled = 1 "
            f"LIMIT 1"
        )
        if not rows:
            print(f"  Skipping {section_handle} — no data")
            continue

        row = rows[0]
        title = row.get('title', slug)
        if title == 'NULL':
            title = slug

        lines = ["---"]
        lines.append(f"title: {yaml_str(title)}")
        heading = null(row.get('field_heading'))
        if heading:
            lines.append(f"heading: {yaml_str(heading)}")
        lines.append("---")

        body = html_to_markdown(row.get('field_body', ''))
        lines.append("")
        lines.append(body)

        (outdir / f"{slug}.md").write_text("\n".join(lines) + "\n")
        print(f"  Exported {slug}")


def download_assets():
    """Download all assets from the server."""
    print("Downloading assets...")
    # Asset paths are relative to /var/www/ based on craft_assetsources
    sources = {
        'bookcovers': '/var/www/images/bookcovers/',
        'speakers': '/var/www/images/speakers/',
        'graphics': '/var/www/images/graphics/',
        'events': '/var/www/images/events/',
        'archive': '/var/www/images/archive/',
        'documents': '/var/www/assets/documents/',
    }
    for name, remote_path in sources.items():
        local_dir = ASSETS_DIR / name
        local_dir.mkdir(parents=True, exist_ok=True)
        print(f"  Downloading {name} from {remote_path}...")
        result = subprocess.run(
            ["scp", "-r", f"root@{SSH_HOST}:{remote_path}.", f"{local_dir}/"],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode != 0:
            # Try public_html path
            result = subprocess.run(
                ["scp", "-r", f"root@{SSH_HOST}:/var/www/public_html/{name}/.", f"{local_dir}/"],
                capture_output=True, text=True, timeout=300
            )
        print(f"    Done: {len(list(local_dir.iterdir()))} files")


if __name__ == "__main__":
    # Remove test placeholder files
    for f in (CONTENT_DIR / "events").glob("test-*.md"):
        f.unlink()
    for f in (CONTENT_DIR / "speakers").glob("test-*.md"):
        f.unlink()
    for f in (CONTENT_DIR / "resources").glob("test-*.md"):
        f.unlink()
    for f in (CONTENT_DIR / "news").glob("test-*.md"):
        f.unlink()

    export_speakers()
    export_news()
    export_resources()
    export_events()
    export_pages()
    download_assets()
    print("\nDone!")
