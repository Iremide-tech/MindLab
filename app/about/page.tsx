import type { Metadata } from "next";
import Link from "next/link";
import MindLabMark from "@/components/MindLabMark";
import styles from "../landing.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "MindLab is an AI-powered visual workspace for learning and research—the first product from Orion Cybernetics, founded by Iremide Awobodu.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About MindLab AI",
    description:
      "Built by Orion Cybernetics. Founded by Iremide Awobodu. Mapping how Africa learns—and where intelligence goes next.",
    url: "/about",
  },
};

const principles = [
  {
    title: "Maps over lists",
    body: "Linear notes hide structure. A map makes relationships visible so you can see the whole subject, not just the next bullet.",
  },
  {
    title: "AI that follows the thread",
    body: "Generate, expand, explain, and connect—always in context of the workspace you are already building.",
  },
  {
    title: "Built for return",
    body: "Save workspaces, invite collaborators on paid plans, and come back when the next question appears.",
  },
];

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.wordmark}>
          <MindLabMark className={styles.navMark} />
          <span>
            MINDLAB<span>_AI</span>
          </span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Log in</Link>
          <Link href="/signup" className={styles.navCta}>
            Get started
          </Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroMeta}>
          <span>02 / ABOUT</span>
          <span>ORION CYBERNETICS</span>
        </div>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Why MindLab exists</p>
            <h1>
              KNOWLEDGE
              <br />
              NEEDS A PLACE.
            </h1>
            <p className={styles.intro}>
              Notes scatter. Questions pile up. Connections stay in your head until
              they slip. MindLab is a visual workspace where topics become nodes,
              ideas link together, and AI helps you explore what comes next—without
              losing the trail.
            </p>
            <div className={styles.actions}>
              <Link href="/signup" className={styles.primaryAction}>
                Create a workspace
              </Link>
              <Link href="/pricing" className={styles.textAction}>
                See pricing
              </Link>
            </div>
          </div>
          <div className={styles.heroMark} aria-hidden="true">
            <MindLabMark className={styles.heroMarkSvg} />
          </div>
        </div>
      </section>

      <section className={styles.workflow}>
        <div className={styles.sectionBar}>
          <h2>What we believe</h2>
          <p>Three ideas that shape the product.</p>
        </div>
        <ol>
          {principles.map((item, index) => (
            <li key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  {item.title}
                </strong>
                <span style={{ color: "#bcc2b7", fontSize: "0.9em" }}>
                  {item.body}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.audiences}>
        <article>
          <p className={styles.eyebrow}>For students</p>
          <h2>See the subject as a system.</h2>
          <p>
            Import notes, generate maps from a topic, expand concepts, and quiz
            yourself—so revision is structured, not scattered across tabs.
          </p>
        </article>
        <article>
          <p className={styles.eyebrow}>For researchers</p>
          <h2>Keep every finding on the trail.</h2>
          <p>
            Link questions, sources, and observations in one workspace. Share with
            collaborators when your plan allows, and leave with a map you can reopen.
          </p>
        </article>
      </section>

      <section className={styles.quotes} aria-labelledby="founder-heading">
        <div className={styles.sectionBar}>
          <h2 id="founder-heading">Founder</h2>
          <p>Who is building this.</p>
        </div>
        <div className={styles.quoteGrid} style={{ gridTemplateColumns: "1fr" }}>
          <blockquote className={styles.quoteCard} style={{ minHeight: 0 }}>
            <p className={styles.quoteText} style={{ fontSize: "clamp(18px, 2vw, 22px)" }}>
              Iremide Awobodu
            </p>
            <p style={{ margin: "12px 0 0", color: "#bcc2b7", fontSize: 14, lineHeight: 1.65 }}>
              Founder of Orion Cybernetics and MindLab AI. Building tools that make
              thinking visible—and a company that aims to put Nigerian and African
              talent at the frontier of artificial intelligence.
            </p>
            <footer className={styles.quoteAuthor} style={{ marginTop: 20 }}>
              <a
                href="mailto:iresamuel226@gmail.com"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                iresamuel226@gmail.com
              </a>
            </footer>
          </blockquote>
        </div>
      </section>

      <section className={styles.closing}>
        <p className={styles.eyebrow}>The long game</p>
        <h2>
          ORION
          <br />
          CYBERNETICS.
        </h2>
        <p className={styles.intro} style={{ marginBottom: 20, maxWidth: 560 }}>
          MindLab is chapter one. Orion Cybernetics is the company behind it—and the
          ambition is larger than a single product.
        </p>
        <p className={styles.intro} style={{ marginBottom: 20, maxWidth: 560 }}>
          We are building toward becoming Nigeria&apos;s first serious AGI research
          company: a lab that ships useful systems today while training the depth,
          data, and people required for frontier intelligence tomorrow. Not a copy of
          Silicon Valley. A stack grown here—for African problems, African researchers,
          and a global standard of excellence.
        </p>
        <p className={styles.intro} style={{ marginBottom: 32, maxWidth: 560 }}>
          The goal is simple to say and hard to earn: the most exciting technology
          company on the continent. MindLab is how we start—by teaching machines to
          help humans map what they know. What follows is everything that unlocks.
        </p>
        <div className={styles.actions} style={{ marginTop: 0 }}>
          <Link href="/signup" className={styles.primaryAction}>
            Start free
          </Link>
          <a
            href="mailto:iresamuel226@gmail.com"
            className={styles.textAction}
          >
            Contact founder
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>
          <MindLabMark className={styles.footerMark} />
          © {new Date().getFullYear()} MindLab AI
        </span>
        <span className={styles.footerLinks}>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>A product by Orion</span>
        </span>
      </footer>
    </main>
  );
}
