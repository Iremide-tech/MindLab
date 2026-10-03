import PricingAction from "@/components/PricingAction";
import type { PlanCode } from "@/lib/paywall";

const plans = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    description: "For quick experiments and personal exploration.",
    features: ["3 AI generations per day", "Basic research maps", "Manual save and share"],
    highlighted: false,
  },
  {
    code: "student",
    name: "Student",
    price: "$12/mo",
    description: "A good fit for learning, coursework, and deeper research.",
    features: ["25 AI generations per day", "Concept expansion & explanations", "Priority workflow"],
    highlighted: true,
  },
  {
    code: "research",
    name: "Research",
    price: "$29/mo",
    description: "For ongoing projects and heavier exploration.",
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
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            MindLab pricing
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Upgrade when you are ready
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Start free, then move to a plan that supports deeper learning and faster research.
          </p>
          {checkout === "processing" ? (
            <p role="status" className="mx-auto mt-5 max-w-2xl text-sm text-cyan-200">
              We are confirming your payment with Paystack. Your plan will update after the payment is verified.
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.code}
              className={[
                "rounded-2xl border p-6 shadow-lg transition",
                plan.highlighted
                  ? "border-cyan-400 bg-cyan-500/10 shadow-cyan-500/20"
                  : "border-slate-800 bg-slate-900/70",
              ].join(" ")}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{plan.name}</p>
                </div>
                {plan.highlighted ? (
                  <span className="rounded-full bg-cyan-500 px-2 py-1 text-xs font-semibold text-slate-950">
                    Popular
                  </span>
                ) : null}
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
              </div>

              <p className="mb-6 min-h-16 text-sm text-slate-300">{plan.description}</p>

              <ul className="mb-8 space-y-3 text-sm text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 text-cyan-400">✓</span>
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
