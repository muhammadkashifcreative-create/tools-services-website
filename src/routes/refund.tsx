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
            <p className="mt-2">All refund requests are reviewed manually by our team. To request a refund, open a support case from your dashboard with your order ID, a description of the issue, and any relevant screenshots. We aim to resolve all requests within 24–48 hours.</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Eligible for Refund</h3>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>Order marked as completed but no code, link, or account was delivered.</li>
              <li>Delivered code or account is invalid, already used, or does not activate as described.</li>
              <li>Supplier outage or technical failure acknowledged by our team.</li>
              <li>Duplicate order placed by system error.</li>
              <li>Wallet top-up completed but balance not credited (payment processing error).</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Not Eligible for Refund</h3>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>Change of mind after the code or account details have been revealed.</li>
              <li>Product purchased for the wrong platform, region, or requirement stated in the product description.</li>
              <li>Account suspended or restricted due to the customer violating the vendor's terms after delivery.</li>
              <li>Vendor-side changes to a product's features or pricing after successful delivery.</li>
              <li>Issues reported more than 7 days after delivery, unless the product carries a longer stated warranty.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Wallet Top-ups</h3>
            <p className="mt-2">Wallet top-ups are non-refundable to the original payment method once credited to your account. In exceptional circumstances (e.g. fraudulent charges), please contact us immediately at <a href="mailto:support@socialpadu.my" className="text-primary hover:underline">support@socialpadu.my</a>.</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">How Refunds Are Issued</h3>
            <p className="mt-2">All approved refunds are credited to your Social Padu wallet balance within 24 hours of approval. Wallet credits can be used for any future order on our platform.</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">Contact Us</h3>
            <p className="mt-2">Open a support case from your dashboard or email <a href="mailto:support@socialpadu.my" className="text-primary hover:underline">support@socialpadu.my</a> with your order details. Please include your order ID and a clear description of the issue to help us resolve it quickly.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
