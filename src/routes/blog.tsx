import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BLOG_POSTS } from "@/lib/blog";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Growth Playbooks for Every Platform | iGroBrand" },
      { name: "description", content: "Honest, in-depth playbooks on growing Instagram, TikTok, YouTube, Spotify, LinkedIn, Telegram and more in 2026." },
      { property: "og:title", content: "iGroBrand Blog — Growth Playbooks" },
      { property: "og:description", content: "Honest, in-depth playbooks on growing on every major social platform in 2026." },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [featured, ...rest] = BLOG_POSTS;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden brand-gradient">
        <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur">
              <BookOpen className="h-3 w-3" /> The iGroBrand Blog
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Growth playbooks <span className="text-gradient">that actually work</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              No fluff, no recycled threads. Long-form guides on every platform that matters in 2026 — written by operators, not influencers.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Featured */}
        <Link
          to="/blog/$slug"
          params={{ slug: featured.slug }}
          className="group grid overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant md:grid-cols-2"
        >
          <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto">
            <img src={featured.image} alt={featured.imageAlt} className="h-full w-full object-cover transition group-hover:scale-[1.02]" width={1280} height={720} />
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
            <span className="w-fit rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
              Featured · {featured.category}
            </span>
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{featured.title}</h2>
            <p className="text-sm text-muted-foreground sm:text-base">{featured.excerpt}</p>
            <Meta post={featured} />
            <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Read the playbook <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>

        {/* Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={p.image} alt={p.imageAlt} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" width={1280} height={720} />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <span className="w-fit rounded-md border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  {p.category}
                </span>
                <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{p.title}</h3>
                <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
                <Meta post={p} />
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Meta({ post }: { post: { publishedAt: string; readMinutes: number } }) {
  const d = new Date(post.publishedAt);
  const fmt = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fmt}</span>
      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.readMinutes} min read</span>
    </div>
  );
}