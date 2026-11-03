import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Works out-of-the-box on Vercel (VERCEL_URL) and for custom domains
// via NEXT_PUBLIC_SITE_URL — no manual config required.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "K Dent Dental & Aesthetic Care — Bani Gala, Islamabad",
  description:
    "Bani Gala's boutique dental & aesthetic studio. Smile design, painless RCTs, clear aligners, implants & maxillofacial care by Dr. Yasir Arafat (PMDC 717176-03-D). Rated 5.0★. Mon–Sat 10 AM–7 PM. Reserve on WhatsApp: 0332 5855589.",
  keywords: [
    "K Dent",
    "dentist Bani Gala",
    "dental clinic Islamabad",
    "smile design Islamabad",
    "clear aligners Islamabad",
    "dental implants Bani Gala",
    "root canal Bani Gala",
    "Dr Yasir Arafat dentist",
    "aesthetic dentistry Islamabad",
    "luxury dental clinic Islamabad",
  ],
  authors: [{ name: "K Dent Dental & Aesthetic Care" }],
  openGraph: {
    title: "K Dent Dental & Aesthetic Care",
    description:
      "A boutique dental & aesthetic studio — smile design, painless RCTs, aligners & implants in Bani Gala, Islamabad. Rated 5.0★.",
    type: "website",
    locale: "en_PK",
    images: [
      {
        url: "/kdent/clinic-suite.jpg",
        width: 1344,
        height: 768,
        alt: "K Dent Dental & Aesthetic Care — the treatment suite",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "K Dent Dental & Aesthetic Care",
    description: "Where modern dentistry meets trusted care. Bani Gala, Islamabad.",
    images: ["/kdent/clinic-suite.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#041c20",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
