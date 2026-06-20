import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Clock, ArrowRight, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BLOG_POSTS, getPost, type BlogPost } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) return { meta: [{ title: "Post not found — iGroBrand Blog" }] };
    return {
      meta: [
        { title: `${post.title} — iGroBrand Blog` },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:image", content: post.image },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.description },
        { name: "twitter:image", content: post.image },
      ],
    };
  },
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  component: BlogPostPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Post not found</h1>
        <p className="mt-2 text-muted-foreground">The article you're looking for doesn't exist.</p>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Back to all posts</Link>
      </div>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
      <SiteFooter />
    </div>
  ),
});

function BlogPostPage() {
  const post = Route.useLoaderData() as BlogPost;
  const d = new Date(post.publishedAt);
  const fmt = d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const related = post.related.map(getPost).filter(Boolean) as ReturnType<typeof getPost>[];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{post.category}</span>
        </nav>

        <span className="inline-block rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
          {post.category}
        </span>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">{post.description}</p>

        <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {fmt}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {post.readMinutes} min read</span>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 shadow-soft">
          <img src={post.image} alt={post.imageAlt} width={1280} height={720} className="aspect-[16/10] w-full object-cover" />
        </div>

        <div className="prose-wrap mt-10 space-y-7 text-[15px] leading-relaxed text-foreground/90 sm:text-base">
          <p className="text-lg text-foreground sm:text-xl">{post.intro}</p>

          {post.sections.map((s, i) => (
            <section key={i} className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{s.heading}</h2>
              {s.paragraphs.map((para, j) => (
                <p key={j} dangerouslySetInnerHTML={{ __html: para }} />
              ))}
              {s.bullets && (
                <ul className="ml-5 list-disc space-y-1.5 text-foreground/90">
                  {s.bullets.map((b, k) => <li key={k}>{b}</li>)}
                </ul>
              )}
            </section>
          ))}

          <section className="mt-12 rounded-2xl border border-border/60 bg-muted/30 p-6 sm:p-8">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Frequently asked questions</h2>
            <div className="mt-5 space-y-5">
              {post.faqs.map((f, i) => (
                <div key={i}>
                  <p className="font-semibold text-foreground">{f.q}</p>
                  <p className="mt-1 text-foreground/80">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Conclusion</h2>
            <p dangerouslySetInnerHTML={{ __html: post.conclusion }} />
          </section>
        </div>

        {/* Inline CTA */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
          <h3 className="text-lg font-bold sm:text-xl">Ready to put this into practice?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse our live catalog of growth services or talk to support if you'd like a tailored plan.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
              style={{ background: "var(--gradient-accent)" }}
            >
              Browse services <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-semibold hover:bg-accent">
              Create an account
            </Link>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-14">
            <h3 className="text-lg font-bold sm:text-xl">Keep reading</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((r) => r && (
                <Link key={r.slug} to="/blog/$slug" params={{ slug: r.slug }} className="group overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-primary/40">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={r.image} alt={r.imageAlt} loading="lazy" width={1280} height={720} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                  </div>
                  <div className="p-4">
                    <p className="text-xs uppercase text-muted-foreground">{r.category}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">{r.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
      <SiteFooter />
    </div>
  );
}

// Reference BLOG_POSTS so static analyzers don't tree-shake the list helper.
export const __BLOG_COUNT = BLOG_POSTS.length;