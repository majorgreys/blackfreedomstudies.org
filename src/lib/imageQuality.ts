// How content images are used and whether they're large enough for it.
// Minimums are twice the largest size each kind is displayed at, so images
// stay sharp on high-res screens.

export type ImageUse =
  | 'Book cover'
  | 'Speaker photo'
  | 'News banner'
  | 'News image beside text'
  | 'Interview image'
  | 'Page image'
  | 'Image in text';

export type ImageStatus = 'blurry' | 'soft' | 'ok' | 'unchecked';

// News banners are at most 1004px wide on screen (redesign theme)
export const BANNER_MIN_WIDTH = 1000;

const MIN: Partial<Record<ImageUse, number>> = {
  'Book cover': 560,
  'Speaker photo': 640,
  'News banner': BANNER_MIN_WIDTH,
  'Interview image': 800,
  'Page image': 800,
};

// Large landscape news images become a cropped banner; small or portrait ones
// are shown beside the text at natural size. Matches news/[year]/[slug].astro.
export function isNewsBanner(img: { width: number; height: number }) {
  return img.width >= 700 && img.width / img.height >= 1.2;
}

// Widest banner shape: 1004×320 once it hits its max height
export const BANNER_TIGHTEST_ASPECT = 1004 / 320;

// How far an editor may zoom into a banner and still have enough pixels across
// the banner for it to be sharp. An image wider than the banner shape fills it
// by height, so less of its width shows even at zoom 1.
// Mirrored in public/admin/index.html.
export function maxBannerZoom(img: { width: number; height: number }) {
  const fill = Math.max(1, img.width / img.height / BANNER_TIGHTEST_ASPECT);
  return Math.max(1, img.width / fill / BANNER_MIN_WIDTH);
}

// Speaker photos are cropped square, so their shorter side is what counts.
export function measuredSize(use: ImageUse, img: { width: number; height: number }) {
  return use === 'Speaker photo' ? Math.min(img.width, img.height) : img.width;
}

export function minimumFor(use: ImageUse) {
  return MIN[use];
}

export function statusFor(use: ImageUse, img: { width: number; height: number }): ImageStatus {
  const min = MIN[use];
  if (!min) return 'unchecked';
  const size = measuredSize(use, img);
  return size < min / 2 ? 'blurry' : size < min ? 'soft' : 'ok';
}

const RANK: Record<ImageStatus, number> = { blurry: 0, soft: 1, ok: 2, unchecked: 3 };
export function worstStatus(statuses: ImageStatus[]): ImageStatus {
  return statuses.reduce<ImageStatus>((w, s) => (RANK[s] < RANK[w] ? s : w), 'unchecked');
}
