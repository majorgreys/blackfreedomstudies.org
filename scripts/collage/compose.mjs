// Lays the reviewed pieces out and writes the layout to manifest-wide.json and
// manifest-tall.json. The manifests are the composition: each entry names a
// piece and gives its centre, width, rotation and layer. Edit them by hand to
// move, resize, add or remove a piece, then run `npm run collage:cutouts`.
// Running this script again rebuilds both manifests from the rules below and
// overwrites hand edits.
//
// The arrangement follows Barbara Jones-Hogu's print "Unite" (1971): a field of
// lettering fills the sheet, and the figures stand massed along the bottom and
// up the right side, in front of it. Title lettering runs in bands of very
// different heights. Figures are in three rows, groups behind and single
// figures in front, with a few large figures anchoring the right.
import fs from 'node:fs/promises';
import path from 'node:path';
import { here } from './pieces.mjs';

const pieces = JSON.parse(await fs.readFile(path.join(here, 'pieces.json'), 'utf8'));
const review = JSON.parse(await fs.readFile(path.join(here, 'review.json'), 'utf8'));
const detect = JSON.parse(await fs.readFile(path.join(here, 'detect.json'), 'utf8'));

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const aspectOf = (p) => (p.box[2] * detect[p.cover].w) / (p.box[3] * detect[p.cover].h);

const drop = new Set(review.drop), keepObj = new Set(review.keepObjects), anchorIds = review.anchors;
const seenText = new Set();
const titles = pieces.filter((p) => p.kind === 'title').filter((p) => { const k = p.text.toLowerCase().replace(/[^a-z]/g, ''); if (seenText.has(k)) return false; seenText.add(k); return true; });
const figures = pieces.filter((p) => p.kind === 'figure' && !drop.has(p.id) && !anchorIds.includes(p.id));
const objects = pieces.filter((p) => p.kind === 'object' && keepObj.has(p.id));
const anchors = anchorIds.map((id) => pieces.find((p) => p.id === id)).filter(Boolean);

function compose({ name, W, H, bandHeights, rows, anchorSpots, objectSpots }) {
  const rand = rng(name.length * 7919 + 13);
  const out = [];
  let z = 0;

  // 1. Lettering field: bands of title cut-outs, tall bands for short titles
  const pool = [...titles].sort((a, b) => aspectOf(a) - aspectOf(b));
  const short = pool.filter((t) => aspectOf(t) <= 3.4), long = pool.filter((t) => aspectOf(t) > 3.4);
  for (let i = long.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [long[i], long[j]] = [long[j], long[i]]; }
  for (let i = short.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [short[i], short[j]] = [short[j], short[i]]; }
  let y = -10, band = 0, usedTitles = 0;
  while (y < H + 10) {
    const h = bandHeights[band % bandHeights.length];
    const tilt = (rand() - 0.5) * 2.4;
    let x = -rand() * 140;
    while (x < W + 20) {
      const from = h >= 80 && short.length ? short : long.length ? long : short;
      const t = from.shift();
      if (!t) break;
      usedTitles++;
      const w = h * aspectOf(t);
      out.push({ piece: t.id, x: Math.round(x + w / 2), y: Math.round(y + h / 2 + (rand() - 0.5) * h * 0.12), w: Math.round(w), rot: +(tilt + (rand() - 0.5) * 3).toFixed(1), z: z++, gray: true });
      x += w - 4;
    }
    y += h - 5;
    band++;
    if (!short.length && !long.length) break;
  }

  // 2. Objects and scenes, set into the lettering
  objectSpots.forEach(([x, yy, w], i) => {
    const o = objects[i % objects.length];
    if (i < objects.length) out.push({ piece: o.id, x, y: yy, w, rot: +((rand() - 0.5) * 14).toFixed(1), z: z++, gray: false });
  });

  // 3. Figures: rows from back to front. Groups go to the back rows.
  const figs = [...figures].sort((a, b) => aspectOf(b) - aspectOf(a));
  let usedFigures = 0;
  for (const row of rows) {
    let x = row.from;
    while (x < row.to && figs.length) {
      // back rows take the widest (groups); front rows take from the narrow end
      const f = row.groups ? figs.shift() : figs.splice(Math.floor(rand() * Math.min(figs.length, 40)) + Math.max(0, figs.length - 40), 1)[0];
      const a = aspectOf(f);
      const h = row.h * (0.82 + rand() * 0.36);
      const w = Math.min(h * a, row.h * 2.1);
      out.push({ piece: f.id, x: Math.round(x + w / 2), y: Math.round(row.bottom - (w / a) / 2 + (rand() - 0.5) * 24), w: Math.round(w), rot: +((rand() - 0.5) * 9).toFixed(1), z: z++, gray: !!row.gray });
      usedFigures++;
      x += w * (0.52 + rand() * 0.2);
    }
  }
  // 4. Anchors, placed by hand
  anchorSpots.forEach(([i, x, bottom, h, rot]) => {
    const f = anchors[i]; if (!f) return;
    const a = aspectOf(f), w = h * a;
    out.push({ piece: f.id, x, y: Math.round(bottom - h / 2), w: Math.round(w), rot, z: z++, gray: false });
  });
  console.log(`${name}: ${out.length} pieces (${usedTitles} titles, ${Math.min(objectSpots.length, objects.length)} objects, ${usedFigures + anchorSpots.length} figures), ${new Set(out.map((e) => pieces.find((p) => p.id === e.piece).cover)).size} covers`);
  return { width: W, height: H, background: '#1c1b19', pieces: out };
}

const wide = compose({
  name: 'wide', W: 2400, H: 1000,
  bandHeights: [118, 46, 40, 72, 38, 150, 44, 58, 36, 96, 42, 40, 66, 38, 128, 44, 52],
  // [x, y, width]
  objectSpots: [[2130, 150, 250], [1830, 250, 210], [2290, 400, 200], [1960, 470, 190], [130, 560, 210], [470, 610, 170], [1580, 560, 180], [2040, 80, 170], [760, 640, 160], [1120, 660, 170], [1380, 690, 150], [300, 700, 150], [2330, 620, 170], [1720, 110, 150], [940, 720, 140], [1700, 700, 150]],
  rows: [
    { from: 1520, to: 2420, bottom: 640, h: 190, groups: true },
    { from: -40, to: 2420, bottom: 850, h: 215, groups: true },
    { from: -60, to: 1560, bottom: 1035, h: 265 },
  ],
  // [anchor index, x, bottom, height, rotation]
  anchorSpots: [[4, 2300, 470, 260, 3], [3, 1780, 690, 280, -4], [0, 2140, 1005, 520, -2], [1, 880, 1010, 290, 2], [2, 1860, 1010, 330, 3], [5, 620, 1040, 380, 3], [6, 1140, 1005, 310, -2], [7, 1630, 1005, 330, 2], [8, 1390, 1005, 320, -2], [9, 250, 1040, 330, 2]],
});
const tall = compose({
  name: 'tall', W: 1200, H: 1300,
  bandHeights: [96, 40, 36, 62, 34, 124, 40, 50, 34, 82, 38, 36, 58, 34, 108, 40, 46],
  objectSpots: [[1010, 700, 190], [180, 740, 180], [620, 760, 170], [840, 620, 150], [400, 660, 150], [1090, 520, 140]],
  rows: [
    { from: -30, to: 1220, bottom: 960, h: 180, groups: true },
    { from: -40, to: 1220, bottom: 1130, h: 205, groups: true },
    { from: -50, to: 700, bottom: 1335, h: 250 },
  ],
  anchorSpots: [[3, 930, 1000, 270, 3], [0, 980, 1305, 470, -2], [2, 640, 1310, 300, 3], [5, 300, 1340, 340, 3], [7, 110, 1305, 280, -2]],
});
await fs.writeFile(path.join(here, 'manifest-wide.json'), JSON.stringify(wide, null, 1));
await fs.writeFile(path.join(here, 'manifest-tall.json'), JSON.stringify(tall, null, 1));
