import Link from "next/link";

const workflow = [
  "Create a workspace",
  "Connect ideas",
  "Explore with AI",
  "Save & revisit",
  "Collaborate",
];

const benefits = [
  ["✦", "Explore ideas with AI"],
  ["↗", "Connect related topics"],
  ["▣", "Save your knowledge"],
  ["⌁", "Collaborate with others"],
  ["◫", "Build reusable workspaces"],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          MindLab<span className="text-lab-lime">AI</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-5">
          <Link
            href="/pricing"
            className="px-3 py-2 text-sm text-white/65 transition hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="px-3 py-2 text-sm text-white/65 transition hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-lab-lime px-4 py-2.5 text-sm font-semibold text-lab-ink transition hover:bg-lab-lime-light"
          >
            Get started <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>

      <section className="relative px-6 pb-16 pt-14 sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-170 bg-[linear-gradient(180deg,rgba(29,49,31,0.34),transparent_78%)]" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-lab-lime">
            A workspace for curious minds
          </p>
          <h1 className="text-4xl font-semibold leading-[1.04] tracking-tight sm:text-7xl">
            Think. Connect.
            <br className="sm:hidden" /> Learn.
          </h1>
          <p className="mt-5 text-lg font-medium text-white/85 sm:text-xl">
            Your AI-powered workspace for learning and research.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            Organize ideas, connect topics, explore concepts with AI, and build
            knowledge that stays with you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-lab-lime px-6 py-3.5 font-semibold text-lab-ink transition hover:bg-lab-lime-light"
            >
              Get Started <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#workflow"
              className="rounded-lg border border-white/15 bg-white/4 px-6 py-3.5 font-medium text-white/85 transition hover:bg-white/8"
            >
              See how it works
            </Link>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-14 max-w-6xl sm:mt-16">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-lab-surface shadow-[0_32px_100px_rgba(0,0,0,0.45)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lab-lime/10 text-sm text-lab-lime">
                  ◉
                </span>
                <div>
                  <p className="text-sm font-medium">Climate systems</p>
                  <p className="text-xs text-white/40">Research workspace</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/55">
                <span className="rounded-md border border-white/10 px-2.5 py-1.5">Saved map</span>
                <span className="rounded-md border border-white/10 px-2.5 py-1.5">Share</span>
              </div>
            </div>

            <div className="grid md:grid-cols-[minmax(0,1fr)_290px]">
              <div className="min-w-0 p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                    Knowledge map
                  </p>
                  <span className="text-xs text-lab-lime">3 connected ideas</span>
                </div>

                <div className="relative h-75 overflow-hidden rounded-xl border border-white/7 bg-lab-canvas sm:h-85">
                  <div className="absolute inset-0 bg-[radial-gradient(#596357_0.7px,transparent_0.7px)] bg-size-[18px_18px] opacity-35" />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 800 400"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                  >
                    <path d="M400 54V112H170V166M400 112H630V166M170 220V290" fill="none" stroke="#68745f" strokeOpacity=".7" strokeWidth="1.5" />
                    <circle cx="400" cy="112" r="3" fill="var(--lab-lime)" />
                    <circle cx="170" cy="220" r="3" fill="var(--lab-lime)" />
                  </svg>

                  <div className="absolute left-1/2 top-[4%] w-[48%] -translate-x-1/2 rounded-lg border border-lab-lime/35 bg-lab-root px-2 py-2.5 text-center shadow-[0_0_28px_rgba(200,241,105,0.08)] sm:w-[34%] sm:px-4">
                    <p className="text-[11px] font-semibold text-[#e7f5cd] sm:text-sm">Climate systems</p>
                    <p className="mt-0.5 text-[9px] text-white/45 sm:text-xs">How Earth stays in balance</p>
                  </div>

                  <div className="absolute left-[2%] top-[42%] w-[43%] rounded-lg border border-white/10 bg-lab-card px-2 py-2.5 sm:left-[5%] sm:w-[34%] sm:px-4">
                    <p className="text-[10px] font-medium sm:text-sm">Ocean currents</p>
                    <p className="mt-0.5 text-[9px] text-white/40 sm:text-xs">Move heat around the planet</p>
                  </div>
                  <div className="absolute right-[2%] top-[42%] w-[43%] rounded-lg border border-white/10 bg-lab-card px-2 py-2.5 sm:right-[5%] sm:w-[34%] sm:px-4">
                    <p className="text-[10px] font-medium sm:text-sm">Carbon cycle</p>
                    <p className="mt-0.5 text-[9px] text-white/40 sm:text-xs">Exchange across Earth systems</p>
                  </div>
                  <div className="absolute bottom-[2%] left-[2%] w-[43%] rounded-lg border border-lab-copper/30 bg-lab-copper-surface px-2 py-2.5 sm:bottom-[4%] sm:left-[5%] sm:w-[34%] sm:px-4">
                    <p className="text-[10px] font-medium text-lab-copper-soft sm:text-sm">Thermohaline circulation</p>
                    <p className="mt-0.5 text-[9px] text-white/40 sm:text-xs">A deep-ocean current system</p>
                  </div>

                  <span className="absolute bottom-[5%] right-[5%] rounded-full border border-white/10 bg-lab-card px-2.5 py-1 text-[9px] text-white/45 sm:text-[10px]">
                    + Add idea
                  </span>
                </div>
              </div>

              <aside className="border-t border-white/10 bg-lab-surface p-5 sm:p-6 md:border-l md:border-t-0">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-lab-lime">
                  <span aria-hidden="true">✦</span> AI exploration
                </div>
                <h2 className="mt-5 text-lg font-semibold leading-snug">
                  Thermohaline circulation
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  Differences in water temperature and salinity help drive deep
                  ocean currents, moving heat and nutrients across the globe.
                </p>
                <div className="mt-5 rounded-lg border border-white/8 bg-lab-canvas/70 p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-white/35">Connected to</p>
                  <p className="mt-2 text-sm text-white/75">Ocean currents <span className="px-1 text-white/30">·</span> Climate regulation</p>
                </div>
                <button
                  type="button"
                  className="mt-5 w-full rounded-lg border border-lab-lime/20 bg-lab-lime/7 px-4 py-2.5 text-sm font-medium text-lab-lime-soft"
                >
                  Explore deeper <span aria-hidden="true">→</span>
                </button>
              </aside>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-white/35">
            Ideas become easier to explore when you can see how they connect.
          </p>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-8 border-y border-white/8 bg-white/2 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="mb-7 text-center text-xs font-medium uppercase tracking-[0.18em] text-white/40">
            From first thought to shared knowledge
          </p>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {workflow.map((step, index) => (
              <li key={step} className="flex items-center gap-3 lg:gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-lab-lime/25 text-xs text-lab-lime">
                  0{index + 1}
                </span>
                <span className="text-sm text-white/75">{step}</span>
                {index < workflow.length - 1 && (
                  <span aria-hidden="true" className="ml-auto hidden text-white/25 lg:block">→</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-lab-lime">Made for discovery</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">A place to think things through.</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <article className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
              <span className="text-xs text-lab-lime">01 / STUDENTS</span>
              <h3 className="mt-4 text-lg font-semibold">Learn with a clearer view.</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Bring scattered ideas into one visual space, then connect concepts as you learn.
              </p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
              <span className="text-xs text-lab-copper">02 / RESEARCHERS</span>
              <h3 className="mt-4 text-lg font-semibold">Follow the connections.</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Explore connections, organize research, and build collaborative knowledge spaces.
              </p>
            </article>
          </div>
        </div>

        <div className="lg:pl-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">Why MindLab?</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Everything connected.</h2>
          <ul className="mt-6 divide-y divide-white/8">
            {benefits.map(([icon, label]) => (
              <li key={label} className="flex items-center gap-4 py-3.5">
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-sm text-lab-lime">
                  {icon}
                </span>
                <span className="text-sm text-white/75">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-white/8 px-6 py-20 text-center sm:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-lab-lime">Your next idea is waiting</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Your ideas are connected.
          <br className="hidden sm:block" /> Now explore them.
        </h2>
        <p className="mt-4 text-white/55">Start building your first MindLab workspace.</p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-lab-lime px-6 py-3.5 font-semibold text-lab-ink transition hover:bg-lab-lime-light"
        >
          Get Started <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className="border-t border-white/8 px-6 py-6 text-center text-xs text-white/35">
        © {new Date().getFullYear()} MindLab AI. Think. Connect. Learn.
      </footer>
    </main>
  );
}