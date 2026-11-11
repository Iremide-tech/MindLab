import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to access your MindLab research workspace.",
  alternates: { canonical: null },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
