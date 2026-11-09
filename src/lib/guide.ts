// Study guide data: topics scored per recording, with a key moment for each.
// src/data/guide.json is generated from the transcript index
// (cbfs-transcripts repo, topics/guide/build.py); edit it there, not here.
import { getCollection } from 'astro:content';
import raw from '../data/guide.json';

export interface Moment {
  v: string;  // YouTube video id
  d: string;  // event date, YYYY-MM-DD
  e: string;  // event title from YouTube
  k: number;  // key moment, seconds into the recording
  t: string;  // topic
  s: number;  // 3 = central to the event, 2 = substantial passage
  n: string;  // note: who is speaking, about whom, when
  x: string;  // excerpt from the machine captions at the key moment
}
export interface Unit { key: string; name: string; intro: string; topics: string[]; n: number; stops: Moment[]; }
export interface Part { name: string; units: Unit[]; }

export const guide = raw as unknown as { parts: Part[]; moments: Moment[]; videos: number; years: Record<string, number> };
export const units: (Unit & { part: string; num: string })[] = guide.parts.flatMap(p => p.units.map(u => ({ ...u, part: p.name })))
  .map((u, i) => ({ ...u, num: String(i + 1).padStart(2, '0') }));

export const hms = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
};
export const watchUrl = (m: Pick<Moment, 'v' | 'k'>) => `https://www.youtube.com/watch?v=${m.v}&t=${m.k}s`;
export const level = (s: number) => (s === 3 ? 'Central' : 'Substantial');

// The site's event page for a recording, matched by date
export async function eventPages(): Promise<Map<string, { url: string; title: string }>> {
  const events = await getCollection('events');
  return new Map(events.map(e => [
    e.data.date.toISOString().slice(0, 10),
    { url: `/events/${e.data.seasonPart}-${e.data.seasonYear}/${e.id}`, title: e.data.title },
  ]));
}
