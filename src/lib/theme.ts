import BaseLayout from '../layouts/BaseLayout.astro';

import ClassicEventCard from '../components/classic/EventCard.astro';
import RedesignEventCard from '../components/redesign/EventCard.astro';

import ClassicSpeakerCard from '../components/classic/SpeakerCard.astro';
import RedesignSpeakerCard from '../components/redesign/SpeakerCard.astro';

import ClassicBookGrid from '../components/classic/BookGrid.astro';
import RedesignBookGrid from '../components/redesign/BookGrid.astro';

const theme = (import.meta as any).env?.THEME || 'redesign';
const isClassic = theme === 'classic';

export const Layout = BaseLayout;
export const EventCard = isClassic ? ClassicEventCard : RedesignEventCard;
export const SpeakerCard = isClassic ? ClassicSpeakerCard : RedesignSpeakerCard;
export const BookGrid = isClassic ? ClassicBookGrid : RedesignBookGrid;
export { isClassic, theme };
