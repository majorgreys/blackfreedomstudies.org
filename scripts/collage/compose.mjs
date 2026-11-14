// Lays the reviewed pieces out and writes the layout to manifest-wide.json and
// manifest-tall.json. The manifests are the composition: each entry names a
// piece and gives its centre, width, rotation and layer. Edit them by hand to
// move, resize, add or remove a piece, then run `npm run collage:cutouts`.
// Running this script again rebuilds both manifests from the rules below and
// overwrites hand edits.
//
// The arrangement reads as titles, then faces. Title lettering runs in bands of
// very different heights across the sheet (after the lettering field of
// Barbara Jones-Hogu's print "Unite", 1971). The figures are massed together as
// one crowd in front of it, groups behind and single figures in front, with a
// few large figures placed by hand to anchor it.
import fs from 'node:fs/promises';
import path from 'node:path';
import { here } from './pieces.mjs';

const pieces = JSON.parse(await fs.readFile(path.join(here, 'pieces.json'), 'utf8'));
const review = JSON.parse(await fs.readFile(path.join(here, 'review.json'), 'utf8'));
const detect = JSON.parse(await fs.readFile(path.join(here, 'detect.json'), 'utf8'));

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const aspectOf = (p) => (p.box[2] * detect[p.cover].w) / (p.box[3] * detect[p.cover].h);

const forceGray = new Set(review.gray ?? []);
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
    let x = row.from + (rand() - 0.5) * 70;   // an uneven edge to the crowd
    while (x < row.to && figs.length) {
      // back rows take the widest (groups); front rows take from the narrow end
      const f = row.groups ? figs.shift() : figs.splice(Math.floor(rand() * Math.min(figs.length, 40)) + Math.max(0, figs.length - 40), 1)[0];
      const a = aspectOf(f);
      const h = row.h * (0.82 + rand() * 0.36);
      const w = Math.min(h * a, row.h * 2.1);
      out.push({ piece: f.id, x: Math.round(x + w / 2), y: Math.round(row.bottom - (w / a) / 2 + (rand() - 0.5) * 24), w: Math.round(w), rot: +((rand() - 0.5) * 9).toFixed(1), z: z++, gray: !!row.gray });
      usedFigures++;
      x += w * ((row.pack ?? 0.52) + rand() * 0.18);
    }
  }
  // 4. Anchors, placed by hand
  anchorSpots.forEach(([i, x, bottom, h, rot]) => {
    const f = anchors[i]; if (!f) return;
    const a = aspectOf(f), w = h * a;
    out.push({ piece: f.id, x, y: Math.round(bottom - h / 2), w: Math.round(w), rot, z: z++, gray: false });
  });
  for (const e of out) if (forceGray.has(e.piece)) e.gray = true;
  console.log(`${name}: ${out.length} pieces (${usedTitles} titles, ${Math.min(objectSpots.length, objects.length)} objects, ${usedFigures + anchorSpots.length} figures), ${new Set(out.map((e) => pieces.find((p) => p.id === e.piece).cover)).size} covers`);
  return { width: W, height: H, background: '#1c1b19', pieces: out };
}

// Titles, then faces. The lettering fills the left and centre of the sheet,
// under the red site title; every figure is gathered into one crowd on the
// right. The hero pins the sheet to its right edge, so the crowd is always in
// view, and the crowd's left edge steps back row by row to stay clear of the
// three stepped words of the title (measured at 1280px, the tightest case).
const wide = compose({
  name: 'wide', W: 2400, H: 1000,
  bandHeights: [118, 46, 40, 72, 38, 150, 44, 58, 36, 96, 42, 40, 66, 38, 128, 44, 52],
  // [x, y, width]
  objectSpots: [[2290, 110, 150], [1700, 120, 130], [2360, 470, 130], [2300, 760, 130]],
  rows: [
    { from: 1010, to: 2440, bottom: 190, h: 112, groups: true, pack: 0.5 },
    { from: 1480, to: 2440, bottom: 310, h: 150, groups: true, pack: 0.46 },
    { from: 1490, to: 2440, bottom: 440, h: 165, pack: 0.44 },
    { from: 1950, to: 2440, bottom: 580, h: 175, pack: 0.42 },
    { from: 1970, to: 2440, bottom: 740, h: 185, pack: 0.42 },
    { from: 2000, to: 2440, bottom: 950, h: 215, pack: 0.42 },
  ],
  // [anchor index, x, bottom, height, rotation]
  anchorSpots: [[9, 1310, 190, 120, 2], [2, 1600, 245, 165, 3], [7, 1570, 430, 235, 2], [8, 1770, 430, 240, -2], [4, 1990, 310, 210, 3], [6, 2210, 340, 230, -2], [3, 2090, 610, 250, -4], [1, 2310, 650, 220, 2], [5, 2060, 945, 255, 3], [0, 2215, 950, 380, -2]],
});
// On a phone there is no right-hand side, so the same idea runs top to bottom:
// lettering behind the title, and the crowd in a band below it (the hero is
// made taller on phones to show it).
const tall = compose({
  name: 'tall', W: 1200, H: 1300,
  bandHeights: [96, 40, 36, 62, 34, 124, 40, 50, 34, 82, 38, 36, 58, 34, 108, 40, 46],
  objectSpots: [[150, 960, 130], [1090, 940, 120]],
  rows: [
    { from: 40, to: 1180, bottom: 935, h: 140, groups: true, pack: 0.5 },
    { from: 20, to: 1190, bottom: 1050, h: 160, groups: true, pack: 0.46 },
    { from: 20, to: 1190, bottom: 1170, h: 175, pack: 0.44 },
    { from: 20, to: 1190, bottom: 1320, h: 215, pack: 0.42 },
  ],
  anchorSpots: [[7, 250, 1075, 215, 2], [8, 450, 1085, 215, -2], [6, 700, 1040, 190, -2], [3, 1020, 1045, 200, 3], [2, 300, 1300, 230, 3], [5, 610, 1305, 260, -2], [0, 930, 1310, 330, -2]],
});
await fs.writeFile(path.join(here, 'manifest-wide.json'), JSON.stringify(wide, null, 1));
await fs.writeFile(path.join(here, 'manifest-tall.json'), JSON.stringify(tall, null, 1));
