import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a MindLab account to explore ideas and build research maps.",
  alternates: { canonical: null },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
