import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How MindLab AI collects, uses, and protects your data when you use our research workspace.",
  alternates: { canonical: "/privacy" },
};

const updated = "November 27, 2026";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-white/45">Last updated: {updated}</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-white/75">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Who we are</h2>
            <p>
              MindLab AI (“MindLab”, “we”, “us”) is a product of Orion Cybernetics.
              This policy explains what information we collect when you use{" "}
              <a href="https://www.usemindlab.com" className="text-lab-lime hover:underline">
                usemindlab.com
              </a>{" "}
              and related services, and how we use it.
            </p>
            <p>
              Contact:{" "}
              <a
                href="mailto:privacy@usemindlab.com"
                className="text-lab-lime hover:underline"
              >
                privacy@usemindlab.com
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Information we collect</h2>
            <p>We collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/90">Account data</strong> — email
                address and authentication details when you sign up or sign in with
                email and password.
              </li>
              <li>
                <strong className="text-white/90">Workspace content</strong> —
                research maps, topics, nodes, edges, titles, and related text you
                create or save in MindLab.
              </li>
              <li>
                <strong className="text-white/90">Usage data</strong> — plan
                tier, daily generation counts, and feature usage needed to enforce
                plan limits.
              </li>
              <li>
                <strong className="text-white/90">Billing data</strong> — payment
                status and subscription identifiers. Card details are processed by
                our payment providers; we do not store full card numbers.
              </li>
              <li>
                <strong className="text-white/90">Technical data</strong> —
                basic logs such as IP address, browser type, and error reports
                used for security and reliability.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. How we use AI</h2>
            <p>
              MindLab uses artificial intelligence to generate mind maps, expand
              concepts, explain topics, create quizzes, and suggest connections.
              When you use these features, the text you submit (for example a
              topic label or description) is sent to our AI provider to produce a
              response. AI outputs may be inaccurate; you should review them
              before relying on them for academic or professional work.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Third-party services</h2>
            <p>We use the following processors to run MindLab:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/90">Supabase</strong> —
                authentication, database, and application backend.
              </li>
              <li>
                <strong className="text-white/90">AI provider</strong> — map
                generation, explanations, expansion, and quizzes.
              </li>
              <li>
                <strong className="text-white/90">Stripe</strong> — subscription
                checkout and billing for paid plans.
              </li>
              <li>
                <strong className="text-white/90">Resend</strong> — transactional
                email (for example workspace invitations).
              </li>
              <li>
                <strong className="text-white/90">Paystack</strong> — legacy
                billing support for existing subscriptions only, where applicable.
              </li>
            </ul>
            <p>
              These providers process data only as needed to deliver the service
              under their own terms and security practices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Legal bases and purposes</h2>
            <p>We process data to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide and secure the MindLab service</li>
              <li>Authenticate users and manage workspaces</li>
              <li>Enforce plan limits and process payments</li>
              <li>Send service emails (invitations, account-related messages)</li>
              <li>Improve reliability and prevent abuse</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Retention</h2>
            <p>
              We keep account and workspace data while your account is active.
              Billing records may be retained as required for tax and accounting.
              Logs are kept only as long as needed for security and debugging.
              You may request deletion of your account and associated workspace
              data by contacting us at the email above.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Security</h2>
            <p>
              We use industry-standard measures such as encrypted connections
              (HTTPS), access controls, and provider-managed infrastructure.
              No method of transmission or storage is 100% secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Your choices</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Access or update account details through the product where available</li>
              <li>Request account or data deletion by emailing us</li>
              <li>Manage or cancel paid subscriptions through the billing flow or by contacting support</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Children</h2>
            <p>
              MindLab is not directed at children under 13 (or the minimum age
              required in your jurisdiction). We do not knowingly collect personal
              data from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Changes</h2>
            <p>
              We may update this policy from time to time. The “Last updated” date
              at the top will change when we do. Continued use of MindLab after an
              update means you accept the revised policy.
            </p>
          </section>
        </div>

        <footer className="mt-14 flex flex-wrap gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
          <Link href="/terms" className="hover:text-lab-lime">
            Terms of Service
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
