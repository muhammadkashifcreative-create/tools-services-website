import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useCallback } from "react";
import {
  Search, Loader2, Filter, ChevronDown, ChevronUp, Sparkles, Zap,
  Instagram, Music2, Youtube, Facebook, Twitter, Linkedin,
  Send, MapPin, Twitch, Music, Globe2, ShieldCheck, MousePointerClick,
  Link2, ListChecks, Rocket, Check, Clock4, CreditCard, Wallet, X,
  Wrench, ArrowRight, ArrowLeft, Package, Copy, CheckCheck, Lock,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { listServices } from "@/lib/services.functions";
import { getUserCurrency } from "@/lib/geo.functions";
import { listToolProducts, purchaseToolProduct, createToolCheckout, confirmToolCardPurchase, type ToolProduct } from "@/lib/toolstore.functions";
import { TiltCard } from "@/components/TiltCard";
import { placeOrder } from "@/lib/orders.functions";
import { createOrderCheckout } from "@/lib/payments.functions";
import { getStripe, getStripeEnvironment, isStripeConfigured } from "@/lib/stripe";
import { EmbeddedCheckoutProvider, EmbeddedCheckout, Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

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

export const Route = createFileRoute("/_authenticated/dashboard/new-order")({
  head: () => ({ meta: [{ title: "New order — Social Padu" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const [mode, setMode] = useState<"choose" | "smm" | "tools">("choose");
  const router = useRouter();

  const fetchServices = useServerFn(listServices);
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetchServices(),
    enabled: mode === "smm",
  });

  // ── Tools Store ──
  const fetchToolProducts = useServerFn(listToolProducts);
  const purchaseTool = useServerFn(purchaseToolProduct);
  const createToolCheckoutFn = useServerFn(createToolCheckout);
  const confirmToolCardFn = useServerFn(confirmToolCardPurchase);
  const { data: toolData, isLoading: toolsLoading } = useQuery({
    queryKey: ["toolProducts"],
    queryFn: () => fetchToolProducts(),
    enabled: mode === "tools",
  });
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [toolSheetOpen, setToolSheetOpen] = useState(false);
  const [toolQty, setToolQty] = useState(1);
  const [toolCoupon, setToolCoupon] = useState("");
  const [toolCouponApplied, setToolCouponApplied] = useState<{ code: string; percent?: number; fixedLocal?: number } | null>(null);
  const [toolCouponError, setToolCouponError] = useState<string | null>(null);
  const [toolCardSecret, setToolCardSecret] = useState<string | null>(null);
  const [toolCardLoading, setToolCardLoading] = useState(false);
  const [codesResult, setCodesResult] = useState<{ name: string; codes: string[] } | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const selectedTool = selectedToolId ? (toolData?.products ?? []).find((p) => p.id === selectedToolId) ?? null : null;

  const applyToolCoupon = () => {
    const c = toolCoupon.trim().toUpperCase();
    if (c === "WELCOME5") { setToolCouponApplied({ code: c, percent: 5 }); setToolCouponError(null); }
    else if (c === "GEMIPRO10") {
      if (selectedToolId !== "6") { setToolCouponApplied(null); setToolCouponError("This coupon is only valid for Gemini Pro 18 Months"); }
      else { setToolCouponApplied({ code: c, fixedLocal: 10 }); setToolCouponError(null); }
    } else { setToolCouponApplied(null); setToolCouponError("Invalid coupon code"); }
  };

  const openTool = (id: string) => {
    setSelectedToolId(id); setToolQty(1);
    setToolCoupon(""); setToolCouponApplied(null); setToolCouponError(null);
    setToolCardSecret(null);
  };
  const closeTool = () => { setSelectedToolId(null); setToolSheetOpen(false); setToolCardSecret(null); };

  const openToolCard = async () => {
    if (!selectedToolId || !isStripeConfigured()) { toast.error("Card payments not available"); return; }
    setToolCardLoading(true);
    try {
      const res = await createToolCheckoutFn({ data: { productId: selectedToolId, qty: toolQty, coupon: toolCouponApplied?.code, environment: getStripeEnvironment() } });
      if (!res.clientSecret) throw new Error("Could not create payment session");
      setToolCardSecret(res.clientSecret);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to start card payment"); }
    finally { setToolCardLoading(false); }
  };

  const toolWalletMut = useMutation({
    mutationFn: async () => {
      if (!selectedToolId) throw new Error("No product selected");
      return purchaseTool({ data: { productId: selectedToolId, qty: toolQty, ...(toolCouponApplied?.code ? { coupon: toolCouponApplied.code } : {}) } });
    },
    onSuccess: (r) => {
      const product = (toolData?.products ?? []).find((p) => p.id === selectedToolId);
      setCodesResult({ name: product?.name_en ?? "Tool", codes: r.codes });
      closeTool();
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
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

  // Tool computed values — MUST be after fx is defined
  const toolPriceLocal = selectedTool ? +(Number(selectedTool.your_price) * fx).toFixed(2) : 0;
  const toolDiscount = toolCouponApplied
    ? toolCouponApplied.fixedLocal ?? +(toolPriceLocal * toolQty * ((toolCouponApplied.percent ?? 0) / 100)).toFixed(2)
    : 0;
  const toolTotal = Math.max(0, +(toolPriceLocal * toolQty - toolDiscount).toFixed(2));
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
      router.navigate({ to: "/dashboard/orders" });
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
        {mode === "choose" && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> New Order
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What would you like to order?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Choose a category to continue.</p>
            </div>

            <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
              {/* Social Media Services */}
              <button
                onClick={() => setMode("smm")}
                className="group flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-soft transition-all hover:border-primary/60 hover:shadow-glow hover:-translate-y-1"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-soft transition group-hover:scale-110" style={{ background: "linear-gradient(135deg,#f09433,#bc1888)" }}>
                  <Instagram className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-lg font-bold">Social Media Services</p>
                  <p className="mt-1 text-sm text-muted-foreground">Instagram, TikTok, YouTube & more</p>
                  <p className="mt-2 text-xs font-semibold text-primary">{(services ?? []).length > 0 ? `${(services ?? []).length.toLocaleString()} services available` : "5,786+ services"}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>

              {/* Tools Store */}
              <button
                onClick={() => setMode("tools")}
                className="group flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-soft transition-all hover:border-primary/60 hover:shadow-glow hover:-translate-y-1"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-soft transition group-hover:scale-110" style={{ background: "linear-gradient(135deg,#e07b2e,#f59e0b)" }}>
                  <Wrench className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-lg font-bold">Tools Store</p>
                  <p className="mt-1 text-sm text-muted-foreground">Premium accounts & subscriptions</p>
                  <p className="mt-2 text-xs font-semibold text-primary">Instant code delivery</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Browse tools <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── SMM Services ── */}
        {mode === "smm" && (
        <div className="w-full overflow-x-hidden">

        {/* ── Mobile hero (compact) ── */}
        <div className="rounded-2xl border border-border/60 p-4 sm:p-7 lg:p-10" style={{ background: "var(--gradient-hero)" }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur">
            <Sparkles className="h-2.5 w-2.5" /> Catalog
          </span>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Place a <span className="text-gradient">new boost</span>.
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-base">
            {(services ?? []).length.toLocaleString()} services · {Math.max(platforms.length - 1, 0)} platforms
          </p>
          {/* Chips: single scroll row on mobile, wrap on desktop */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0" style={{ scrollbarWidth: "none" }}>
            <Chip icon={Zap}         label="< 60s" />
            <Chip icon={ShieldCheck} label="No password" />
            <Chip icon={Check}       label="Auto refill" />
            <Chip icon={Clock4}      label="< 72 hrs" />
          </div>
        </div>

        {/* How it works — hidden on mobile to save space */}
        <div className="mt-4 hidden sm:grid gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: 1, t: "Choose a service",  d: "Filter by platform & type",     icon: MousePointerClick },
            { n: 2, t: "Paste your link",   d: "Profile, post, video or page",  icon: Link2 },
            { n: 3, t: "Set the quantity",  d: "Live total before you confirm", icon: ListChecks },
            { n: 4, t: "We deliver fast",   d: "Track progress in real time",   icon: Rocket },
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
            <p className="mt-2 text-sm text-muted-foreground">An admin needs to sync the catalog.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] pb-24 lg:pb-0">
            <div className="min-w-0 w-full">
              {/* Platform pill bar — contained scroll, no overflow bleed */}
              <div className="w-full overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                <div className="flex gap-2 w-max pr-1">
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
              </div>

              <div className="mt-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft">
                {/* Search — full width */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search services..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 ring-ring text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                {/* Category + Sort — side by side */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="rounded-lg border border-border/60 bg-card text-foreground px-3 py-2.5 text-xs outline-none focus:ring-2 ring-ring">
                    {categories.map((c) => <option key={c}>{c === "All" ? "All categories" : c}</option>)}
                  </select>
                  <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
                    className="rounded-lg border border-border/60 bg-card text-foreground px-3 py-2.5 text-xs outline-none focus:ring-2 ring-ring">
                    <option value="name">A–Z</option>
                    <option value="price-asc">Price ↑</option>
                    <option value="price-desc">Price ↓</option>
                  </select>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Filter className="h-3 w-3" /> {filtered.length.toLocaleString()} services
                </p>
              </div>

              {/* 2-col on mobile, 1-col on desktop (desktop uses sidebar layout) */}
              <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-1">
                {filtered.length === 0 && (
                  <div className="col-span-2 rounded-2xl border border-border/60 bg-card px-5 py-12 text-center text-sm text-muted-foreground lg:col-span-1">
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
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition ${
                        isSelected
                          ? "border-primary/60 shadow-elegant ring-2 ring-primary/20"
                          : "border-border/60 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
                      }`}
                    >
                      {/* Top accent stripe */}
                      <div className="h-0.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${ps.from}, ${ps.to})` }} aria-hidden />

                      <div className="flex flex-1 flex-col p-3">
                        {/* Platform icon + badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}>
                            <PIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                            style={{ background: `linear-gradient(135deg, ${ps.from}, ${ps.to})` }}>
                            {s.platform ?? "Other"}
                          </span>
                          {s.type && (
                            <span className="rounded border border-border/60 px-1 py-0.5 text-[9px] font-medium uppercase text-muted-foreground hidden sm:inline">
                              {s.type}
                            </span>
                          )}
                        </div>

                        {/* Name — 3 lines max on mobile */}
                        <h3 className="text-xs font-semibold leading-snug line-clamp-3 flex-1">{s.name}</h3>

                        {/* Min/Max compact */}
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="rounded bg-muted/60 px-1 py-0.5">
                            {s.min_quantity.toLocaleString()}–{s.max_quantity.toLocaleString()}
                          </span>
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" /> fast
                          </span>
                        </div>

                        {/* Price + Order button */}
                        <div className="mt-2.5 pt-2.5 border-t border-border/60">
                          <p className="text-sm font-bold tabular-nums text-gradient leading-none">{fmt(Number(s.rate))}</p>
                          <p className="text-[9px] text-muted-foreground mb-2">per 1,000</p>
                          <button
                            onClick={() => { setSelectedId(s.id); setQty(s.min_quantity); }}
                            className={`w-full rounded-lg py-1.5 text-xs font-bold transition active:scale-95 ${
                              isSelected ? "bg-primary/10 text-primary" : "text-white"
                            }`}
                            style={isSelected ? undefined : { background: "var(--gradient-accent)" }}
                          >
                            {isSelected ? "✓ Selected" : "Order →"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/services?service=${s.id}`;
                              navigator.clipboard?.writeText(url);
                              toast.success("Link copied!");
                            }}
                            className="mt-1.5 w-full flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
                          >
                            <Copy className="h-2.5 w-2.5" /> Copy link
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop order summary sidebar */}
            <aside className="hidden lg:block h-fit rounded-2xl border border-border/60 p-5 shadow-elegant sm:p-6 lg:sticky lg:top-20" style={{ background: "var(--gradient-card)" }}>
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

        {/* ── Mobile sticky order bar (shown when service selected, hidden on lg) ── */}
        {mode === "smm" && selected && (
          <>
            {/* Sticky bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/60 bg-card/95 backdrop-blur-xl px-4 py-3 shadow-elegant">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Selected service</p>
                  <p className="text-sm font-semibold truncate">{selected.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums text-gradient">{fmt(finalCharge, 2)}</p>
                  <p className="text-[10px] text-muted-foreground">{code}</p>
                </div>
                <button
                  onClick={() => setMobileSheetOpen(true)}
                  className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-glow"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  Order →
                </button>
              </div>
            </div>

            {/* Mobile bottom sheet */}
            {mobileSheetOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSheetOpen(false)} />
                {/* Sheet */}
                <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card border-t border-border overflow-y-auto max-h-[90dvh]">
                  {/* Handle */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="h-1 w-10 rounded-full bg-border" />
                  </div>
                  <div className="flex items-center justify-between px-5 pb-3">
                    <h3 className="font-bold text-lg">Order summary</h3>
                    <button onClick={() => setMobileSheetOpen(false)} className="rounded-full p-1.5 hover:bg-accent">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="px-5 pb-8">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        mut.mutate({ serviceId: selected.id, link, quantity: qty, coupon: couponApplied?.code });
                        setMobileSheetOpen(false);
                      }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Service</p>
                        <p className="text-sm font-semibold mt-0.5">{selected.name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your link</label>
                        <input required type="url" placeholder="https://..." value={link}
                          onChange={(e) => setLink(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 ring-primary/30 text-foreground placeholder:text-muted-foreground" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Quantity ({selected.min_quantity.toLocaleString()}–{selected.max_quantity.toLocaleString()})
                        </label>
                        <input required type="number" min={selected.min_quantity} max={selected.max_quantity} value={qty}
                          onChange={(e) => setQty(Number(e.target.value))}
                          className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 ring-primary/30 text-foreground" />
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Rate</span><span>{fmt(Number(selected.rate))} / 1k</span></div>
                        <div className="flex justify-between text-sm mt-2"><span className="text-muted-foreground">Subtotal</span><span>{fmt(charge, 2)}</span></div>
                        {couponApplied && (
                          <div className="flex justify-between text-sm mt-1 text-emerald-600">
                            <span>Coupon ({couponApplied.percent}% off)</span><span>−{fmt(discount, 2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between mt-2 pt-2 border-t border-border/60">
                          <span className="font-semibold">Total</span>
                          <span className="text-xl font-bold text-gradient tabular-nums">{fmt(finalCharge, 2)}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coupon code</label>
                        {couponApplied ? (
                          <div className="mt-1.5 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
                            <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span className="font-mono font-bold">{couponApplied.code}</span></span>
                            <button type="button" onClick={removeCoupon} className="text-xs text-muted-foreground">Remove</button>
                          </div>
                        ) : (
                          <div className="mt-1.5 flex gap-2">
                            <input type="text" placeholder="WELCOME5" value={coupon}
                              onChange={(e) => { setCoupon(e.target.value); setCouponError(null); }}
                              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase outline-none text-foreground" />
                            <button type="button" onClick={applyCoupon}
                              className="rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold hover:bg-accent">Apply</button>
                          </div>
                        )}
                        {couponError && <p className="mt-1 text-[11px] text-destructive">{couponError}</p>}
                      </div>
                      <button type="submit" disabled={mut.isPending}
                        className="flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-glow"
                        style={{ background: "var(--gradient-accent)" }}>
                        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="mr-2 h-4 w-4" /> Pay from wallet</>}
                      </button>
                      <button type="button" onClick={() => { setMobileSheetOpen(false); openCardCheckout(); }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-semibold">
                        <CreditCard className="h-4 w-4" /> Pay with card
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Tools Store mode ── */}
      {mode === "tools" && (
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl border border-border/60 p-5 shadow-elegant sm:rounded-3xl sm:p-7" style={{ background: "var(--gradient-hero)" }}>
            <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <button
                  onClick={() => setMode("choose")}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-background/80 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
                  Tools Store <span className="text-gradient">— Instant delivery.</span>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(toolData?.products ?? []).length} products available — paid from your wallet, codes delivered instantly.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip icon={Zap} label="Instant codes" />
                <Chip icon={ShieldCheck} label="Wallet-secured" />
                <Chip icon={Check} label="Curated catalog" />
              </div>
            </div>
          </div>

          {/* Content — pb-24 so sticky bar doesn't cover cards */}
          <div className="mt-6 pb-24 lg:pb-0">
            {toolsLoading ? (
              <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : !toolData?.connected ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-16 text-center">
                <Wrench className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 font-semibold">Tools store not connected</p>
                <p className="mt-1 text-sm text-muted-foreground">Ask an admin to connect the Tools Store API.</p>
              </div>
            ) : (toolData?.products ?? []).length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-16 text-center text-sm text-muted-foreground">No products available right now.</div>
            ) : (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {(toolData!.products as ToolProduct[]).map((p) => {
                  const outOfStock = p.in_stock === false || p.stock === 0;
                  const ps = toolPaletteFor(p.id);
                  const priceLocal = +(Number(p.your_price) * fx).toFixed(2);
                  return (
                    <TiltCard key={p.id} className="h-full">
                      <div
                        className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:border-primary/40 hover:shadow-elegant flex flex-col"
                        style={{ backgroundImage: "radial-gradient(400px circle at var(--mx,50%) var(--my,0%), oklch(0.72 0.20 50/0.10), transparent 45%)" }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg,${ps.from},${ps.to})` }} aria-hidden />
                        <div className="relative flex flex-col flex-1 p-3">
                          {/* Icon + name */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `linear-gradient(135deg,${ps.from},${ps.to})` }}>
                              {p.emoji ?? <Package className="h-4 w-4 text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${outOfStock ? "bg-destructive/15 text-destructive" : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600"}`}>
                                {outOfStock ? "Out of stock" : p.stock > 0 ? `${p.stock} left` : "In stock"}
                              </span>
                            </div>
                          </div>
                          <h3 className="text-xs font-semibold leading-snug line-clamp-3 flex-1">{p.name_en}</h3>

                          {/* Details row */}
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.delivery_type && (
                              <span className="text-[9px] text-muted-foreground bg-muted/60 rounded px-1 py-0.5">
                                {{ LINK: "🔗 Link", COUPON: "🎫 Code", READY_ACCOUNT: "👤 Account" }[p.delivery_type]}
                              </span>
                            )}
                            {p.duration_days && (
                              <span className="text-[9px] text-muted-foreground bg-muted/60 rounded px-1 py-0.5">⏱ {p.duration_days}d</span>
                            )}
                            {p.provider_name && (
                              <span className="text-[9px] text-muted-foreground bg-muted/60 rounded px-1 py-0.5">{p.provider_name}</span>
                            )}
                          </div>

                          <div className="mt-2 pt-2 border-t border-border/60">
                            <p className="text-sm font-bold tabular-nums text-gradient">{symbol}{priceLocal.toFixed(2)}</p>
                          </div>
                          <button
                            disabled={outOfStock}
                            onClick={() => openTool(p.id)}
                            className={`mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50 ${selectedToolId === p.id ? "bg-primary/10 text-primary" : "text-primary-foreground shadow-glow"}`}
                            style={selectedToolId === p.id || outOfStock ? undefined : { background: "var(--gradient-accent)" }}
                          >
                            {selectedToolId === p.id ? "✓ Selected" : outOfStock ? "Out of stock" : "Order →"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { const url = `${window.location.origin}/tools/store?product=${p.id}`; navigator.clipboard?.writeText(url); toast.success("Link copied!"); }}
                            className="mt-1 w-full flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
                          >
                            <Copy className="h-2.5 w-2.5" /> Copy link
                          </button>
                        </div>
                      </div>
                    </TiltCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tools sticky bar (mirrors SMM pattern) ── */}
      {mode === "tools" && selectedTool && (
        <>
          {/* Sticky bottom bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur-xl px-4 py-3 shadow-elegant">
            <div className="flex items-center gap-3 mx-auto max-w-6xl">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Selected tool</p>
                <p className="text-sm font-semibold truncate">{selectedTool.name_en}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold tabular-nums text-gradient">{symbol}{toolTotal.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{ccy?.currency ?? "MYR"}</p>
              </div>
              <button onClick={() => setToolSheetOpen(true)}
                className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-glow"
                style={{ background: "var(--gradient-accent)" }}>
                Order →
              </button>
            </div>
          </div>

          {/* Bottom sheet */}
          {toolSheetOpen && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setToolSheetOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card border-t border-border overflow-y-auto overflow-x-hidden max-h-[90dvh] w-full">
                <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-border" /></div>
                {/* Sheet header */}
                <div className="flex items-center justify-between px-4 pb-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: `linear-gradient(135deg,${toolPaletteFor(selectedTool.id).from},${toolPaletteFor(selectedTool.id).to})` }}>
                      {selectedTool.emoji ?? <Package className="h-4 w-4 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-snug line-clamp-2">{selectedTool.name_en}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {selectedTool.delivery_type && <span className="text-[9px] text-muted-foreground bg-muted/60 rounded px-1 py-0.5">{{ LINK: "🔗 Instant link", COUPON: "🎫 Code", READY_ACCOUNT: "👤 Ready account" }[selectedTool.delivery_type]}</span>}
                        {selectedTool.duration_days && <span className="text-[9px] text-muted-foreground bg-muted/60 rounded px-1 py-0.5">⏱ {selectedTool.duration_days} days</span>}
                        {selectedTool.provider_name && <span className="text-[9px] text-muted-foreground bg-muted/60 rounded px-1 py-0.5">{selectedTool.provider_name}</span>}
                        <span className={`text-[9px] font-bold rounded px-1 py-0.5 ${selectedTool.stock > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                          {selectedTool.stock > 0 ? `${selectedTool.stock} in stock` : "Out of stock"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setToolSheetOpen(false)} className="shrink-0 rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
                </div>

                <div className="px-5 pb-8 space-y-4">
                  {/* Qty */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantity</label>
                    <input type="number" min={1} max={Math.max(1, selectedTool.stock)} value={toolQty}
                      onChange={(e) => setToolQty(Math.max(1, Math.min(selectedTool.stock || 1, Number(e.target.value || 1))))}
                      className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 ring-primary/30 text-foreground" />
                  </div>

                  {/* Price breakdown */}
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Unit price</span><span>{symbol}{toolPriceLocal.toFixed(2)}</span></div>
                    {toolCouponApplied && <div className="flex justify-between text-sm text-emerald-600"><span>Coupon {toolCouponApplied.code} {toolCouponApplied.fixedLocal ? `(−${symbol}${toolCouponApplied.fixedLocal})` : `(−${toolCouponApplied.percent}%)`}</span><span>−{symbol}{toolDiscount.toFixed(2)}</span></div>}
                    <div className="flex justify-between pt-1.5 border-t border-border/60"><span className="font-semibold">Total</span><span className="text-xl font-bold text-gradient tabular-nums">{symbol}{toolTotal.toFixed(2)}</span></div>
                  </div>

                  {/* Coupon */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coupon code</label>
                    {toolCouponApplied ? (
                      <div className="mt-1.5 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-sm">
                        <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /><span className="font-mono font-bold">{toolCouponApplied.code}</span></span>
                        <button type="button" onClick={() => { setToolCouponApplied(null); setToolCoupon(""); }} className="text-xs text-muted-foreground">Remove</button>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex gap-2">
                        <input type="text" placeholder="WELCOME5" value={toolCoupon}
                          onChange={(e) => { setToolCoupon(e.target.value); setToolCouponError(null); }}
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase outline-none text-foreground placeholder:text-muted-foreground" />
                        <button type="button" onClick={applyToolCoupon} className="rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold hover:bg-accent">Apply</button>
                      </div>
                    )}
                    {toolCouponError && <p className="mt-1 text-[11px] text-destructive">{toolCouponError}</p>}
                  </div>

                  {/* Card form */}
                  {toolCardSecret && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Card details</p>
                      <Elements stripe={getStripe()}>
                        <ToolCardForm
                          clientSecret={toolCardSecret}
                          environment={getStripeEnvironment()}
                          confirmFn={confirmToolCardFn}
                          onSuccess={(codes) => { setCodesResult({ name: selectedTool!.name_en, codes }); closeTool(); qc.invalidateQueries({ queryKey: ["profile"] }); }}
                          onCancel={() => setToolCardSecret(null)}
                        />
                      </Elements>
                    </div>
                  )}

                  {/* Pay buttons */}
                  {!toolCardSecret && (
                    <div className="space-y-2">
                      <button
                        disabled={toolWalletMut.isPending}
                        onClick={() => toolWalletMut.mutate()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
                        style={{ background: "var(--gradient-accent)" }}
                      >
                        {toolWalletMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                        Pay from wallet · {symbol}{toolTotal.toFixed(2)}
                      </button>
                      <button
                        disabled={toolCardLoading}
                        onClick={openToolCard}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-semibold transition hover:bg-accent disabled:opacity-60"
                      >
                        {toolCardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Pay with card
                      </button>
                      <p className="text-center text-xs text-muted-foreground">
                        Need to top up? <button type="button" onClick={() => { closeTool(); router.navigate({ to: "/dashboard/wallet" }); }} className="text-primary underline">Go to Wallet</button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Codes delivery modal */}
      {codesResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Purchase successful</p>
                <h2 className="font-bold text-lg">{codesResult.name}</h2>
              </div>
              <button onClick={() => { setCodesResult(null); setCopiedCodes(false); }} className="rounded-lg border border-border p-1.5 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2">
              {codesResult.codes.map((c, i) => (
                <p key={i} className="font-mono text-sm break-all">{c}</p>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(codesResult.codes.join("\n"));
                setCopiedCodes(true);
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent transition"
            >
              {copiedCodes ? <><CheckCheck className="h-4 w-4 text-emerald-500" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy code(s)</>}
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Your order history is saved in the Orders tab.</p>
          </div>
        </div>
      )}

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
                options={{
                  fetchClientSecret: fetchOrderClientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#e07b2e",
                      colorBackground: "#ffffff",
                      colorText: "#0f172a",
                      colorDanger: "#ef4444",
                      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
                      fontSizeBase: "14px",
                      spacingUnit: "4px",
                      borderRadius: "12px",
                      gridRowSpacing: "16px",
                    },
                    rules: {
                      ".Input": { border: "1.5px solid #e2e8f0", boxShadow: "none", padding: "10px 14px" },
                      ".Input:focus": { border: "1.5px solid #e07b2e", boxShadow: "0 0 0 3px rgba(224,123,46,0.12)" },
                      ".Label": { fontWeight: "600", fontSize: "13px", color: "#374151", marginBottom: "6px" },
                      ".Tab": { border: "1.5px solid #e2e8f0", borderRadius: "10px" },
                      ".Tab--selected": { border: "1.5px solid #e07b2e", backgroundColor: "#fff7ed", color: "#e07b2e", boxShadow: "0 0 0 1px #e07b2e" },
                      ".Block": { borderRadius: "12px", border: "1.5px solid #e2e8f0", backgroundColor: "#f9fafb" },
                      ".CheckboxInput--checked": { backgroundColor: "#e07b2e", borderColor: "#e07b2e" },
                    },
                  },
                }}
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

const CARD_STYLE = {
  base: { color: "#0f172a", fontFamily: "Arial,sans-serif", fontSize: "14px", "::placeholder": { color: "#94a3b8" } },
  invalid: { color: "#ef4444" },
};

function ToolCardForm({ clientSecret, environment, confirmFn, onSuccess, onCancel }: {
  clientSecret: string;
  environment: "sandbox" | "live";
  confirmFn: (args: { data: { paymentIntentId: string; environment: string } }) => Promise<{ ok: boolean; codes: string[] }>;
  onSuccess: (codes: string[]) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError(null);
    const cardEl = elements.getElement(CardNumberElement);
    if (!cardEl) { setLoading(false); return; }
    const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardEl, billing_details: { name: name.trim() || undefined } },
      return_url: window.location.href,
    });
    if (stripeErr) { setError(stripeErr.message ?? "Payment failed"); setLoading(false); return; }
    if (paymentIntent?.status === "succeeded") {
      try {
        const r = await confirmFn({ data: { paymentIntentId: paymentIntent.id, environment } });
        onSuccess(r.codes ?? []);
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to deliver codes"); setLoading(false); }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-xl border border-border bg-background px-4 py-3"><CardNumberElement options={{ style: CARD_STYLE, showIcon: true }} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-background px-4 py-3"><CardExpiryElement options={{ style: CARD_STYLE }} /></div>
        <div className="rounded-xl border border-border bg-background px-4 py-3"><CardCvcElement options={{ style: CARD_STYLE }} /></div>
      </div>
      <input type="text" placeholder="Name on card" value={name} onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={!stripe || loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow disabled:opacity-60"
        style={{ background: "var(--gradient-accent)" }}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {loading ? "Processing…" : "Pay & Get Codes"}
      </button>
      <button type="button" onClick={onCancel} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition">
        ← Back to payment options
      </button>
    </form>
  );
}

const TOOL_PALETTES = [
  { from: "#f09433", to: "#bc1888" }, { from: "#25F4EE", to: "#FE2C55" },
  { from: "#ff5858", to: "#c4302b" }, { from: "#1877F2", to: "#0a4fb5" },
  { from: "#1DB954", to: "#168f3f" }, { from: "#9146FF", to: "#5d2eb8" },
  { from: "#EA4335", to: "#4285F4" }, { from: "#6366f1", to: "#06b6d4" },
  { from: "#f59e0b", to: "#ef4444" }, { from: "#10b981", to: "#0ea5e9" },
];
function toolPaletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TOOL_PALETTES[h % TOOL_PALETTES.length];
}


