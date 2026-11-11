import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://usemindlab.com";
const siteName = "MindLab";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MindLab AI – AI-Powered Research & Knowledge Mapping",
    template: "%s | MindLab AI",
  },
  description:
    "Explore ideas, connect concepts, and build knowledge with MindLab AI. Your intelligent workspace for learning, research, and collaborative discovery.",
  applicationName: siteName,
  keywords: [
    "AI mind mapping",
    "AI research workspace",
    "knowledge mapping software",
    "AI learning assistant",
    "concept mapping tool",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: "MindLab AI – AI-Powered Research & Knowledge Mapping",
    description:
      "Explore ideas, connect concepts, and build knowledge with MindLab AI.",
  },
  twitter: {
    card: "summary",
    title: "MindLab AI – AI-Powered Research & Knowledge Mapping",
    description:
      "Explore ideas, connect concepts, and build knowledge with MindLab AI.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
