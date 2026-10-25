import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Editors often type a bare domain ("www.example.com") into the CMS. Add the
// missing https:// rather than failing the whole build on it.
const url = () =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() && !/^[a-z][a-z0-9+.-]*:/i.test(v.trim()) ? `https://${v.trim()}` : v),
    z.string().url(),
  );

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    seasonYear: z.number().int().min(2013),
    seasonPart: z.enum(['fall', 'spring', 'special']),
    eventbrite: url().optional(),
    speakers: z.array(z.string()).default([]),
    books: z.array(image()).default([]),
    video: z.string().optional(),
    primaryResources: z.array(z.string()).default([]),
  }),
});

const speakers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/speakers' }),
  schema: ({ image }) => z.object({
    name: z.string(),
    affiliation: z.string().optional(),
    image: image().optional(),
    email: z.string().optional(),
    twitter: z.string().optional(),
    social: url().optional(),
    homepage: url().optional(),
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    resourceType: z.enum(['video', 'document', 'external', 'text', 'image', 'audio']),
    sourceUrl: z.string().optional(),
    videoEmbedCode: z.string().optional(),
    document: z.string().optional(),
    authorship: z.string().optional(),
    publicationDate: z.string().optional(),
    tags: z.array(z.string()).default([]),
    date: z.coerce.date().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    image: image().optional(),
    imageCaption: z.string().optional(),
    // Banner crop set in Decap: centre of the crop (% of image width/height) and
    // zoom (1 = the whole image width). Null/absent means centred, not zoomed.
    bannerCrop: z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      zoom: z.number().min(1),
    }).nullish(),
    tags: z.array(z.string()).default([]),
  }),
});

const interviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/interviews' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    image: image().optional(),
    relatedEvent: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    heading: z.string().optional(),
    image: image().optional(),
  }),
});

export const collections = { events, speakers, resources, news, interviews, pages };
