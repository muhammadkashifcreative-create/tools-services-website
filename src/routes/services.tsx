import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Search, Loader2, Sparkles, ArrowRight, Globe2,
  Instagram, Music2, Youtube, Facebook, Twitter, Linkedin,
  Send, MapPin, Twitch, Music, ShieldCheck, Zap, Check,
} from "lucide-react";
import { listServices } from "@/lib/services.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const PLATFORM_STYLE: Record<string, { icon: typeof Instagram; from: string; to: string }> = {
  Instagram:     { icon: Instagram, from: "#f09433", to: "#bc1888" },
  TikTok:        { icon: Music2,    from: "#25F4EE", to: "#FE2C55" },
  YouTube:       { icon: Youtube,   from: "#ff5858", to: "#c4302b" },
  Facebook:      { icon: Facebook,  from: "#1877F2", to: "#0a4fb5" },
  "X (Twitter)": { icon: Twitter,   from: "#1f2937", to: "#000000" },
  LinkedIn:      { icon: Linkedin,  from: "#0A66C2", to: "#0a4fb5" },
  Telegram:      { icon: Send,      from: "#2AABEE", to: "#229ED9" },
  Spotify:       { icon: Music,     from: "#1DB954", to: "#168f3f" },
  Twitch:        { icon: Twitch,    from: "#9146FF", to: "#5d2eb8" },
  "Google Maps": { icon: MapPin,    from: "#EA4335", to: "#4285F4" },
  Other:         { icon: Globe2,    from: "#6366f1", to: "#06b6d4" },
};

function pStyle(p?: string | null) {
  return PLATFORM_STYLE[p ?? "Other"] ?? PLATFORM_STYLE.Other;
}

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "All Services & Prices — iGroBrand" },
      { name: "description", content: "Browse every social media boosting service: Instagram, TikTok, YouTube, Spotify, Google Maps reviews and more. Live prices in your local currency." },
      { property: "og:title", content: "All Services & Prices — iGroBrand" },
    ],
  }),
  component: PublicServicesPage,
});

function PublicServicesPage() {
  const fetchServices = useServerFn(listServices);
  const fetchCurrency = useServerFn(getUserCurrency);
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetchServices(),
  });
  const { data: ccy } = useQuery({
    queryKey: ["user-currency"],
    queryFn: () => fetchCurrency(),
    staleTime: 30 * 60 * 1000,
  });
  const [platform, setPlatform] = useState<string>("All");
  const [query, setQuery] = useState("");

  const symbol = ccy?.symbol ?? "$";
  const code = ccy?.currency ?? "USD";
  const fx = ccy?.rate ?? 1;
  const fmt = (usd: number) => {
    const v = usd * fx;
    if (v >= 1000) return `${symbol}${v.toFixed(0)}`;
    if (v >= 1) return `${symbol}${v.toFixed(2)}`;
    return `${symbol}${v.toFixed(3)}`;
  };

  const platforms = useMemo(() => {
    const set = new Set<string>();
    (services ?? []).forEach((s) => s.platform && set.add(s.platform));
    return ["All", ...Array.from(set).sort()];
  }, [services]);

  const filtered = useMemo(() => {
    const rows = (services ?? []).filter((s) => {
      if (platform !== "All" && s.platform !== platform) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${s.name} ${s.category ?? ""} ${s.type ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [services, platform, query]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden brand-gradient">
        <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur">
              <Sparkles className="h-3 w-3" /> Live catalog
            </span>
            <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Every service. <span className="text-gradient">One price.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {(services ?? []).length.toLocaleString()} services across {Math.max(platforms.length - 1, 0)} platforms.
              Prices shown in <span className="font-semibold text-foreground">{code}</span>
              {ccy?.country && code !== "USD" && (
                <> for visitors in <span className="font-semibold text-foreground">{ccy.country}</span></>
              )}.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Chip icon={Zap} label="Instant start" />
              <Chip icon={ShieldCheck} label="No password ever" />
              <Chip icon={Check} label="Auto refill" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search services..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filtered.length.toLocaleString()} match
            </span>
          </div>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
            {platforms.map((p) => {
              const active = platform === p;
              const s = pStyle(p === "All" ? "Other" : p);
              const Icon = p === "All" ? Sparkles : s.icon;
              return (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active ? "border-transparent text-white shadow-glow"
                           : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  style={active ? { background: `linear-gradient(135deg, ${s.from}, ${s.to})` } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {p === "All" ? "All platforms" : p}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">
            No services match your search.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const ps = pStyle(s.platform);
              const PIcon = ps.icon;
              return (
                <div
                  key={s.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
                >
                  <div className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(180deg, ${ps.from}, ${ps.to})` }} />
                  <div className="p-5 pl-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-soft" style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}>
                        <PIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}>
                            {s.platform ?? "Other"}
                          </span>
                          {s.type && (
                            <span className="rounded-md border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                              {s.type}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{s.name}</h3>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Min – Max</p>
                        <p className="text-xs font-medium tabular-nums">
                          {s.min_quantity.toLocaleString()} – {s.max_quantity.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold tabular-nums text-gradient">{fmt(Number(s.rate))}</p>
                        <p className="text-[10px] text-muted-foreground">per 1,000 · {code}</p>
                      </div>
                    </div>
                    <Link
                      to="/auth"
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
                      style={{ background: "var(--gradient-accent)" }}
                    >
                      Order now <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </span>
  );
}