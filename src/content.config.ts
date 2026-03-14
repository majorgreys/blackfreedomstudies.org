import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    seasonYear: z.number().int().min(2013),
    seasonPart: z.enum(['fall', 'spring', 'special']),
    eventbrite: z.string().url().optional(),
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
    homepage: z.string().url().optional(),
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

export const collections = { events, speakers, resources, news, pages };
