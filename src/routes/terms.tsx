import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Social Padu" },
      { name: "description", content: "The terms that govern your use of Social Padu services." },
      { property: "og:title", content: "Terms — Social Padu" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h3 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h3>
            <p className="mt-2">By creating an account or placing an order on Social Padu ("we", "us", "our"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">2. Products</h3>
            <p className="mt-2">Social Padu sells digital guide books — downloadable PDF ebooks that teach you how to use computer software. Each purchase grants you a personal, non-transferable licence to download and read the book. Books are delivered digitally through your account library; no physical product is shipped.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">3. Account Registration</h3>
            <p className="mt-2">You must register using a valid Google account. You are responsible for maintaining the confidentiality of your account and all activity that occurs under it. You must be at least 18 years old to use our services.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">4. Payments</h3>
            <p className="mt-2">All purchases are charged in USD (displayed in your local currency for reference) and processed securely by Stripe. We never see or store your card details. Any legacy wallet balance on your account remains subject to our Refund Policy.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">5. Delivery & Cancellation</h3>
            <p className="mt-2">Books are delivered instantly once payment is confirmed — the download appears in your account library. Because the full content becomes accessible immediately, purchases cannot be cancelled once the download has been made available. Check the book description and price before confirming your purchase.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">6. Acceptable Use</h3>
            <p className="mt-2">Books are licensed for your personal use. You agree not to redistribute, resell, publicly share, or upload purchased books, and not to use the platform for fraud or other illegal purposes. We reserve the right to suspend accounts that misuse our platform without notice or refund.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">7. Refunds</h3>
            <p className="mt-2">Refund requests are reviewed on a case-by-case basis. Please refer to our <a href="/refund" className="text-primary hover:underline">Refund Policy</a> for full details. Approved refunds are returned to your original payment method via Stripe.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">8. Intellectual Property & Trademarks</h3>
            <p className="mt-2">All books sold on Social Padu are protected by copyright. Purchasing a book does not transfer ownership of its content. Software names mentioned in our books (e.g. Microsoft Excel, Adobe Photoshop) are trademarks of their respective owners; Social Padu is an independent publisher and is not affiliated with or endorsed by those companies.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">9. Limitation of Liability</h3>
            <p className="mt-2">To the maximum extent permitted by law, Social Padu's total liability for any claim arising from these terms or your use of our services is limited to the amount you paid in the 30 days prior to the claim. We are not liable for indirect, consequential, or punitive damages.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">10. Changes to Terms</h3>
            <p className="mt-2">We may update these terms at any time. We will notify users of significant changes via the announcement bar on our website. Continued use of Social Padu after changes are posted constitutes acceptance of the updated terms.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">11. Governing Law</h3>
            <p className="mt-2">These terms are governed by the laws of Malaysia. Any disputes shall be resolved in the courts of Malaysia.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">12. Contact</h3>
            <p className="mt-2">For questions about these terms, contact us at <a href="mailto:socialpadu@gmail.com" className="text-primary hover:underline">socialpadu@gmail.com</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
