import type { Metadata } from "next";
import Link from "next/link";
import MindLabMark from "@/components/MindLabMark";
import HeroMap from "./hero-map";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "MindLab AI — connected thinking",
  description:
    "Turn notes and questions into a visual map you can explore with AI, save, and share.",
};

const workflow = [
  "Create a workspace",
  "Add a topic",
  "Connect ideas",
  "Ask AI",
  "Return when ready",
];

const quotes = [
  {
    text: "The only true wisdom is in knowing you know nothing.",
    author: "Socrates",
  },
  {
    text: "I think, therefore I am.",
    author: "René Descartes",
  },
  {
    text: "Education is the kindling of a flame, not the filling of a vessel.",
    author: "Plutarch",
  },
  {
    text: "The important thing is not to stop questioning.",
    author: "Albert Einstein",
  },
  {
    text: "Knowledge is of no value unless you put it into practice.",
    author: "Anton Chekhov",
  },
  {
    text: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
  },
];

export default function LandingPage() {
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
          <span>01 / KNOWLEDGE, IN CONTEXT</span>
          <span>SCROLL TO EXPLORE</span>
        </div>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A visual workspace for learning</p>
            <h1>
              FOLLOW
              <br />
              THE THREAD.
            </h1>
            <p className={styles.intro}>
              MindLab turns notes and questions into an explorable map—so each new
              idea has somewhere to lead.
            </p>
            <div className={styles.actions}>
              <Link href="/signup" className={styles.primaryAction}>
                Create a workspace
              </Link>
              <a href="#workflow" className={styles.textAction}>
                How it works
              </a>
            </div>
          </div>
          <div className={styles.heroMark} aria-hidden="true">
            <MindLabMark className={styles.heroMarkSvg} />
          </div>
        </div>
      </section>

      <section className={styles.canvasSection} aria-labelledby="canvas-heading">
        <div className={styles.sectionBar}>
          <h2 id="canvas-heading">A map is a place to think.</h2>
          <p>Select a topic, then follow its connections.</p>
        </div>
        <HeroMap />
      </section>

      <section id="workflow" className={styles.workflow}>
        <div className={styles.sectionBar}>
          <h2>Start anywhere.</h2>
          <p>Your workspace grows with your questions.</p>
        </div>
        <ol>
          {workflow.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.quotes} aria-labelledby="quotes-heading">
        <div className={styles.sectionBar}>
          <h2 id="quotes-heading">Voices on knowledge.</h2>
          <p>Ideas that map how we learn.</p>
        </div>
        <div className={styles.quoteGrid}>
          {quotes.map((quote) => (
            <blockquote key={quote.author} className={styles.quoteCard}>
              <p className={styles.quoteText}>
                &ldquo;{quote.text}&rdquo;
              </p>
              <footer className={styles.quoteAuthor}>
                — {quote.author}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className={styles.audiences}>
        <article>
          <p className={styles.eyebrow}>For students</p>
          <h2>Make the whole subject visible.</h2>
          <p>
            Bring scattered notes together, see what connects, and identify the
            questions worth asking next.
          </p>
        </article>
        <article>
          <p className={styles.eyebrow}>For researchers</p>
          <h2>Keep the trail to every finding.</h2>
          <p>
            Link sources, questions, and observations in one workspace that stays
            readable as the work develops.
          </p>
        </article>
      </section>

      <section className={styles.closing}>
        <p className={styles.eyebrow}>Your next idea needs a place to land</p>
        <h2>
          BEGIN WITH
          <br />
          ONE QUESTION.
        </h2>
        <Link href="/signup" className={styles.primaryAction}>
          Create a workspace
        </Link>
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
