
import Link from "next/link";

const features = [
  {
    icon: "✦",
    title: "AI Knowledge Maps",
    description:
      "Transform complex topics into interactive visual maps.",
  },
  {
    icon: "⌘",
    title: "Discover Connections",
    description:
      "Connect concepts and understand relationships between ideas.",
  },
  {
    icon: "◈",
    title: "Explore Deeper",
    description:
      "Expand concepts and uncover new areas of knowledge.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050507] text-white">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
        >
          MindLab
          <span className="text-purple-400">AI</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm text-white/70 transition hover:text-white"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-medium transition hover:bg-purple-400"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pb-24 pt-24">
        <div className="absolute left-1/2 top-0 -z-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[140px]" />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs text-purple-300">
            THINK DIFFERENTLY · EXPLORE DEEPLY
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            Your ideas are
            <br />
            <span className="bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-500 bg-clip-text text-transparent">
              connected.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/50">
            MindLab transforms the way you learn and research.
            Visualize concepts, explore relationships, and build
            your own interactive knowledge universe.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-purple-500 px-7 py-4 font-medium transition hover:bg-purple-400"
            >
              Start exploring →
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-7 py-4 font-medium transition hover:bg-white/10"
            >
              Explore the lab
            </Link>
          </div>
        </div>

        {/* Visual preview */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="rounded-3xl border border-purple-400/20 bg-white/[0.03] p-4 shadow-2xl shadow-purple-900/20 backdrop-blur-xl">
            <div className="rounded-2xl border border-white/10 bg-black/60 p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">
                  KNOWLEDGE SPACE
                </p>

                <span className="text-xs text-purple-400">
                  ● LIVE CONCEPT GRAPH
                </span>
              </div>

              <div className="flex min-h-[280px] items-center justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-purple-400/50 bg-purple-500/10 text-center shadow-[0_0_80px_rgba(168,85,247,0.25)]">
                  <span className="font-semibold">
                    Knowledge
                  </span>

                  <div className="absolute -right-44 top-0 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70">
                    Physics
                  </div>

                  <div className="absolute -left-44 bottom-0 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70">
                    Philosophy
                  </div>

                  <div className="absolute -bottom-24 left-1/2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70">
                    Curiosity
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-purple-400">
            Built for curious minds
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Explore knowledge differently
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-purple-400/30 hover:bg-purple-500/[0.05]"
            >
              <div className="mb-6 text-3xl text-purple-400">
                {feature.icon}
              </div>

              <h3 className="text-lg font-semibold">
                {feature.title}
              </h3>

              <p className="mt-3 leading-7 text-white/50">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-white/10 bg-white/[0.02] px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            From question to discovery
          </h2>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              ["01", "Enter a topic", "Start with any question or subject."],
              ["02", "Build your map", "Let AI organize related concepts."],
              ["03", "Explore connections", "Expand, connect, and discover."],
            ].map(([number, title, description]) => (
              <div key={number}>
                <p className="text-sm text-purple-400">
                  {number}
                </p>

                <h3 className="mt-3 font-semibold">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-28 text-center">
        <h2 className="text-4xl font-bold sm:text-5xl">
          Start building your
          <br />
          <span className="text-purple-400">
            knowledge universe.
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-white/50">
          Your next discovery could begin with one question.
        </p>

        <Link
          href="/signup"
          className="mt-8 inline-block rounded-xl bg-purple-500 px-7 py-4 font-medium transition hover:bg-purple-400"
        >
          Create your account →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-white/30">
        © {new Date().getFullYear()} MindLab AI. Explore. Connect. Discover.
      </footer>
    </main>
  );
}