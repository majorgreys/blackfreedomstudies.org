import ClassicBaseLayout from '../layouts/classic/BaseLayout.astro';
import RedesignBaseLayout from '../layouts/redesign/BaseLayout.astro';

import ClassicNavbar from '../components/classic/Navbar.astro';
import RedesignNavbar from '../components/redesign/Navbar.astro';

import ClassicFooter from '../components/classic/Footer.astro';
import RedesignFooter from '../components/redesign/Footer.astro';

import ClassicEventCard from '../components/classic/EventCard.astro';
import RedesignEventCard from '../components/redesign/EventCard.astro';

import ClassicSpeakerCard from '../components/classic/SpeakerCard.astro';
import RedesignSpeakerCard from '../components/redesign/SpeakerCard.astro';

import ClassicBookGrid from '../components/classic/BookGrid.astro';
import RedesignBookGrid from '../components/redesign/BookGrid.astro';

const theme = (import.meta as any).env?.THEME || 'redesign';
const isClassic = theme === 'classic';

export const Layout = isClassic ? ClassicBaseLayout : RedesignBaseLayout;
export const Navbar = isClassic ? ClassicNavbar : RedesignNavbar;
export const Footer = isClassic ? ClassicFooter : RedesignFooter;
export const EventCard = isClassic ? ClassicEventCard : RedesignEventCard;
export const SpeakerCard = isClassic ? ClassicSpeakerCard : RedesignSpeakerCard;
export const BookGrid = isClassic ? ClassicBookGrid : RedesignBookGrid;
