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

const MIN: Partial<Record<ImageUse, number>> = {
  'Book cover': 560,
  'Speaker photo': 640,
  'News banner': 1000,
  'Interview image': 800,
  'Page image': 800,
};

// Large landscape news images become a cropped banner; small or portrait ones
// are shown beside the text at natural size. Matches news/[year]/[slug].astro.
export function isNewsBanner(img: { width: number; height: number }) {
  return img.width >= 700 && img.width / img.height >= 1.2;
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
