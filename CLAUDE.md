## CSS Theme Isolation

Astro imports all CSS from `.astro` components regardless of build-time conditionals. To keep classic and redesign theme CSS separate:

- **CSS lives in `public/css/`** — `classic.css` and `redesign.css` are plain files, not Astro imports
- **`BaseLayout.astro` loads one via `<link>`** — chosen at build time by `THEME` env var (`classic` or `redesign`)
- **Page templates use `isClassic` ternary** for markup — import `{ Layout, isClassic }` from `src/lib/theme`
- **Never `import` CSS in `.astro` files** — it will leak into both themes

## Beads (br) Workflow

Use `br` for ALL task tracking. Do NOT use TodoWrite, TaskCreate, or markdown files for tracking work.

### Session Close Protocol
Before saying "done" or "complete", run this checklist:
1. `git status` — check what changed
2. `git add <files>` — stage code changes
3. `git commit -m "..."` — commit code
4. `git push` — push to remote

### Core Commands
- `br ready` — find work with no blockers
- `br create --title="..." --description="..." --type=task|bug|feature --priority=2` — new issue (priority: 0-4, 0=critical)
- `br update <id> --claim` — claim work
- `br close <id>` — mark complete
- `br dep add <issue> <depends-on>` — add dependency
- `br blocked` — show blocked issues
- `br sync --flush-only` — export DB to JSONL (then `git add .beads/ && git commit`)

### Context Recovery
Run `/br:prime` after context compaction or `/clear` to re-inject workflow context and see current work status.
