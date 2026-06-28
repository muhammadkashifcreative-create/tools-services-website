import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useCallback } from "react";
import {
  Search, Loader2, Filter, ChevronDown, ChevronUp, Sparkles, Zap,
  Instagram, Music2, Youtube, Facebook, Twitter, Linkedin,
  Send, MapPin, Twitch, Music, Globe2, ShieldCheck, MousePointerClick,
  Link2, ListChecks, Rocket, Check, Clock4, CreditCard, Wallet, X,
  Wrench, ArrowRight, Package, ShoppingBag, LogIn,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { listServices } from "@/lib/services.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { placeOrder } from "@/lib/orders.functions";
import { createOrderCheckout } from "@/lib/payments.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { listToolProducts, purchaseToolProduct, type ToolProduct } from "@/lib/toolstore.functions";

// Platform → icon + gradient tokens
const PLATFORM_STYLE: Record<string, { icon: typeof Instagram; from: string; to: string; text: string }> = {
  Instagram:    { icon: Instagram, from: "#f09433", to: "#bc1888", text: "text-white" },
  TikTok:       { icon: Music2,    from: "#25F4EE", to: "#FE2C55", text: "text-white" },
  YouTube:      { icon: Youtube,   from: "#ff5858", to: "#c4302b", text: "text-white" },
  Facebook:     { icon: Facebook,  from: "#1877F2", to: "#0a4fb5", text: "text-white" },
  "X (Twitter)":{ icon: Twitter,   from: "#1f2937", to: "#000000", text: "text-white" },
  LinkedIn:     { icon: Linkedin,  from: "#0A66C2", to: "#0a4fb5", text: "text-white" },
  Telegram:     { icon: Send,      from: "#2AABEE", to: "#229ED9", text: "text-white" },
  Spotify:      { icon: Music,     from: "#1DB954", to: "#168f3f", text: "text-white" },
  Twitch:       { icon: Twitch,    from: "#9146FF", to: "#5d2eb8", text: "text-white" },
  "Google Maps":{ icon: MapPin,    from: "#EA4335", to: "#4285F4", text: "text-white" },
  Other:        { icon: Globe2,    from: "#6366f1", to: "#06b6d4", text: "text-white" },
};

function platformStyle(p?: string | null) {
  return PLATFORM_STYLE[p ?? "Other"] ?? PLATFORM_STYLE.Other;
}

export const Route = createFileRoute("/_authenticated/new-order")({
  head: () => ({ meta: [{ title: "New order — Social Padu" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const [mode, setMode] = useState<"choose" | "smm" | "tools">("choose");

  const fetchServices = useServerFn(listServices);
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetchServices(),
    enabled: mode === "smm",
  });

  const fetchTools = useServerFn(listToolProducts);
  const { data: toolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ["toolProducts"],
    queryFn: () => fetchTools(),
    enabled: mode === "tools",
  });
  const fetchCurrency = useServerFn(getUserCurrency);
  const { data: ccy } = useQuery({
    queryKey: ["user-currency"],
    queryFn: () => fetchCurrency(),
    staleTime: 30 * 60 * 1000,
  });
  const symbol = ccy?.symbol ?? "$";
  const code = ccy?.currency ?? "USD";
  const fx = ccy?.rate ?? 1;
  const fmt = (usd: number, dp = 3) => `${symbol}${(usd * fx).toFixed(dp)}`;
  const [platform, setPlatform] = useState<string>("All");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState<"name" | "price-asc" | "price-desc">("name");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [qty, setQty] = useState<number>(100);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [expandedDesc, setExpandedDesc] = useState<Set<string>>(new Set());
  const router = useRouter();
  const qc = useQueryClient();
  const submitOrder = useServerFn(placeOrder);
  const startOrderCheckout = useServerFn(createOrderCheckout);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const mut = useMutation({
    mutationFn: (vars: { serviceId: string; link: string; quantity: number; coupon?: string }) =>
      submitOrder({ data: vars }),
    onSuccess: () => {
      toast.success("Order placed!");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      router.navigate({ to: "/orders" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fetchOrderClientSecret = useCallback(async () => {
    if (!selectedId) throw new Error("No service selected");
    const res = await startOrderCheckout({
      data: {
        serviceId: selectedId,
        link,
        quantity: qty,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in res) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    return res.clientSecret;
  }, [selectedId, link, qty, startOrderCheckout]);

  const openCardCheckout = () => {
    if (!link) { toast.error("Please enter a link first"); return; }
    setCheckoutOpen(true);
  };
  const closeCardCheckout = () => {
    setCheckoutOpen(false);
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const platforms = useMemo(() => {
    const set = new Set<string>();
    (services ?? []).forEach((s) => s.platform && set.add(s.platform));
    return ["All", ...Array.from(set).sort()];
  }, [services]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (services ?? [])
      .filter((s) => platform === "All" || s.platform === platform)
      .forEach((s) => s.category && set.add(s.category));
    return ["All", ...Array.from(set).sort()];
  }, [services, platform]);

  const filtered = useMemo(() => {
    const rows = (services ?? []).filter((s) => {
      if (platform !== "All" && s.platform !== platform) return false;
      if (category !== "All" && s.category !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${s.id} ${s.provider_service_id ?? ""} ${s.name} ${s.category ?? ""} ${s.type ?? ""} ${s.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === "price-asc") rows.sort((a, b) => Number(a.rate) - Number(b.rate));
    else if (sort === "price-desc") rows.sort((a, b) => Number(b.rate) - Number(a.rate));
    else rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [services, platform, category, query, sort]);

  const selected = useMemo(
    () => (services ?? []).find((s) => s.id === selectedId) ?? null,
    [services, selectedId],
  );

  const charge = selected ? +(Number(selected.rate) * qty / 1000).toFixed(2) : 0;
  const discount = couponApplied ? +(charge * (couponApplied.percent / 100)).toFixed(2) : 0;
  const finalCharge = +(charge - discount).toFixed(2);

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (code === "WELCOME5") {
      setCouponApplied({ code, percent: 5 });
      setCouponError(null);
    } else {
      setCouponApplied(null);
      setCouponError("Invalid coupon code");
    }
  };
  const removeCoupon = () => {
    setCouponApplied(null);
    setCoupon("");
    setCouponError(null);
  };

  const toggleDesc = (id: string) => {
    setExpandedDesc((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">

        {/* ── Category chooser ── */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setMode("smm")}
            className={`group flex flex-1 items-center gap-4 rounded-2xl border p-5 text-left transition-all ${
              mode === "smm"
                ? "border-primary/60 bg-primary/5 shadow-glow"
                : "border-border/60 bg-card hover:border-primary/40 hover:bg-accent/30"
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-soft" style={{ background: "linear-gradient(135deg,#f09433,#bc1888)" }}>
              <Instagram className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Social Media Services</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(services ?? []).length > 0 ? `${(services ?? []).length.toLocaleString()} services` : "Instagram, TikTok, YouTube & more"}</p>
            </div>
            {mode === "smm" && <Check className="ml-auto h-5 w-5 text-primary" />}
          </button>

          <button
            onClick={() => setMode("tools")}
            className={`group flex flex-1 items-center gap-4 rounded-2xl border p-5 text-left transition-all ${
              mode === "tools"
                ? "border-primary/60 bg-primary/5 shadow-glow"
                : "border-border/60 bg-card hover:border-primary/40 hover:bg-accent/30"
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-soft" style={{ background: "linear-gradient(135deg,#e07b2e,#f59e0b)" }}>
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Tools Store</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(toolsData?.products ?? []).length > 0 ? `${(toolsData?.products ?? []).length} products` : "Premium accounts & subscriptions"}</p>
            </div>
            {mode === "tools" && <Check className="ml-auto h-5 w-5 text-primary" />}
          </button>
        </div>

        {/* ── Tools Store view ── */}
        {mode === "tools" && (
          <div>
            {toolsLoading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-border/30" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
                  <div className="absolute inset-2 flex items-center justify-center rounded-full bg-primary/10">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Loading tools catalog…</p>
              </div>
            ) : (toolsData?.products ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 text-lg font-bold">No tools available</h2>
                <p className="mt-1 text-sm text-muted-foreground">The tools catalog is empty or not connected.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(toolsData!.products as ToolProduct[]).map((p) => (
                  <ToolCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SMM Services view ── */}
        {mode === "smm" && (
        <div>
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 p-5 shadow-elegant sm:rounded-3xl sm:p-7 lg:p-10" style={{ background: "var(--gradient-hero)" }}>
          <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
                <Sparkles className="h-3 w-3" /> Catalog
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Place a <span className="text-gradient">new boost</span>.
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                {(services ?? []).length.toLocaleString()} services across {Math.max(platforms.length - 1, 0)} platforms. Pick a service, paste your link, and watch it grow.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip icon={Zap}        label="Starts in < 60s" />
              <Chip icon={ShieldCheck}label="No password ever" />
              <Chip icon={Check}      label="Auto refill" />
              <Chip icon={Clock4}     label="Delivered < 72 hrs" />
            </div>
          </div>
        </div>

        {/* How it works strip */}
        <div className="mt-6 grid gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft sm:grid-cols-2 sm:gap-2 lg:grid-cols-4">
          {[
            { n: 1, t: "Choose a service",   d: "Filter by platform & type",      icon: MousePointerClick },
            { n: 2, t: "Paste your link",    d: "Profile, post, video or page",   icon: Link2 },
            { n: 3, t: "Set the quantity",   d: "Live total before you confirm",  icon: ListChecks },
            { n: 4, t: "We deliver fast",    d: "Track progress in real time",    icon: Rocket },
          ].map((s) => {
            const I = s.icon;
            return (
              <div key={s.n} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-accent/40">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
                  <I className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-[10px] font-bold tabular-nums text-primary">{String(s.n).padStart(2, "0")}</span>
                    {s.t}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.d}</p>
                </div>
              </div>
            );
          })}
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (services ?? []).length === 0 ? (
          <div className="mt-12 rounded-2xl border border-border/60 bg-card p-12 text-center shadow-soft">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">No services yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              An admin needs to sync the catalog. Visit the Admin panel.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              {/* Platform pill bar */}
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                {platforms.map((p) => {
                  const active = platform === p;
                  const style = platformStyle(p === "All" ? "Other" : p);
                  const Icon = p === "All" ? Sparkles : style.icon;
                  return (
                    <button
                      key={p}
                      onClick={() => { setPlatform(p); setCategory("All"); }}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-transparent text-white shadow-glow"
                          : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                      style={active ? { background: `linear-gradient(135deg, ${style.from}, ${style.to})` } : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {p === "All" ? "All platforms" : p}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-soft sm:p-4">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                <div className="relative col-span-2 sm:flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search by ID, name, type, description..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
                  />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="min-w-0 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
                >
                  {categories.map((c) => <option key={c}>{c === "All" ? "All categories" : c}</option>)}
                </select>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="min-w-0 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
                >
                  <option value="name">Sort: A–Z</option>
                  <option value="price-asc">Price: low → high</option>
                  <option value="price-desc">Price: high → low</option>
                </select>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Filter className="h-3 w-3" /> {filtered.length.toLocaleString()} match
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {filtered.length === 0 && (
                  <div className="rounded-2xl border border-border/60 bg-card px-5 py-12 text-center text-sm text-muted-foreground">
                    No services match your filters.
                  </div>
                )}
                {filtered.map((s) => {
                  const isSelected = selectedId === s.id;
                  const isExpanded = expandedDesc.has(s.id);
                  const desc = s.description ?? "";
                  const longDesc = desc.length > 140;
                  const ps = platformStyle(s.platform);
                  const PIcon = ps.icon;
                  return (
                    <div
                      key={s.id}
                      className={`group relative overflow-hidden rounded-2xl border bg-card shadow-soft transition ${
                        isSelected
                          ? "border-primary/60 shadow-elegant ring-2 ring-primary/20"
                          : "border-border/60 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
                      }`}
                    >
                      {/* Accent stripe */}
                      <div className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(180deg, ${ps.from}, ${ps.to})` }} aria-hidden />
                      <div className="flex flex-col gap-4 p-4 pl-5 sm:p-5 sm:pl-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-soft"
                            style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}
                            aria-hidden
                          >
                            <PIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                                ID {s.provider_service_id}
                              </span>
                              <span
                                className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                                style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}
                              >
                                {s.platform ?? "Other"}
                              </span>
                              {s.type && (
                                <span className="rounded-md border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                                  {s.type}
                                </span>
                              )}
                              {s.category && (
                                <span className="truncate text-[11px] text-muted-foreground">{s.category}</span>
                              )}
                            </div>
                            <h3 className="mt-2 font-semibold leading-snug">{s.name}</h3>
                          {desc && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <p className={longDesc && !isExpanded ? "line-clamp-2" : ""}>{desc}</p>
                              {longDesc && (
                                <button
                                  onClick={() => toggleDesc(s.id)}
                                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                  {isExpanded ? <><ChevronUp className="h-3 w-3" /> Less</> : <><ChevronDown className="h-3 w-3" /> Full description</>}
                                </button>
                              )}
                            </div>
                          )}
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5">
                                Min <span className="font-semibold text-foreground tabular-nums">{s.min_quantity.toLocaleString()}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5">
                                Max <span className="font-semibold text-foreground tabular-nums">{s.max_quantity.toLocaleString()}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Zap className="h-3 w-3" /> instant
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0 sm:w-auto">
                          <div className="min-w-0 text-left sm:text-right">
                            <p className="truncate text-lg font-bold tabular-nums text-gradient sm:text-xl">{fmt(Number(s.rate))}</p>
                            <p className="text-[11px] text-muted-foreground">per 1,000 · {code}</p>
                          </div>
                          <button
                            onClick={() => { setSelectedId(s.id); setQty(s.min_quantity); }}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                              isSelected ? "bg-primary/10 text-primary" : "text-primary-foreground shadow-glow hover:opacity-90"
                            }`}
                            style={isSelected ? undefined : { background: "var(--gradient-accent)" }}
                          >
                            {isSelected ? "Selected" : "Order now"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="h-fit rounded-2xl border border-border/60 p-5 shadow-elegant sm:p-6 lg:sticky lg:top-20" style={{ background: "var(--gradient-card)" }}>
              <h3 className="text-lg font-bold">Order summary</h3>
              {!selected ? (
                <div className="mt-6 rounded-xl border border-dashed border-border/60 p-6 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Pick a service to start your order.</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    mut.mutate({ serviceId: selected.id, link, quantity: qty, coupon: couponApplied?.code });
                  }}
                  className="mt-4 space-y-4"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Service</p>
                    <p className="text-sm font-medium">{selected.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Link</label>
                    <input
                      required
                      type="url"
                      placeholder="https://..."
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Quantity ({selected.min_quantity.toLocaleString()}–{selected.max_quantity.toLocaleString()})
                    </label>
                    <input
                      required
                      type="number"
                      min={selected.min_quantity}
                      max={selected.max_quantity}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
                    />
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="truncate tabular-nums">{fmt(Number(selected.rate))} / 1k</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="truncate tabular-nums">{fmt(charge, 2)}</span>
                    </div>
                    {couponApplied && (
                      <div className="mt-1 flex items-center justify-between gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <span>Coupon {couponApplied.code} (−{couponApplied.percent}%)</span>
                        <span className="tabular-nums">−{fmt(discount, 2)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <span className="font-medium">Total</span>
                      <span className="truncate text-xl font-bold tabular-nums text-gradient">{fmt(finalCharge, 2)}</span>
                    </div>
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">{code}</p>
                  </div>

                  {/* Coupon */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Coupon code</label>
                    {couponApplied ? (
                      <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
                        <span className="inline-flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-mono font-bold">{couponApplied.code}</span>
                          <span className="text-xs text-muted-foreground">{couponApplied.percent}% off applied</span>
                        </span>
                        <button type="button" onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
                      </div>
                    ) : (
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="WELCOME5"
                          value={coupon}
                          onChange={(e) => { setCoupon(e.target.value); setCouponError(null); }}
                          className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm uppercase outline-none focus:ring-2 ring-ring"
                        />
                        <button
                          type="button"
                          onClick={applyCoupon}
                          className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-1 text-[11px] text-destructive">{couponError}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={mut.isPending}
                    className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:opacity-60"
                    style={{ background: "var(--gradient-accent)" }}
                  >
                    {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="mr-2 h-4 w-4" /> Pay from wallet</>}
                  </button>
                  <button
                    type="button"
                    onClick={openCardCheckout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-semibold transition hover:bg-accent"
                  >
                    <CreditCard className="h-4 w-4" /> Pay with card
                  </button>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Card pays this order directly. Wallet stays untouched.
                  </p>
                </form>
              )}
            </aside>
          </div>
        )}
        </div>
        )}

      </div>

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-background shadow-2xl">
            <button
              onClick={closeCardCheckout}
              className="absolute right-3 top-3 z-10 rounded-full bg-background/90 p-2 text-foreground shadow hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="max-h-[90vh] overflow-y-auto">
              <EmbeddedCheckoutProvider
                stripe={getStripe()}
                options={{ fetchClientSecret: fetchOrderClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </span>
  );
}

function ToolCard({ product }: { product: ToolProduct }) {
  const qc = useQueryClient();
  const purchase = useServerFn(purchaseToolProduct);
  const [qty, setQty] = useState(1);
  const mut = useMutation({
    mutationFn: () => purchase({ data: { productId: product.id, qty } }),
    onSuccess: (r) => {
      toast.success(`Purchased! ${r.codes.length} code(s) delivered.`);
      qc.invalidateQueries({ queryKey: ["profile"] });
      if (r.codes?.length) navigator.clipboard?.writeText(r.codes.join("\n")).catch(() => {});
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const total = +(Number(product.your_price) * qty).toFixed(2);
  const outOfStock = product.in_stock === false;

  return (
    <div className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:border-primary/40 hover:shadow-elegant">
      <div className="h-1 w-full" style={{ background: "var(--gradient-accent)" }} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-soft" style={{ background: "var(--gradient-accent)" }}>
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name_en}</h3>
            <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${outOfStock ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"}`}>
              {outOfStock ? "Out of stock" : product.stock > 0 ? `${product.stock} left` : "In stock"}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Qty</p>
            <input
              type="number" min={1} max={Math.max(1, product.stock || 50)} value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
              disabled={outOfStock}
              className="w-16 rounded-md border border-border/60 bg-background px-2 py-1 text-sm text-right"
            />
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums text-gradient">${total.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">per unit</p>
          </div>
        </div>
        <button
          onClick={() => mut.mutate()}
          disabled={outOfStock || mut.isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--gradient-accent)" }}
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingBag className="h-3.5 w-3.5" /> Buy · ${total.toFixed(2)}</>}
        </button>
      </div>
    </div>
  );
}