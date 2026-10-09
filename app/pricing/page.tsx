import PricingAction from "@/components/PricingAction";
import type { PlanCode } from "@/lib/paywall";

const plans = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    description: "For quick experiments with low node generation and concise formula help.",
    features: ["3 AI generations per day", "Basic research maps", "Manual save and share"],
    highlighted: false,
  },
  {
    code: "student",
    name: "Student",
    price: "$12/mo",
    description: "For coursework with high node generation, formulas, and worked examples.",
    features: ["25 AI generations per day", "Concept expansion & explanations", "Priority workflow"],
    highlighted: true,
  },
  {
    code: "research",
    name: "Research",
    price: "$29/mo",
    description: "For quantitative research with high node generation, formula coverage, and worked calculations.",
    features: ["Unlimited AI generations", "Advanced synthesis", "Best for long-running studies"],
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
            <p role="status" className="mx-auto mt-5 max-w-2xl text-sm text-lab-lime-soft">
              We are confirming your payment with Stripe. Your plan will update after the payment is verified.
            </p>
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
