import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Check, Sparkles, Clock4, Headphones,
  Lock, Star, BookOpen, Download, CreditCard, Palette, Code2, Bot, Briefcase, Infinity as InfinityIcon, Globe2,
} from "lucide-react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Social Padu — Software Guide Books" },
      { name: "heleket", content: "04c9813d" },
      { name: "description", content: "Practical guide books for computer software — Excel, Photoshop, Python, AI tools and more. Step-by-step PDF guides, instant download after secure card checkout." },
      { property: "og:title", content: "Social Padu — Software Guide Books" },
      { property: "og:description", content: "Step-by-step software guide books. Buy once, download instantly, keep forever." },
    ],
  }),
  component: Landing,
});

const categories: Array<{ icon: typeof BookOpen; name: string; items: string[]; tint: string }> = [
  { icon: Briefcase, name: "Office & Productivity", items: ["Excel & spreadsheets", "Word & documents", "Presentations"], tint: "from-emerald-500/20 to-green-500/20" },
  { icon: Palette, name: "Design & Creative", items: ["Photo editing", "Illustration tools", "Video editing"], tint: "from-pink-500/20 to-orange-500/20" },
  { icon: Code2, name: "Development & Coding", items: ["Programming languages", "Code editors", "Databases"], tint: "from-violet-500/20 to-indigo-500/20" },
  { icon: Bot, name: "AI & Automation", items: ["AI assistants", "Prompt writing", "Workflow automation"], tint: "from-amber-500/20 to-red-500/20" },
];

const features = [
  { icon: Download, title: "Instant download", desc: "Your PDF is ready the second payment clears — on screen and saved to your library forever." },
  { icon: InfinityIcon, title: "Yours for life", desc: "Buy once, keep forever. Re-download any book from your library as many times as you like." },
  { icon: BookOpen, title: "Step-by-step guides", desc: "Written for real people — clear chapters, screenshots and exercises that take you from basics to mastery." },
  { icon: Lock, title: "Secure card checkout", desc: "Payments handled end-to-end by Stripe. We never see or store your card details." },
  { icon: Headphones, title: "24/7 support", desc: "Open a case from your dashboard and real humans answer in minutes — not days." },
  { icon: Globe2, title: "Local currency", desc: "Prices shown in your local currency with live exchange rates, so you know exactly what you pay." },
];

const stats = [
  { v: "PDF", l: "High-quality format" },
  { v: "< 60s", l: "Checkout to download" },
  { v: "∞", l: "Lifetime re-downloads" },
  { v: "24/7", l: "Live support" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden brand-gradient">
        <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
        <div aria-hidden className="pointer-events-none absolute -left-40 -top-20 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full blur-3xl animate-blob" style={{ animationDelay: "-6s", background: "oklch(0.70 0.22 30 / 0.20)" }} />

        <div aria-hidden className="pointer-events-none absolute left-4 top-1/2 hidden -translate-y-1/2 -rotate-90 select-none text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground/70 lg:block">
          EST · 2026 — Social Padu™ Guide Books
        </div>
        <div aria-hidden className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 rotate-90 select-none text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground/70 lg:block">
          v.2026 / Instant Download / Learn Faster
        </div>

        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl grid-cols-12 items-center gap-6 px-4 pb-10 pt-16 sm:px-8 sm:pt-20 lg:pb-16 lg:pt-28">
          {/* Left: content block */}
          <div className="col-span-12 lg:col-span-7 lg:pr-8">
            <motion.div
              initial="hidden" animate="show" variants={fadeUp}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary backdrop-blur"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Software Guide Books · Digital Bookstore
            </motion.div>

            <motion.h1
              initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.05 }}
              className="font-display text-[clamp(2.75rem,7vw,5.75rem)] font-bold leading-[0.95] tracking-[-0.035em]"
            >
              Master any software,<br />
              one <span className="italic font-medium text-muted-foreground/80">guide book</span><br />
              <span className="relative inline-block">
                <span className="shimmer-text">at a time.</span>
                <svg aria-hidden viewBox="0 0 300 12" className="absolute -bottom-1 left-0 h-3 w-full text-primary/70" preserveAspectRatio="none">
                  <path d="M2 8 C 60 2, 140 12, 298 4" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.12 }}
              className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Practical, step-by-step guide books for Excel, Photoshop, Python, AI tools and more. <span className="font-semibold text-foreground">Pay securely by card</span>, download your PDF instantly, keep it forever.
            </motion.p>

            <motion.div
              initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.18 }}
              className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
            >
              <Link
                to="/books"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:-translate-y-0.5 hover:opacity-95"
                style={{ background: "var(--gradient-accent)" }}
              >
                Browse the library
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-7 py-4 text-sm font-semibold backdrop-blur transition hover:border-primary/40 hover:bg-accent"
              >
                Create free account
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </motion.div>

            <motion.div
              initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.28 }}
              className="mt-10 flex items-center gap-5 text-xs text-muted-foreground"
            >
              <div className="flex -space-x-2">
                {["#f59e0b","#f97316","#ea580c","#fb923c"].map((c,i)=>(
                  <div key={i} className="h-7 w-7 rounded-full border-2 border-background" style={{background:c}} />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5 text-amber-500">
                  {Array.from({length:5}).map((_,i)=>(<Star key={i} className="h-3.5 w-3.5 fill-current"/>))}
                </div>
                <span className="font-medium text-foreground">Loved by learners</span>
                <span>· From Malaysia to the world</span>
              </div>
            </motion.div>
          </div>

          {/* Right: floating visual stack */}
          <div className="col-span-12 lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto aspect-[4/5] w-full max-w-md"
            >
              {/* Download ready panel */}
              <div className="absolute right-0 top-0 w-[78%] overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-elegant backdrop-blur-xl animate-float">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Download ready</p>
                <p className="mt-2 font-display text-3xl font-bold tracking-tight">Excel Mastery</p>
                <p className="mt-1 text-xs text-muted-foreground">From zero to power user · 214 pages</p>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-background/60 px-3 py-2.5 text-sm font-bold">
                  <Download className="h-4 w-4 text-primary" /> excel-mastery.pdf
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5"/> Delivered in 12 seconds
                </div>
              </div>

              {/* Offset library tile */}
              <div className="absolute -left-2 top-[42%] w-[58%] rotate-[-3deg] rounded-2xl border border-border/60 bg-card/90 p-4 shadow-elegant backdrop-blur-xl animate-float-slow">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-glow" style={{background:"var(--gradient-accent)"}}>
                    <BookOpen className="h-5 w-5"/>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">My Library</p>
                    <p className="text-sm font-semibold tabular-nums">7 books owned</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-3/4" style={{background:"var(--gradient-accent)"}}/>
                </div>
                <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">Lifetime access · Re-download anytime</p>
              </div>

              {/* Bottom right small tile */}
              <div className="absolute bottom-2 right-6 w-[50%] rotate-[4deg] rounded-2xl border border-border/60 bg-card/90 p-4 shadow-elegant backdrop-blur-xl animate-float">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <CreditCard className="h-4 w-4"/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Paid with card</p>
                    <p className="truncate text-sm font-semibold">Stripe secure</p>
                  </div>
                </div>
              </div>

              {/* Orbiting accent dot */}
              <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 orbit-slow">
                <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-primary shadow-glow"/>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.l}
                initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.3+i*0.06}}
                className="border-l-2 border-primary/40 pl-4"
              >
                <p className="font-display text-3xl font-bold tabular-nums sm:text-4xl text-gradient">{s.v}</p>
                <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{s.l}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="relative border-t border-border/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Library</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              One library. <span className="text-gradient">Every skill.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              From spreadsheets to AI assistants — find the guide book for the software you want to master, pay once, download instantly.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c, idx) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: (idx % 4) * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                >
                  <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${c.tint} opacity-0 transition group-hover:opacity-100`} />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                  </div>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {c.items.map((s) => (
                      <li key={s} className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {s}
                      </li>
                    ))}
                  </ul>
                  <Link to="/books" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                    Browse books <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why Social Padu</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Built for people who learn by doing.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: (idx % 3) * 0.05 }}
                  className="rounded-2xl border border-border/60 bg-card p-7 shadow-soft transition hover:shadow-elegant"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative border-t border-border/60 py-16 sm:py-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2" style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.20 50 / 0.4), transparent)" }} />
          <div className="absolute left-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full opacity-10 blur-3xl" style={{ background: "oklch(0.78 0.20 50)" }} />
          <div className="absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full opacity-10 blur-3xl" style={{ background: "oklch(0.72 0.22 35)" }} />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center sm:mb-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" /> How it works
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Reading in <span className="text-gradient">four steps.</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              From sign-up to your first page — the whole process takes under 2 minutes.
            </p>
          </div>

          <div className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute top-10 left-0 right-0 hidden lg:block" aria-hidden>
              <div className="mx-auto h-px max-w-[75%]" style={{ background: "linear-gradient(90deg, transparent 0%, oklch(0.72 0.20 50 / 0.5) 20%, oklch(0.72 0.20 50 / 0.5) 80%, transparent 100%)" }} />
            </div>

            {[
              { n: "01", t: "Create account", d: "Sign up free with your email in under 30 seconds. No card required to browse.", icon: Sparkles, color: "#f09433" },
              { n: "02", t: "Pick your book", d: "Browse the library by category — Office, Design, Coding, AI — with prices in your currency.", icon: BookOpen, color: "#e07b2e" },
              { n: "03", t: "Pay with card", d: "Secure Stripe checkout. Your payment details never touch our servers.", icon: Lock, color: "#c8621f" },
              { n: "04", t: "Download & learn", d: "Your PDF is ready instantly and stays in your library for life.", icon: Clock4, color: "#a84e18" },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.12 }}
                  className="group relative rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-elegant hover:border-primary/40"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" style={{ background: `${s.color}22` }} />

                  <div className="relative mb-5 flex items-center justify-between">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white text-sm font-black shadow-glow z-10 relative" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)` }}>
                        {s.n}
                      </div>
                      <div className="absolute inset-0 rounded-xl blur-md opacity-60" style={{ background: s.color }} />
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <p className="text-base font-bold tracking-tight">{s.t}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>

                  <div className="mt-5 h-0.5 w-8 rounded-full transition-all duration-300 group-hover:w-16" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                </motion.div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/books"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-90"
              style={{ background: "var(--gradient-accent)" }}
            >
              <Sparkles className="h-4 w-4" /> Browse the library — no account needed
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border/60 bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Loved by readers</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What people say.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { name: "Marco D.", role: "Freelance designer", quote: "The Photoshop guide paid for itself in a week. Clear chapters, real examples, and I could start reading seconds after paying." },
              { name: "Sasha L.", role: "Student", quote: "Finally an Excel book that doesn't assume I already know Excel. Downloaded it instantly and it lives in my library whenever I need it." },
              { name: "Elena R.", role: "Small business owner", quote: "Bought the AI tools guide to speed up my admin work. Practical from page one — and support answered my question within minutes." },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-border/60 bg-card p-7 shadow-soft">
                <div className="flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border/60 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Common questions.</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "How do I receive my book?", a: "Instantly. As soon as your payment is confirmed, the PDF is available to download from your Library — and it stays there for life, so you can re-download it any time, on any device." },
              { q: "What format are the books in?", a: "High-quality PDF, readable on any phone, tablet, laptop or e-reader. No DRM hoops — the book you buy is yours to keep." },
              { q: "Which payment methods do you accept?", a: "Credit and debit cards, processed securely by Stripe. Depending on your country, Stripe may also offer local payment methods at checkout." },
              { q: "Are prices shown in my currency?", a: "Yes. We auto-detect your location and show prices in your local currency at live exchange rates. The charge itself is processed in USD." },
              { q: "What if I have a problem with a book?", a: "Open a support case from your dashboard with your purchase ID. If a download is broken or you were charged without receiving access, we fix it or refund you — see our refund policy for digital goods." },
            ].map((f) => (
              <details key={f.q} className="group rounded-xl border border-border/60 bg-card p-5 shadow-soft open:shadow-elegant">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-left font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/60 py-16 sm:py-24">
        <div className="absolute inset-0 brand-gradient" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Ready to <span className="text-gradient">level up?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Practical software guide books at honest prices — instant download, secure checkout, real support.
          </p>
          <Link
            to="/books"
            className="mt-10 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95"
            style={{ background: "var(--gradient-accent)" }}
          >
            Browse the library <ArrowRight className="h-4 w-4" />
          </Link>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Buy once, keep forever", "Instant PDF download", "Secure Stripe checkout"].map((x) => (
              <li key={x} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> {x}</li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
