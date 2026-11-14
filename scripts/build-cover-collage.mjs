// Builds the homepage collage from every book cover in src/assets/bookcovers.
//
// Each cover gives one fragment: a piece cut out on straight, uneven edges (as
// if with scissors), turned a little, and pasted over its neighbours at a
// varied scale. The result is printed in black and white so the red title can
// sit on top of it.
//
// Run `npm run collage` after adding covers. The output in public/images/collage
// is committed; the site build does not run this script.
//
// The layout is seeded from the list of file names, so the same set of covers
// always gives the same collage.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src/assets/bookcovers');
const OUT = path.join(root, 'public/images/collage');

// Two compositions: a wide one for desktop and a tall one for phones.
const LAYOUTS = [
  { name: 'covers-wide', width: 2400, height: 1000, cols: 31, rows: 12, widths: [2400, 1600, 1000] },
  { name: 'covers-tall', width: 1200, height: 1300, cols: 17, rows: 22, widths: [1200, 750] },
];

// Small seeded random number generator (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// A scissor cut: a four- to six-sided shape with corners pulled in unevenly
function cutShape(w, h, rand) {
  const inset = (max) => rand() * max;
  const pts = [
    [inset(w * 0.16), inset(h * 0.12)],
    [w - inset(w * 0.16), inset(h * 0.12)],
    [w - inset(w * 0.14), h - inset(h * 0.12)],
    [inset(w * 0.14), h - inset(h * 0.12)],
  ];
  // Sometimes add an extra corner along the top or bottom edge
  if (rand() < 0.45) pts.splice(1, 0, [w * (0.35 + rand() * 0.3), inset(h * 0.06)]);
  if (rand() < 0.35) pts.splice(pts.length - 1, 0, [w * (0.35 + rand() * 0.3), h - inset(h * 0.06)]);
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

async function fragment(file, targetW, rand) {
  const img = sharp(file, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  // Take most of the cover, biased to the upper part where the title usually is
  const cw = Math.round(meta.width * (0.62 + rand() * 0.38));
  const ch = Math.round(Math.min(meta.height, cw * (0.75 + rand() * 0.6)));
  const left = Math.round((meta.width - cw) * rand());
  const top = Math.round((meta.height - ch) * rand() * 0.6);
  const w = Math.round(targetW);
  const h = Math.max(40, Math.round((w * ch) / cw));
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><polygon points="${cutShape(w, h, rand)}" fill="#fff"/></svg>`,
  );
  const cut = await img
    .extract({ left, top, width: cw, height: ch })
    .resize(w, h, { fit: 'fill' })
    .grayscale()
    .normalise()
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const angle = (rand() - 0.5) * 26;
  return sharp(cut).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true });
}

async function build(layout, files) {
  const rand = rng(hash(files.join('|') + layout.name));
  const { width, height, cols, rows } = layout;
  const cellW = width / cols;
  const cellH = height / rows;
  // One cell per cover, shuffled, so the whole sheet is covered
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }

  const layers = [];
  for (let i = 0; i < files.length; i++) {
    const [c, r] = cells[i % cells.length];
    // Varied scale: mostly mid-sized pieces, a few large and a few small
    const roll = rand();
    const scale = roll < 0.12 ? 3.6 + rand() * 1.6 : roll < 0.6 ? 2.3 + rand() * 1.1 : 1.5 + rand() * 0.8;
    const { data, info } = await fragment(path.join(SRC, files[i]), cellW * scale, rand);
    const cx = (c + 0.5 + (rand() - 0.5) * 0.9) * cellW;
    const cy = (r + 0.5 + (rand() - 0.5) * 0.9) * cellH;
    layers.push({ data, info, left: Math.round(cx - info.width / 2), top: Math.round(cy - info.height / 2), big: scale > 3.5 });
  }
  // Large pieces go down first so the small ones are not buried
  layers.sort((a, b) => Number(b.big) - Number(a.big));

  // Sharp cannot place a layer partly off the sheet, so work on a padded sheet
  const pad = 400;
  const sheet = await sharp({ create: { width: width + pad * 2, height: height + pad * 2, channels: 3, background: '#1a1a1a' } })
    .composite(layers.map((l) => ({ input: l.data, left: l.left + pad, top: l.top + pad })))
    .png()
    .toBuffer();
  const full = await sharp(sheet).extract({ left: pad, top: pad, width, height }).png().toBuffer();

  for (const w of layout.widths) {
    const out = path.join(OUT, `${layout.name}-${w}.webp`);
    await sharp(full).resize(w).webp({ quality: 58, effort: 6 }).toFile(out);
    const { size } = await fs.stat(out);
    console.log(`${path.relative(root, out)}  ${(size / 1024).toFixed(0)} KB`);
  }
}

const files = (await fs.readdir(SRC)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
await fs.mkdir(OUT, { recursive: true });
console.log(`${files.length} covers`);
for (const layout of LAYOUTS) await build(layout, files);
