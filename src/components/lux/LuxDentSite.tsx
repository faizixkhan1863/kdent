"use client";

import SmoothScroll from "./SmoothScroll";
import Preloader from "./Preloader";
import Cursor from "./Cursor";
import Nav from "./Nav";
import Footer from "./Footer";
import Hero from "./sections/Hero";
import Standard from "./sections/Standard";
import Tour from "./sections/Tour";
import Services from "./sections/Services";
import Results from "./sections/Results";
import Doctor from "./sections/Doctor";
import Book from "./sections/Book";

/**
 * K DENT — CLINICAL LUXE
 * A hyper-premium, cinematic scrollytelling experience for
 * K Dent Dental & Aesthetic Care, Bani Gala, Islamabad.
 */
export default function LuxDentSite() {
  return (
    <SmoothScroll>
      <Preloader />
      <Cursor />
      <div className="grain" aria-hidden="true" />
      <div className="flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">
          <Hero />
          <Standard />
          <Tour />
          <Services />
          <Results />
          <Doctor />
          <Book />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
