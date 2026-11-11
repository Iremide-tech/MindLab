import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace invitation",
  alternates: { canonical: null },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
