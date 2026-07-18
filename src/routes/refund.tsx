import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Social Padu" },
      { name: "description", content: "Social Padu's refund policy — when and how we issue refunds." },
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
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h3 className="text-base font-semibold text-foreground">Overview</h3>
            <p className="mt-2">Our books are digital downloads, so the full content becomes available the moment payment is confirmed. Because of that, refunds are limited to the situations below. All requests are reviewed manually — open a support case from your dashboard with your purchase ID and a description of the issue. We aim to resolve all requests within 24–48 hours.</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Eligible for Refund</h3>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>You were charged but the book never appeared in your library.</li>
              <li>The downloaded file is corrupt, incomplete, or unreadable, and we cannot supply a working copy.</li>
              <li>The book's content is materially different from its description on the product page.</li>
              <li>Duplicate purchase of the same book caused by a system error.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Not Eligible for Refund</h3>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>Change of mind after the book has been downloaded.</li>
              <li>The book covers the software version stated in its description, but you needed a different version.</li>
              <li>General dissatisfaction with writing style or depth when the description and page count were accurate.</li>
              <li>Issues reported more than 14 days after purchase.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">How Refunds Are Issued</h3>
            <p className="mt-2">Approved refunds are returned to your original payment method through Stripe. Depending on your bank, the money typically appears within 5–10 business days. Access to the refunded book is removed from your library.</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Contact Us</h3>
            <p className="mt-2">Open a support case from your dashboard or email <a href="mailto:socialpadu@gmail.com" className="text-primary hover:underline">socialpadu@gmail.com</a>. Please include your purchase ID and a clear description of the issue to help us resolve it quickly.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
