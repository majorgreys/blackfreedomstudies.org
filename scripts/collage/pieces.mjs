// Turns Vision's findings (detect.json, masks/) into a list of candidate pieces:
//   figure  a lifted subject that contains a detected face or person
//   object  a lifted subject with no face (a scene, an object, an illustration)
//   title   the block of the largest lettering on the cover
// Writes scripts/collage/pieces.json. With --thumbs <dir> it also writes each
// piece as a PNG for review.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '../..');
export const SRC = path.join(root, 'src/assets/bookcovers');

// Cut one piece out of its cover at the given width. Titles are a plain block
// with a small margin; lifted subjects are cut along their outline with a
// slightly generous margin, as scissors would leave.
export async function cutPiece(piece, width, { gray = false } = {}) {
  const img = sharp(path.join(SRC, piece.cover), { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const [bx, by, bw, bh] = piece.box;
  const left = Math.max(0, Math.round(bx * meta.width)), top = Math.max(0, Math.round(by * meta.height));
  const w = Math.min(meta.width - left, Math.round(bw * meta.width)), h = Math.min(meta.height - top, Math.round(bh * meta.height));
  const outW = Math.max(8, Math.round(width)), outH = Math.max(8, Math.round((outW * h) / w));
  let out = img.extract({ left, top, width: w, height: h }).resize(outW, outH, { fit: 'fill' });
  if (gray) out = out.modulate({ saturation: 0 }).normalise();
  if (!piece.mask) return out.png().toBuffer({ resolveWithObject: true });
  const mm = await sharp(path.join(here, 'masks', piece.mask)).metadata();
  const mask = await sharp(path.join(here, 'masks', piece.mask))
    .extract({ left: Math.round(bx * mm.width), top: Math.round(by * mm.height), width: Math.max(1, Math.min(mm.width - Math.round(bx * mm.width), Math.round(bw * mm.width))), height: Math.max(1, Math.min(mm.height - Math.round(by * mm.height), Math.round(bh * mm.height))) })
    .resize(outW, outH, { fit: 'fill' })
    .blur(Math.max(1.2, outW / 90))   // widen the cut a little past the subject
    .linear(3.2, -40)                 // and make its edge crisp again
    .toColourspace('b-w')
    .raw()
    .toBuffer();
  const rgb = await out.removeAlpha().raw().toBuffer();
  return sharp(rgb, { raw: { width: outW, height: outH, channels: 3 } }).joinChannel(mask, { raw: { width: outW, height: outH, channels: 1 } }).png().toBuffer({ resolveWithObject: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const detect = JSON.parse(await fs.readFile(path.join(here, 'detect.json'), 'utf8'));
  const pieces = [];
  for (const [cover, d] of Object.entries(detect)) {
    const stem = cover.replace(/\.[^.]+$/, '');
    // Lifted subjects
    let n = 0;
    for (const m of d.masks) {
      const { data, info } = await sharp(path.join(here, 'masks', m.file)).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });
      let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0, on = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] > 127) { on++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (!on) continue;
      const pad = 0.012;
      const box = [Math.max(0, x0 / info.width - pad), Math.max(0, y0 / info.height - pad), 0, 0];
      box[2] = Math.min(1, x1 / info.width + pad) - box[0]; box[3] = Math.min(1, y1 / info.height + pad) - box[1];
      const area = on / (info.width * info.height);
      const fill = on / ((x1 - x0 + 1) * (y1 - y0 + 1));
      const at = (bx, by) => data[Math.min(info.height - 1, Math.round(by * info.height)) * info.width + Math.min(info.width - 1, Math.round(bx * info.width))] > 127;
      const hasFace = d.faces.some(([fx, fy, fw, fh]) => at(fx + fw / 2, fy + fh / 2));
      const hasHuman = d.humans.some(([hx, hy, hw, hh]) => at(hx + hw / 2, hy + hh * 0.35));
      // Skip slivers, specks and "subjects" that are really the whole cover
      if (area < 0.035 || (box[2] > 0.94 && box[3] > 0.94 && fill > 0.8)) continue;
      pieces.push({ id: `${stem}#${++n}`, cover, kind: hasFace || hasHuman ? 'figure' : 'object', box: box.map((v) => +v.toFixed(4)), mask: m.file, area: +area.toFixed(3), faces: d.faces.filter(([fx, fy, fw, fh]) => at(fx + fw / 2, fy + fh / 2)).length });
    }
    // Title lettering: the largest lines, and the lines stacked directly with them
    const lines = d.text.filter((t) => t.c > 0.4 && t.s.replace(/[^A-Za-z0-9]/g, '').length >= 3).map((t) => ({ ...t, lh: t.b[3] }));
    if (lines.length) {
      const maxH = Math.max(...lines.map((l) => l.lh));
      let block = lines.filter((l) => l.lh >= maxH * 0.6).sort((a, b) => a.b[1] - b.b[1]);
      // keep the run of lines that touches the biggest one
      const big = block.findIndex((l) => l.lh === maxH);
      let a = big, b = big;
      while (a > 0 && block[a].b[1] - (block[a - 1].b[1] + block[a - 1].b[3]) < maxH * 0.9) a--;
      while (b < block.length - 1 && block[b + 1].b[1] - (block[b].b[1] + block[b].b[3]) < maxH * 0.9) b++;
      block = block.slice(a, b + 1);
      const x0 = Math.min(...block.map((l) => l.b[0])), y0 = Math.min(...block.map((l) => l.b[1]));
      const x1 = Math.max(...block.map((l) => l.b[0] + l.b[2])), y1 = Math.max(...block.map((l) => l.b[1] + l.b[3]));
      const mx = 0.02, my = 0.014;
      const box = [Math.max(0, x0 - mx), Math.max(0, y0 - my), 0, 0];
      box[2] = Math.min(1, x1 + mx) - box[0]; box[3] = Math.min(1, y1 + my) - box[1];
      const area = box[2] * box[3];
      if (area > 0.015 && area < 0.7 && box[2] > 0.25) pieces.push({ id: `${stem}#title`, cover, kind: 'title', box: box.map((v) => +v.toFixed(4)), text: block.map((l) => l.s).join(' / '), aspect: +((box[2] * d.w) / (box[3] * d.h)).toFixed(2) });
    }
  }
  await fs.writeFile(path.join(here, 'pieces.json'), JSON.stringify(pieces, null, 1));
  const count = (k) => pieces.filter((p) => p.kind === k).length;
  console.log(`${pieces.length} pieces: ${count('figure')} figures, ${count('object')} objects, ${count('title')} titles; covers represented: ${new Set(pieces.map((p) => p.cover)).size}`);
  const ti = process.argv.indexOf('--thumbs');
  if (ti > 0) {
    const dir = process.argv[ti + 1];
    await fs.mkdir(dir, { recursive: true });
    let i = 0;
    for (const p of pieces) {
      const { data } = await cutPiece(p, p.kind === 'title' ? 260 : 200);
      await fs.writeFile(path.join(dir, `${p.kind}-${String(i++).padStart(4, '0')}.png`), data);
    }
  }
}
