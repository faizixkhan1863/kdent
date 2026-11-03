/**
 * K Dent Dental & Aesthetic Care — central data
 * Source: docs/k-dent-research.md (verified clinic research)
 */

export const CLINIC = {
  name: "K Dent",
  fullName: "K Dent Dental & Aesthetic Care",
  descriptor: "Dental & Aesthetic Atelier",
  tagline: "Where modern dentistry meets trusted care",
  signature: "Modern dentistry. Confident smiles.",
  city: "Bani Gala",
  region: "Islamabad",
  address: "Shop G-7, Farhan Heights, Jinnah Road, Bani Gala, Islamabad",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=K+Dent+Dental+%26+Aesthetic+Care+Farhan+Heights+Bani+Gala+Islamabad",
  phoneDisplay: "0332 5855589",
  phoneIntl: "+923325855589",
  telUrl: "tel:+923325855589",
  whatsappNumber: "923325855589",
  instagram: "@kdent_care",
  instagramUrl: "https://www.instagram.com/kdent_care",
  facebookNote: "K Dent ▻ Only Bani Gala",
  rating: { value: "5.0", count: 19 },
  hours: [
    { days: "Monday — Saturday", time: "10:00 AM — 7:00 PM" },
    { days: "Sunday", time: "By appointment only" },
  ],
} as const;

export const DOCTOR = {
  name: "Dr. Yasir Arafat",
  role: "Founder · Principal Dental Surgeon",
  quote: "Modern dentistry. Confident smiles.",
  credentials: [
    { title: "BDS", detail: "Khyber Medical University" },
    { title: "RDS (Pak)", detail: "Registered Dental Surgeon, Pakistan" },
    { title: "FCPS — Oral & Maxillofacial Surgery", detail: "Postgraduate Resident (PGR)" },
    { title: "C-Endo", detail: "Certificate in Endodontics, Islamabad" },
    { title: "PMDC Reg.", detail: "717176-03-D" },
  ],
  chips: [
    "Oral & Maxillofacial Surgery",
    "Endodontics",
    "Aesthetic Dentistry",
    "Implantology",
  ],
} as const;

export interface Treatment {
  index: string;
  title: string;
  detail: string;
}

export const TREATMENTS: Treatment[] = [
  {
    index: "01",
    title: "General & Family Dentistry",
    detail:
      "Complete care for every smile in your family — check-ups, fillings, extractions, crowns & bridges, scaling and polishing rituals, performed with unhurried precision.",
  },
  {
    index: "02",
    title: "Smile Design & Veneers",
    detail:
      "A couture approach to your smile — digital planning, whitening and aesthetic refinements composed to your face, your character, your moment.",
  },
  {
    index: "03",
    title: "Gentle Root Canal Therapy",
    detail:
      "Advanced, pain-free endodontics. Infection removed, natural tooth preserved — comfort engineered into every single appointment.",
  },
  {
    index: "04",
    title: "Braces & Clear Aligners",
    detail:
      "From precision metal braces to nearly invisible clear aligners — a straighter, confident smile without interrupting your life.",
  },
  {
    index: "05",
    title: "Dental Implants",
    detail:
      "Permanent, natural-feeling replacements crafted with guided precision — restoring bite, symmetry and quiet confidence.",
  },
  {
    index: "06",
    title: "Oral & Maxillofacial Care",
    detail:
      "Specialist-led surgical care of the face, jaws and mouth — delivered under FCPS-supervised expertise you can trust.",
  },
] as const;

export const RITUAL_STEPS = [
  {
    index: "01",
    title: "Arrival Ritual",
    detail:
      "You are received, never processed. A warm welcome, zero waiting-room anxiety, and time taken to simply listen before anything begins.",
  },
  {
    index: "02",
    title: "The Quiet Room",
    detail:
      "A calm,Private operatory designed to lower the heartbeat — soft light, silence on request, and sedation options for the needle-shy.",
  },
  {
    index: "03",
    title: "Uncompromising Sterility",
    detail:
      "Hospital-grade sterilization protocols, single-use instrumentation and digitally tracked hygiene — visible the moment you sit down.",
  },
] as const;

export const ATELIER_HOTSPOTS = [
  {
    title: "Digital Diagnostics",
    detail:
      "Advanced imaging and digital scanning — diagnosis you can see on screen, plans you approve before we begin.",
  },
  {
    title: "Sterilization Suite",
    detail:
      "A dedicated, visible sterilization bay. Class-B autoclaves, sealed pouches, zero shortcuts.",
  },
  {
    title: "Family Lounge",
    detail:
      "A space where kids feel at ease and grandparents feel at home — dentistry for every generation together.",
  },
  {
    title: "The Operatory",
    detail:
      "State-of-the-art chair, precision handpieces and quiet suction — technology in service of comfort.",
  },
] as const;

export const STATS = [
  { value: "5.0★", label: "Patient rating", sub: "19 verified reviews" },
  { value: "PMDC", label: "Listed & registered", sub: "717176-03-D" },
  { value: "10–7", label: "Mon – Sat", sub: "Sunday by appointment" },
  { value: "Bani Gala", label: "Your neighbourhood", sub: "Farhan Heights, Jinnah Road" },
] as const;

export const NAV_LINKS = [
  { label: "The Ritual", href: "#ritual" },
  { label: "The Atelier", href: "#atelier" },
  { label: "Treatments", href: "#treatments" },
  { label: "Results", href: "#results" },
  { label: "Doctor", href: "#doctor" },
] as const;

export const TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
] as const;

export const MARQUEE_ITEMS = [
  "Smile Design",
  "Dental Implants",
  "Clear Aligners",
  "Gentle RCT",
  "Teeth Whitening",
  "Maxillofacial Care",
  "Family Dentistry",
  "Bani Gala · Islamabad",
] as const;
