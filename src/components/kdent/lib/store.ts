'use client';

import { create } from 'zustand';

export interface KService {
  id: string;
  title: string;
  tagline: string;
  description: string;
  points: string[];
  accent: string;
}

/** Full K Dent service menu — built from the gathered clinic research. */
export const SERVICES: KService[] = [
  {
    id: 'general',
    title: 'General Dentistry',
    tagline: 'Complete family care',
    description:
      'From routine check-ups to gentle fillings and extractions — precise, personalized and compassionate care for every smile in your family.',
    points: ['Check-ups & diagnosis', 'Fillings & restorations', 'Gentle extractions'],
    accent: '#0F172A',
  },
  {
    id: 'smile-design',
    title: 'Smile Design & Veneers',
    tagline: 'Your smile, engineered',
    description:
      'Digital smile makeovers with ultra-thin porcelain veneers. We design balance, symmetry and brightness that still looks like you.',
    points: ['Digital smile design', 'Porcelain veneers', 'Cosmetic bonding'],
    accent: '#8FBFAC',
  },
  {
    id: 'rct',
    title: 'Root Canal Treatment',
    tagline: 'Save the tooth, kill the pain',
    description:
      'Advanced & gentle RCTs focused on pain relief, infection removal and tooth preservation — comfortable, precise, single-visit protocols.',
    points: ['Pain relief first', 'Infection removal', 'Tooth preservation'],
    accent: '#C9D1D9',
  },
  {
    id: 'aligners',
    title: 'Braces & Clear Aligners',
    tagline: 'A straighter smile, invisibly',
    description:
      'Metal braces or nearly-invisible clear aligners — orthodontic plans from Rs. 5,000 down payment with 3 free restorations.',
    points: ['Clear aligners', 'Metal & ceramic braces', 'Flexible down payment'],
    accent: '#F0FFD4',
  },
  {
    id: 'implants',
    title: 'Dental Implants',
    tagline: 'Permanent. Precise. Yours.',
    description:
      'Titanium implants planned with advanced diagnostic technology to restore missing teeth with a natural look, feel and bite.',
    points: ['Guided planning', 'Titanium fixtures', 'Natural crowns'],
    accent: '#94A3B8',
  },
  {
    id: 'maxillofacial',
    title: 'Oral & Maxillofacial Care',
    tagline: 'Specialist-level surgery',
    description:
      'Oral surgery and maxillofacial care supervised under FCPS (PGR) training — wisdom teeth, trauma and complex extractions.',
    points: ['Wisdom tooth surgery', 'Oral pathology care', 'FCPS-supervised'],
    accent: '#0F172A',
  },
];

interface KUIState {
  webglOk: boolean;
  setWebglOk: (v: boolean) => void;
  activeService: number;
  setActiveService: (i: number) => void;
  bookingOpen: boolean;
  setBookingOpen: (v: boolean) => void;
}

export const useKUI = create<KUIState>((set) => ({
  webglOk: true,
  setWebglOk: (v) => set({ webglOk: v }),
  activeService: 0,
  setActiveService: (i) => set({ activeService: i }),
  bookingOpen: false,
  setBookingOpen: (v) => set({ bookingOpen: v }),
}));
