import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Instagram, Music2, Youtube, Facebook, Twitter, Linkedin,
  Send, MapPin, Twitch, Music, ShieldCheck, Zap, TrendingUp, ArrowRight, Check,
  Sparkles, Globe2, Clock4, Headphones, RefreshCw, Lock, Star,
} from "lucide-react";
import { motion } from "framer-motion";
import growth3d from "@/assets/growth-3d.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Social Padu — Grow Your Social Presence" },
      { name: "description", content: "Real, fast social media growth for Instagram, TikTok, YouTube, X, LinkedIn, Telegram, Spotify, Twitch and more. Transparent pricing, instant delivery." },
      { property: "og:title", content: "Social Padu — Grow Your Social Presence" },
      { property: "og:description", content: "Real, fast social media growth across every major platform. Transparent pricing, instant delivery." },
    ],
  }),
  component: Landing,
});

const platforms: Array<{
  icon: typeof Instagram; name: string; services: string[]; tint: string;
}> = [
  { icon: Instagram, name: "Instagram", services: ["Followers", "Likes", "Views", "Reels", "Story views"], tint: "from-pink-500/20 to-orange-500/20" },
  { icon: Music2, name: "TikTok", services: ["Followers", "Likes", "Views", "Shares", "Live views"], tint: "from-cyan-500/20 to-pink-500/20" },
  { icon: Youtube, name: "YouTube", services: ["Subscribers", "Views", "Watch time", "Likes", "Comments"], tint: "from-red-500/20 to-rose-500/20" },
  { icon: Twitter, name: "X / Twitter", services: ["Followers", "Likes", "Retweets", "Impressions"], tint: "from-slate-500/20 to-blue-500/20" },
  { icon: Facebook, name: "Facebook", services: ["Page likes", "Followers", "Post likes", "Reactions"], tint: "from-blue-500/20 to-indigo-500/20" },
  { icon: Linkedin, name: "LinkedIn", services: ["Followers", "Post likes", "Connections", "Endorsements"], tint: "from-sky-500/20 to-blue-600/20" },
  { icon: Send, name: "Telegram", services: ["Channel members", "Post views", "Reactions", "Votes"], tint: "from-cyan-500/20 to-sky-500/20" },
  { icon: Music, name: "Spotify", services: ["Followers", "Plays", "Saves", "Monthly listeners"], tint: "from-emerald-500/20 to-green-500/20" },
  { icon: Twitch, name: "Twitch", services: ["Followers", "Channel views", "Live viewers", "Subs"], tint: "from-violet-500/20 to-purple-500/20" },
  { icon: MapPin, name: "Google Maps", services: ["Reviews", "5★ ratings", "Q&A votes"], tint: "from-amber-500/20 to-red-500/20" },
];

const features = [
  { icon: Zap, title: "Sub-minute start", desc: "Most orders begin processing within 60 seconds of submission." },
  { icon: ShieldCheck, title: "Account-safe", desc: "We never ask for passwords. Public link is all we need." },
  { icon: RefreshCw, title: "Auto refill", desc: "Drops are detected and topped up automatically on supported services." },
  { icon: Headphones, title: "24/7 support", desc: "Real humans answer in minutes — not days." },
  { icon: TrendingUp, title: "Real growth", desc: "Premium-tier delivery from real accounts wherever available." },
  { icon: Lock, title: "Secure payments", desc: "Stripe-grade checkout with end-to-end encryption." },
];

const stats = [
  { v: "5,786+", l: "Services available" },
  { v: "16", l: "Platforms covered" },
  { v: "< 60s", l: "Avg. start time" },
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
        {/* Warm ember atmosphere */}
        <div aria-hidden className="pointer-events-none absolute -left-40 -top-20 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full blur-3xl animate-blob" style={{ animationDelay: "-6s", background: "oklch(0.70 0.22 30 / 0.20)" }} />

        {/* Editorial vertical labels */}
        <div aria-hidden className="pointer-events-none absolute left-4 top-1/2 hidden -translate-y-1/2 -rotate-90 select-none text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground/70 lg:block">
          EST · 2026 — Social Padu™ Growth Engine
        </div>
        <div aria-hidden className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 rotate-90 select-none text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground/70 lg:block">
          v.2026 / Real Delivery / 15+ Networks
        </div>

        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl grid-cols-12 items-center gap-6 px-4 pb-10 pt-16 sm:px-8 sm:pt-20 lg:pb-16 lg:pt-28">
          {/* Left: 60% asymmetric content block */}
          <div className="col-span-12 lg:col-span-7 lg:pr-8">
            <motion.div
              initial="hidden" animate="show" variants={fadeUp}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary backdrop-blur"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live · Malaysia's #1 Social Growth Platform
            </motion.div>

            <motion.h1
              initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.05 }}
              className="font-display text-[clamp(2.75rem,7vw,5.75rem)] font-bold leading-[0.95] tracking-[-0.035em]"
            >
              Make the<br />
              algorithm <span className="italic font-medium text-muted-foreground/80">notice</span><br />
              <span className="relative inline-block">
                <span className="shimmer-text">your work.</span>
                <svg aria-hidden viewBox="0 0 300 12" className="absolute -bottom-1 left-0 h-3 w-full text-primary/70" preserveAspectRatio="none">
                  <path d="M2 8 C 60 2, 140 12, 298 4" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.12 }}
              className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Real followers, views, likes, plays and reviews — delivered in seconds across <span className="font-semibold text-foreground">Instagram, TikTok, YouTube, Spotify</span> and 11 more networks. Transparent pricing, zero passwords, sub-minute starts.
            </motion.p>

            <motion.div
              initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.18 }}
              className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
            >
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:-translate-y-0.5 hover:opacity-95"
                style={{ background: "var(--gradient-accent)" }}
              >
                Start boosting in 60s
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/services"
                className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-7 py-4 text-sm font-semibold backdrop-blur transition hover:border-primary/40 hover:bg-accent"
              >
                Browse 5,786+ services
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
                <span className="font-medium text-foreground">4.9/5</span>
                <span>· Trusted in Malaysia & beyond</span>
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
              {/* Big number panel */}
              <div className="absolute right-0 top-0 w-[78%] overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-elegant backdrop-blur-xl animate-float">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Followers today</p>
                <p className="mt-2 font-display text-5xl font-bold tabular-nums tracking-tight">+12,438</p>
                <div className="mt-4 flex h-16 items-end gap-1">
                  {[40,55,38,72,60,85,68,92,76,100,88,95].map((h,i)=>(
                    <div key={i} className="flex-1 rounded-t-sm" style={{height:`${h}%`,background:"var(--gradient-accent)",opacity:0.85}}/>
                  ))}
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <TrendingUp className="h-3.5 w-3.5"/> +218% vs last week
                </div>
              </div>

              {/* Offset platform tile */}
              <div className="absolute -left-2 top-[38%] w-[58%] rotate-[-3deg] rounded-2xl border border-border/60 bg-card/90 p-4 shadow-elegant backdrop-blur-xl animate-float-slow">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-glow" style={{background:"var(--gradient-accent)"}}>
                    <Instagram className="h-5 w-5"/>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Instagram · Reel views</p>
                    <p className="text-sm font-semibold tabular-nums">25,000 / 25,000</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-full" style={{background:"var(--gradient-accent)"}}/>
                </div>
                <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">Completed · 38s</p>
              </div>

              {/* Bottom right small tile */}
              <div className="absolute bottom-2 right-6 w-[50%] rotate-[4deg] rounded-2xl border border-border/60 bg-card/90 p-4 shadow-elegant backdrop-blur-xl animate-float">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Music2 className="h-4 w-4"/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">TikTok</p>
                    <p className="truncate text-sm font-semibold">+4,210 likes</p>
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

        {/* Infinite marquee */}
        <div className="relative border-y border-border/40 bg-background/30 py-4 backdrop-blur">
          <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            <div className="flex shrink-0 items-center gap-12 pr-12 marquee-track">
              {[...platforms, ...platforms].map((p, i) => {
                const Icon = p.icon;
                return (
                  <div key={i} className="flex shrink-0 items-center gap-2.5 text-sm font-medium text-muted-foreground">
                    <Icon className="h-4 w-4 text-primary"/>
                    <span>{p.name}</span>
                    <span className="text-border">/</span>
                  </div>
                );
              })}
            </div>
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

      {/* Platforms */}
      <section id="platforms" className="relative border-t border-border/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Platforms</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              One dashboard. <span className="text-gradient">Every network.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              From Instagram reels to Spotify saves, Google Maps reviews to Telegram channels — boost engagement wherever your audience lives.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((p, idx) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: (idx % 3) * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                >
                  <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${p.tint} opacity-0 transition group-hover:opacity-100`} />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                  </div>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {p.services.map((s) => (
                      <li key={s} className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {s}
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                    Browse services <ArrowRight className="h-3.5 w-3.5" />
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
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Built for serious creators.</h2>
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
      <section id="how" className="border-t border-border/60 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Live in four steps.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Sign up", d: "Free account with email or Google. 30 seconds.", icon: Sparkles },
              { n: "02", t: "Top up", d: "Add funds to your wallet — pay only for what you use.", icon: Lock },
              { n: "03", t: "Place order", d: "Pick service, paste link, set quantity. Done.", icon: Globe2 },
              { n: "04", t: "Watch it grow", d: "Live tracking from start to completion.", icon: Clock4 },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-soft"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold tabular-nums text-primary">{s.n}</span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="font-semibold">{s.t}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border/60 bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Loved by creators</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What people say.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { name: "Marco D.", role: "Music producer", quote: "Spotify saves arrived within minutes. My latest single is finally getting the reach it deserves." },
              { name: "Sasha L.", role: "TikTok creator", quote: "Clean dashboard, real delivery. The TikTok views looked completely organic. Will reorder." },
              { name: "Elena R.", role: "Local business owner", quote: "Google Maps reviews boosted our visibility. Walk-ins went up almost overnight." },
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
              { q: "Is it safe for my account?", a: "Yes. We never ask for your password — only the public link to your profile or post. All delivery is fully compliant with platform terms." },
              { q: "How fast will my order start?", a: "Most services begin within 60 seconds. All orders are fully processed within less than 72 business hours." },
              { q: "Do you offer refunds?", a: "If a service fails to deliver or is canceled, we refund your wallet automatically. Refill guarantees are available on supported services." },
              { q: "Which payment methods do you accept?", a: "Stripe-powered card payments plus wallet top-ups. Crypto rails are coming soon." },
              { q: "Can I order in bulk?", a: "Absolutely. Enterprise and reseller pricing is available — contact us for a custom quote." },
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
        <img
          src={growth3d}
          alt=""
          aria-hidden
          width={1024}
          height={1024}
          loading="lazy"
          className="pointer-events-none absolute right-4 top-1/2 hidden h-72 w-72 -translate-y-1/2 rounded-3xl object-cover opacity-60 animate-float lg:block"
        />
        <img
          src={growth3d}
          alt=""
          aria-hidden
          width={1024}
          height={1024}
          loading="lazy"
          className="pointer-events-none absolute left-4 top-1/2 hidden h-56 w-56 -translate-y-1/2 -scale-x-100 rounded-3xl object-cover opacity-40 animate-float-slow lg:block"
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Ready to <span className="text-gradient">grow?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Malaysia's trusted social media growth platform — 5,786+ services, instant delivery, zero passwords.
          </p>
          <Link
            to="/auth"
            className="mt-10 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95"
            style={{ background: "var(--gradient-accent)" }}
          >
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["No subscription", "Pay as you go", "Cancel anytime"].map((x) => (
              <li key={x} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> {x}</li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
