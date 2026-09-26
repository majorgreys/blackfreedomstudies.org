## CSS Theme Isolation

Astro imports all CSS from `.astro` components regardless of build-time conditionals. To keep classic and redesign theme CSS separate:

- **CSS lives in `public/css/`** — `classic.css` and `redesign.css` are plain files, not Astro imports
- **`BaseLayout.astro` loads one via `<link>`** — chosen at build time by `THEME` env var (`classic` or `redesign`)
- **Page templates use `isClassic` ternary** for markup — import `{ Layout, isClassic }` from `src/lib/theme`
- **Never `import` CSS in `.astro` files** — it will leak into both themes

## Beads (bd) Workflow

Use `bd` (Homebrew, v1.3.0+) for ALL task tracking. Do NOT use TodoWrite, TaskCreate, or markdown files for tracking work. Load the `beads:beads` skill; the beads plugin's SessionStart hook runs `bd prime`.

Issues live in an embedded Dolt database (`.beads/embeddeddolt/`, gitignored) and sync through the Dolt remote on GitHub (`sync.remote` in `.beads/config.yaml`) — not through JSONL in git.

### Session Close Protocol
Before saying "done" or "complete", run this checklist:
1. `git status` — check what changed
2. `git add <files>` — stage code changes
3. `git commit -m "..."` — commit code
4. `bd dolt push` — push issue changes to the Dolt remote
5. `git push` — push code to remote

### Core Commands
- `bd ready` — find work with no blockers
- `bd show <id>` — full issue context
- `bd create --title="..." --description="..." --type=task|bug|feature|chore|docs --priority=2` — new issue (priority: 0-4, 0=critical)
- `bd update <id> --claim` — claim work
- `bd close <id> --reason="..."` — mark complete
- `bd dep add <issue> <depends-on>` — add dependency
- `bd blocked` — show blocked issues
- `bd dolt pull` / `bd dolt push` — sync issues with the Dolt remote

### Context Recovery
Run `bd prime` after context compaction or `/clear` to re-inject workflow context and see current work status.
