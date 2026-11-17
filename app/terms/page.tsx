import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms that govern your use of MindLab AI, the research and knowledge-mapping workspace by Orion Cybernetics.",
  alternates: { canonical: "/terms" },
};

const updated = "November 17, 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 font-sans text-foreground sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-white/45 transition hover:text-lab-lime"
        >
          ← Back to MindLab
        </Link>

        <h1 className="mt-8 text-4xl font-semibold tracking-[-0.04em]">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-white/45">Last updated: {updated}</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-white/75">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Agreement</h2>
            <p>
              These Terms of Service (“Terms”) govern your access to and use of
              MindLab AI (“MindLab”, “the Service”), a product of Orion
              Cybernetics. By creating an account or using the Service, you agree
              to these Terms and our{" "}
              <Link href="/privacy" className="text-lab-lime hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. The Service</h2>
            <p>
              MindLab is a visual workspace for learning and research. It lets you
              build concept maps, connect ideas, and use AI-assisted tools such as
              topic generation, explanations, expansion, quizzes, and related
              features. We may change, suspend, or discontinue features with
              reasonable notice when practical.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Accounts</h2>
            <p>
              You must provide accurate information and keep your login credentials
              secure. You are responsible for activity under your account. Notify us
              promptly if you suspect unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use the Service for illegal activity or to harm others</li>
              <li>Attempt to probe, disrupt, or overload our systems or providers</li>
              <li>Reverse engineer or resell the Service except as allowed by law</li>
              <li>Upload malware or content you do not have rights to use</li>
              <li>Abuse AI features in ways that violate applicable law or third-party terms</li>
            </ul>
            <p>
              We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. AI features and disclaimers</h2>
            <p>
              AI-generated content (maps, explanations, quizzes, connections, and
              similar outputs) is provided for learning assistance only. It may be
              incomplete, outdated, or incorrect. MindLab is not a substitute for
              professional, academic, medical, legal, or financial advice. You are
              responsible for verifying important information before relying on it.
            </p>
            <p>
              MindLab is not designed as a crisis or mental-health service. If you
              or someone else is in immediate danger, contact local emergency
              services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Your content</h2>
            <p>
              You retain ownership of content you create in MindLab. You grant us a
              limited license to host, process, and display that content solely to
              operate the Service (including sending necessary data to AI and
              infrastructure providers). You represent that you have the rights to
              the content you submit.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Plans and billing</h2>
            <p>
              MindLab offers a free tier with usage limits and paid subscription
              plans (currently Student and Research). Paid plan prices are shown on
              the{" "}
              <Link href="/pricing" className="text-lab-lime hover:underline">
                Pricing
              </Link>{" "}
              page and charged in the currency displayed at checkout. Subscriptions
              renew automatically each billing period until cancelled.
            </p>
            <p>
              You may cancel a paid subscription so it does not renew at the end of
              the current period. Access to paid features continues until the period
              ends unless otherwise stated. Fees already paid are generally
              non-refundable except where required by law or where we state
              otherwise.
            </p>
            <p>
              Payments are processed by Stripe (and, for some legacy subscriptions,
              Paystack). Their terms also apply to payment processing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Intellectual property</h2>
            <p>
              The MindLab product, branding, and underlying software are owned by
              Orion Cybernetics and its licensors. These Terms do not grant you
              rights to our trademarks or source code beyond using the Service as
              intended.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Availability and limitation of liability</h2>
            <p>
              The Service is provided “as is” and “as available.” To the fullest
              extent permitted by law, we disclaim warranties of merchantability,
              fitness for a particular purpose, and non-infringement. We are not
              liable for indirect, incidental, special, consequential, or punitive
              damages, or for lost profits, data, or goodwill. Our total liability
              for any claim relating to the Service is limited to the amounts you
              paid us for the Service in the twelve months before the claim (or
              zero if you use only the free tier).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Termination</h2>
            <p>
              You may stop using MindLab at any time. We may suspend or end access
              if you breach these Terms or if we discontinue the Service. Sections
              that by nature should survive (including ownership, disclaimers, and
              liability limits) will survive termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Changes to these Terms</h2>
            <p>
              We may update these Terms. We will revise the “Last updated” date and,
              when changes are material, provide additional notice when reasonable.
              Continued use after changes take effect constitutes acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
            <p>
              Questions about these Terms:{" "}
              <a
                href="mailto:support@usemindlab.com"
                className="text-lab-lime hover:underline"
              >
                support@usemindlab.com
              </a>
            </p>
          </section>
        </div>

        <footer className="mt-14 flex flex-wrap gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
          <Link href="/privacy" className="hover:text-lab-lime">
            Privacy Policy
          </Link>
          <Link href="/pricing" className="hover:text-lab-lime">
            Pricing
          </Link>
          <Link href="/" className="hover:text-lab-lime">
            Home
          </Link>
        </footer>
      </div>
    </main>
  );
}
