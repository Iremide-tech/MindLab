import type { Metadata } from "next";
import Link from "next/link";
import CheckoutConfirmation from "@/components/CheckoutConfirmation";
import PricingAction from "@/components/PricingAction";
import type { PlanCode } from "@/lib/paywall";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare MindLab plans. Start free, try Student free for 7 days, or upgrade for deeper AI-powered learning and research.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "MindLab AI Pricing",
    description:
      "Compare plans for AI-powered learning, concept mapping, and research. Student includes a 7-day free trial.",
    url: "/pricing",
  },
  twitter: {
    card: "summary",
    title: "MindLab AI Pricing",
    description: "Find the right MindLab plan. Student plan includes a 7-day free trial.",
  },
};

const plans = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    description: "Try MindLab with a small daily allowance for each learning tool.",
    features: [
      "2 mind maps per day",
      "2 quizzes, 2 explanations, and 2 examples per day",
      "Basic research maps",
    ],
    highlighted: false,
    badge: null as string | null,
  },
  {
    code: "student",
    name: "Student",
    price: "$12/mo",
    description:
      "A generous daily allowance for coursework and regular study. Start with 7 days free—card required, cancel anytime before the trial ends.",
    features: [
      "7-day free trial",
      "25 mind maps per day",
      "25 quizzes, 25 explanations, and 25 examples per day",
      "Note import & concept expansion",
    ],
    highlighted: true,
    badge: "7-day free trial",
  },
  {
    code: "research",
    name: "Research",
    price: "$29/mo",
    description: "For intensive research with virtually unrestricted access to learning tools.",
    features: [
      "Unlimited mind maps, quizzes, explanations, and examples",
      "Advanced concept exploration",
      "Best for long-running studies",
    ],
    highlighted: false,
    badge: null as string | null,
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;

  return (
    <main className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,rgba(200,241,105,0.08),transparent_58%)] px-4 py-10 font-sans text-foreground sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-lab-lime">
            MindLab pricing
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            Upgrade when you are ready
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/55">
            Start free, try Student with a 7-day free trial, or move to Research for
            intensive work.
          </p>
          {checkout === "processing" ? <CheckoutConfirmation /> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.code}
              className={[
                "flex min-h-full flex-col rounded-2xl border p-6 shadow-[0_12px_34px_rgba(0,0,0,0.12)] transition-colors sm:p-7",
                plan.highlighted
                  ? "border-lab-lime/35 bg-lab-root/80 shadow-[0_16px_48px_rgba(0,0,0,0.22)]"
                  : "border-white/10 bg-lab-surface/85",
              ].join(" ")}
            >
              <div className="mb-6 flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-foreground">{plan.name}</p>
                </div>
                {plan.badge ? (
                  <span className="rounded-md bg-lab-lime px-2 py-1 text-xs font-semibold text-lab-ink">
                    {plan.badge}
                  </span>
                ) : plan.highlighted ? (
                  <span className="rounded-md bg-lab-lime px-2 py-1 text-xs font-semibold text-lab-ink">
                    Popular
                  </span>
                ) : null}
              </div>

              <div className="mb-6">
                <span className="text-4xl font-semibold text-foreground">{plan.price}</span>
                {plan.code === "student" ? (
                  <p className="mt-2 text-xs text-lab-lime">Then $12/mo after trial</p>
                ) : null}
              </div>

              <p className="mb-6 min-h-16 text-sm leading-6 text-white/55">{plan.description}</p>

              <ul className="mb-8 flex-1 space-y-3 text-sm leading-6 text-white/75">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 text-lab-lime">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <PricingAction
                planCode={plan.code as PlanCode}
                highlighted={plan.highlighted}
              />
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-white/40">
          Student free trial lasts 7 days. You will not be charged until the trial
          ends; cancel anytime from the dashboard via{" "}
          <span className="text-white/60">Manage / Cancel</span>. Subscriptions renew
          monthly until cancelled. See our{" "}
          <Link href="/terms" className="text-lab-lime hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-lab-lime hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
