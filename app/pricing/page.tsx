import CheckoutConfirmation from "@/components/CheckoutConfirmation";
import PricingAction from "@/components/PricingAction";
import type { PlanCode } from "@/lib/paywall";

const plans = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    description: "Try MindLab with a small daily allowance for each learning tool.",
    features: ["2 mind maps per day", "2 quizzes, 2 explanations, and 2 examples per day", "Basic research maps"],
    highlighted: false,
  },
  {
    code: "student",
    name: "Student",
    price: "$12/mo",
    description: "A generous daily allowance for coursework and regular study.",
    features: ["25 mind maps per day", "25 quizzes, 25 explanations, and 25 examples per day", "Concept expansion & priority workflow"],
    highlighted: true,
  },
  {
    code: "research",
    name: "Research",
    price: "$29/mo",
    description: "For intensive research with virtually unrestricted access to learning tools.",
    features: ["Unlimited mind maps, quizzes, explanations, and examples", "Advanced concept exploration", "Best for long-running studies"],
    highlighted: false,
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;

  return (
    <main className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,rgba(200,241,105,0.08),transparent_58%)] px-6 py-10 text-foreground sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-lab-lime">
            MindLab pricing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Upgrade when you are ready
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/55">
            Start free, then move to a plan that supports deeper learning and faster research.
          </p>
          {checkout === "processing" ? (
            <CheckoutConfirmation />
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.code}
              className={[
                "rounded-lg border p-6 transition-colors",
                plan.highlighted
                  ? "border-lab-lime/35 bg-lab-root/80 shadow-[0_16px_48px_rgba(0,0,0,0.22)]"
                  : "border-white/10 bg-lab-surface/85",
              ].join(" ")}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-foreground">{plan.name}</p>
                </div>
                {plan.highlighted ? (
                  <span className="rounded-md bg-lab-lime px-2 py-1 text-xs font-semibold text-lab-ink">
                    Popular
                  </span>
                ) : null}
              </div>

              <div className="mb-6">
                <span className="text-4xl font-semibold text-foreground">{plan.price}</span>
              </div>

              <p className="mb-6 min-h-16 text-sm text-white/55">{plan.description}</p>

              <ul className="mb-8 space-y-3 text-sm text-white/75">
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
      </div>
    </main>
  );
}
