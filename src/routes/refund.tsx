import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Social Padu" },
      { name: "description", content: "When and how Social Padu issues refunds." },
      { property: "og:title", content: "Refund Policy — Social Padu" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Refund Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>Refunds are reviewed manually on a per-case basis. Open a case from your dashboard with the order ID and the reason for the request.</p>
          <h3 className="text-base font-semibold text-foreground">Eligible</h3>
          <ul className="list-disc pl-5"><li>Order marked complete but no measurable delivery</li><li>Service stalled beyond the published completion window</li><li>Provider outage acknowledged by our team</li></ul>
          <h3 className="text-base font-semibold text-foreground">Not eligible</h3>
          <ul className="list-disc pl-5"><li>Wrong target link supplied by the customer</li><li>Target account changed to private mid-delivery</li><li>Refill window already expired</li></ul>
          <p>Approved refunds are returned to your wallet within 24h.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}