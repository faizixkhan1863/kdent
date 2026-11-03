import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "K Dent Dental & Aesthetic Care — Bani Gala, Islamabad",
  description:
    "Where modern dentistry meets trusted care. Smile design, painless RCTs, clear aligners, implants & maxillofacial care by Dr. Yasir Arafat (PMDC 717176-03-D) at Farhan Heights, Bani Gala, Islamabad. Rated 5.0★. Mon–Sat 10 AM–7 PM. Book on WhatsApp: 0332 5855589.",
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
  ],
  authors: [{ name: "K Dent Dental & Aesthetic Care" }],
  openGraph: {
    title: "K Dent Dental & Aesthetic Care",
    description:
      "Immersive clinic experience — smile design, RCTs, aligners & implants in Bani Gala, Islamabad. Rated 5.0★.",
    type: "website",
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: "K Dent Dental & Aesthetic Care",
    description: "Modern dentistry. Confident smiles. Bani Gala, Islamabad.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
