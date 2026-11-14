// Renders the cut-out collage from manifest-wide.json and manifest-tall.json
// into public/images/collage. `--colour all|figures|none` chooses what is
// printed in colour (default figures: lettering in black and white, figures in
// their own colour). `--out <dir>` writes somewhere else, for comparisons.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { here, root, cutPiece } from './pieces.mjs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const COLOUR = arg('--colour', 'figures');
const OUT = arg('--out', path.join(root, 'public/images/collage'));
const pieces = new Map(JSON.parse(await fs.readFile(path.join(here, 'pieces.json'), 'utf8')).map((p) => [p.id, p]));
await fs.mkdir(OUT, { recursive: true });

for (const [name, widths] of [['wide', [2400, 1600, 1000]], ['tall', [1200, 750]]]) {
  const m = JSON.parse(await fs.readFile(path.join(here, `manifest-${name}.json`), 'utf8'));
  const pad = 600;
  const layers = [];
  for (const e of [...m.pieces].sort((a, b) => a.z - b.z)) {
    const p = pieces.get(e.piece);
    if (!p) { console.warn(`unknown piece ${e.piece}`); continue; }
    const gray = COLOUR === 'none' ? true : COLOUR === 'all' ? false : e.gray;
    const { data } = await cutPiece(p, e.w, { gray });
    const { data: turned, info } = await sharp(data).rotate(e.rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true });
    layers.push({ input: turned, left: Math.round(e.x - info.width / 2) + pad, top: Math.round(e.y - info.height / 2) + pad });
  }
  const sheet = await sharp({ create: { width: m.width + pad * 2, height: m.height + pad * 2, channels: 3, background: m.background } }).composite(layers).png().toBuffer();
  const full = await sharp(sheet).extract({ left: pad, top: pad, width: m.width, height: m.height }).png().toBuffer();
  for (const w of widths) {
    const file = path.join(OUT, `covers-${name}-${w}.webp`);
    await sharp(full).resize(w).webp({ quality: 60, effort: 6 }).toFile(file);
    console.log(`${path.relative(root, file)}  ${((await fs.stat(file)).size / 1024).toFixed(0)} KB`);
  }
}
