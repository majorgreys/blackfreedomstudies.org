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
// Two cutting styles:
//   npm run collage          straight scissor cuts, evenly spread
//   npm run collage:rough    hand work: wavering curved cuts, some pieces cut
//                            loosely round the busiest part of a cover, some
//                            torn with a ragged white paper edge, some where
//                            the scissors ran off into the jacket's margin,
//                            scattered with no grid
//
// The layout is seeded from the list of file names, so the same set of covers
// always gives the same collage.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STYLE = process.argv.includes('--style') ? process.argv[process.argv.indexOf('--style') + 1] : 'straight';

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

// ── Rough style ──────────────────────────────────────────────────────────────

// A closed outline that wavers the way a hand-held cut does: a rounded shape
// (an oval for `roundness` near 2, a soft-cornered rectangle for higher values)
// pushed in and out by a few slow waves and a little jitter. `torn` gives the
// span of the outline, if any, that is ragged.
function handOutline(w, h, roundness, rand, torn) {
  const n = torn ? 120 : 46;
  const phase = [rand() * 6.283, rand() * 6.283, rand() * 6.283];
  const amp = [0.04 + rand() * 0.06, 0.02 + rand() * 0.04, 0.008 + rand() * 0.014];
  // A hand cut is rarely square to the image: lean the whole shape a little
  const skew = (rand() - 0.5) * 0.22;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 6.283;
    const c = Math.cos(t), s = Math.sin(t);
    const r = 1 / Math.pow(Math.pow(Math.abs(c), roundness) + Math.pow(Math.abs(s), roundness), 1 / roundness);
    let wob = 1 + amp[0] * Math.sin(2 * t + phase[0]) + amp[1] * Math.sin(5 * t + phase[1]) + amp[2] * Math.sin(11 * t + phase[2]);
    const inTear = torn && ((t - torn.from + 6.283) % 6.283) < torn.span;
    wob += (rand() - 0.5) * (inTear ? 0.075 : 0.008);
    const x = w / 2 + (c * r * wob + s * skew) * (w / 2) * 0.82;
    const y = h / 2 + s * r * wob * (h / 2) * 0.86;
    pts.push([x, y, inTear]);
  }
  return pts;
}

// A piece cut with several passes of the scissors: sharp corners where two cuts
// meet, and edges between them that waver and bow instead of running straight.
function cutOutline(w, h, rand, torn) {
  const m = 0.04;
  const corners = [
    [w * (m + rand() * 0.14), h * (m + rand() * 0.14)],
    [w * (1 - m - rand() * 0.14), h * (m + rand() * 0.14)],
    [w * (1 - m - rand() * 0.14), h * (1 - m - rand() * 0.14)],
    [w * (m + rand() * 0.14), h * (1 - m - rand() * 0.14)],
  ];
  // Sometimes a corner is snipped off, or an extra cut makes a fifth side
  if (rand() < 0.4) { const i = Math.floor(rand() * 4); const a = corners[i], b = corners[(i + 1) % 4]; const t = 0.25 + rand() * 0.5; corners.splice(i + 1, 0, [a[0] + (b[0] - a[0]) * t + (rand() - 0.5) * w * 0.12, a[1] + (b[1] - a[1]) * t + (rand() - 0.5) * h * 0.12]); }
  const tornEdge = torn ? Math.floor(rand() * corners.length) : -1;
  const pts = [];
  const size = Math.min(w, h);
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    const isTorn = i === tornEdge || (torn && torn.span > 2.6 && i === (tornEdge + 1) % corners.length);
    const steps = isTorn ? Math.max(14, Math.round(len / 5)) : Math.max(8, Math.round(len / 14));
    const bow = (rand() - 0.5) * size * 0.07;            // the cut bows one way
    const wave = size * (0.006 + rand() * 0.012), freq = 1.5 + rand() * 2.5, ph = rand() * 6.283;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      let off = bow * Math.sin(Math.PI * t) + wave * Math.sin(t * freq * 6.283 + ph) + (rand() - 0.5) * size * 0.004;
      if (isTorn && k > 0) off += (rand() - 0.5) * size * 0.05;
      pts.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off, isTorn]);
    }
  });
  return pts;
}
const polyPath = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';

// Smooth closed curve through the points (Catmull-Rom); torn spans stay jagged
function outlinePath(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (p1[2] || p2[2]) { d += `L${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; continue; }
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

const PAPER = '#ebe7dd';

async function roughFragment(file, size, rand) {
  // What kind of cut: round a subject, a rough rectangle, or a sliver
  const roll = rand();
  const kind = roll < 0.3 ? 'round' : roll < 0.82 ? 'rect' : 'sliver';
  let w, h, roundness;
  if (kind === 'round') { w = size; h = size * (0.95 + rand() * 0.45); roundness = 2 + rand() * 0.9; }
  else if (kind === 'rect') { w = size; h = size * (0.6 + rand() * 0.9); roundness = 4 + rand() * 6; }
  else { const long = size * 1.5, thin = size * (0.28 + rand() * 0.2); [w, h] = rand() < 0.5 ? [long, thin] : [thin, long]; roundness = 5 + rand() * 6; }
  w = Math.round(w); h = Math.max(36, Math.round(h));

  // Let the scissors run off the picture into the jacket's margin on one side
  const offEdge = kind !== 'round' && rand() < 0.2;
  const iw = offEdge ? Math.round(w * (0.72 + rand() * 0.12)) : w;
  // The picture area is chosen where the cover is busiest (a face, the lettering)
  const picture = await sharp(file, { failOn: 'none' })
    .rotate()
    .resize(iw, h, { fit: 'cover', position: sharp.strategy.attention })
    .grayscale()
    .normalise()
    .png()
    .toBuffer();
  const base = await sharp({ create: { width: w, height: h, channels: 4, background: PAPER } })
    .composite([{ input: picture, left: offEdge && rand() < 0.5 ? w - iw : 0, top: 0 }])
    .png()
    .toBuffer();

  const torn = rand() < 0.28 ? { from: rand() * 6.283, span: 1.2 + rand() * 2.4 } : null;
  const round = kind === 'round';
  const pts = round ? handOutline(w, h, roundness, rand, torn) : cutOutline(w, h, rand, torn);
  const toPath = round ? outlinePath : polyPath;
  const svg = (inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${inner}</svg>`);
  let piece = await sharp(base).composite([{ input: svg(`<path d="${toPath(pts)}" fill="#fff"/>`), blend: 'dest-in' }]).png().toBuffer();

  if (torn) {
    // A torn edge shows the paper's white core: a ragged rim just outside the tear
    const cx = w / 2, cy = h / 2;
    const rim = pts.map(([x, y, t]) => {
      const out = t ? 1 + (0.02 + rand() * 0.045) : 1;
      return [cx + (x - cx) * out, cy + (y - cy) * out, t];
    });
    const paper = await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: svg(`<path d="${toPath(rim)}" fill="${PAPER}"/>`) }, { input: piece }])
      .png()
      .toBuffer();
    piece = paper;
  }
  // Mostly a slight tilt; now and then a piece pasted well off the square
  const angle = rand() < 0.14 ? (rand() - 0.5) * 140 : (rand() - 0.5) * 38;
  return sharp(piece).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true });
}

async function roughLayers(layout, files, rand) {
  const { width, height } = layout;
  const unit = Math.sqrt((width * height) / (2400 * 1000));
  // A few big pieces, a good number of middling ones, many small
  const sized = files.map((f) => {
    const roll = rand();
    const size = (roll < 0.07 ? 430 + rand() * 230 : roll < 0.42 ? 240 + rand() * 120 : 135 + rand() * 80) * unit;
    return { f, size };
  });
  // Big pieces go down first, with some disorder, as when working from a stack
  const order = new Map(sized.map((p) => [p, p.size * (0.35 + rand() * 1.3)]));
  sized.sort((a, b) => order.get(b) - order.get(a));
  const centres = [];
  const layers = [];
  for (const { f, size } of sized) {
    // No grid: try a few random spots and take the one furthest from earlier pieces
    let best = null, bestD = -1;
    for (let k = 0; k < 4; k++) {
      const x = rand() * width, y = rand() * height;
      let d = Infinity;
      for (const [cx, cy] of centres) d = Math.min(d, (x - cx) ** 2 + (y - cy) ** 2);
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    centres.push(best);
    const { data, info } = await roughFragment(path.join(SRC, f), size, rand);
    layers.push({ data, info, left: Math.round(best[0] - info.width / 2), top: Math.round(best[1] - info.height / 2) });
  }
  return layers;
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

  let layers = [];
  if (STYLE === 'rough') layers = await roughLayers(layout, files, rand);
  else for (let i = 0; i < files.length; i++) {
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
  const pad = 700;
  const sheet = await sharp({ create: { width: width + pad * 2, height: height + pad * 2, channels: 3, background: STYLE === 'rough' ? '#2b2926' : '#1a1a1a' } })
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
console.log(`${files.length} covers, ${STYLE} cuts`);
for (const layout of LAYOUTS) await build(layout, files);
