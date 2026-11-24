import type { Metadata } from "next";
import DashboardLeaveEnhancer from "@/components/DashboardLeaveEnhancer";
import UiCopyGuard from "@/components/UiCopyGuard";

export const metadata: Metadata = {
  title: "Research workspace",
  alternates: { canonical: null },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardLeaveEnhancer />
      <UiCopyGuard />
      {children}
    </>
  );
}
