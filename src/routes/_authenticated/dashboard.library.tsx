import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { BookOpen, Download, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/AppLayout";
import { getMyLibrary, reconcileMyPurchases, type LibraryItem } from "@/lib/books.functions";

export const Route = createFileRoute("/_authenticated/dashboard/library")({
  head: () => ({ meta: [{ title: "My Library — Social Padu" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const qc = useQueryClient();
  const fetchLibrary = useServerFn(getMyLibrary);
  const reconcile = useServerFn(reconcileMyPurchases);

  // Our /checkout page lands here after payment (?justPaid=1 on immediate
  // success, or ?payment_intent=... when Stripe redirected for 3D Secure).
  // Reconcile immediately so the book appears even if the webhook hasn't landed yet.
  const fromCheckout = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("justPaid") || params.get("payment_intent")) {
      fromCheckout.current = true;
      window.history.replaceState(null, "", "/dashboard/library");
    }
    reconcile()
      .then((r) => {
        if (r.settled > 0 || fromCheckout.current) {
          toast.success("Payment confirmed! If your book shows 'being prepared', we'll email you as soon as it's delivered.");
          qc.invalidateQueries({ queryKey: ["myLibrary"] });
          qc.invalidateQueries({ queryKey: ["bookPurchases"] });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({ queryKey: ["myLibrary"], queryFn: () => fetchLibrary() });
  const items = (data?.items ?? []) as LibraryItem[];

  return (
    <AppLayout>
      <Toaster />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Library</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Every guide book you own — download any time, as often as you like.</p>
          </div>
          <Link
            to="/books"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 sm:text-sm"
            style={{ background: "var(--gradient-accent)" }}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Browse books
          </Link>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-bold">Your library is empty</h2>
              <p className="mt-1 text-sm text-muted-foreground">Books you buy appear here with a permanent download link.</p>
              <Link
                to="/books"
                className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
                style={{ background: "var(--gradient-accent)" }}
              >
                <ShoppingBag className="h-4 w-4" /> Find your first book
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.purchase_id} className="flex gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                  <div className="w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 sm:w-24">
                    {item.book.cover_url ? (
                      <img src={item.book.cover_url} alt={`${item.book.title} cover`} className="aspect-[3/4] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[3/4] w-full items-center justify-center" style={{ background: "var(--gradient-card)" }}>
                        <BookOpen className="h-6 w-6 text-primary/60" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{item.book.category}</p>
                    <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug">{item.book.title}</h3>
                    {item.book.author && <p className="mt-0.5 truncate text-xs text-muted-foreground">by {item.book.author}</p>}
                    <div className="mt-auto pt-3">
                      {item.download_url ? (
                        <a
                          href={item.download_url}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-glow transition hover:opacity-90"
                          style={{ background: "var(--gradient-accent)" }}
                        >
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </a>
                      ) : item.delivery_status !== "delivered" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> Being prepared — we'll email you when it's ready
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Download unavailable — contact support and we'll fix it.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
