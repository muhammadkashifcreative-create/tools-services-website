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
            <h3 className="text-base font-semibold text-foreground">2. Services</h3>
            <p className="mt-2">Social Padu provides social media growth services (followers, likes, views, plays, etc.) and digital tools through our partner network. We act as a reseller connecting customers with upstream providers. Delivery times and results may vary depending on the service and target platform.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">3. Account Registration</h3>
            <p className="mt-2">You must register using a valid Google account. You are responsible for maintaining the confidentiality of your account and all activity that occurs under it. You must be at least 18 years old to use our services.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">4. Wallet & Payments</h3>
            <p className="mt-2">All transactions on Social Padu are conducted in USD (displayed in your local currency). Wallet top-ups are non-refundable except as outlined in our Refund Policy. Orders are charged from your wallet balance at the time of placement. Card payments are processed securely via Stripe.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">5. Order Policy</h3>
            <p className="mt-2">Once an order is dispatched to our upstream provider it cannot be cancelled. Ensure your target link (profile, post, video) is correct and publicly accessible before placing an order. We are not responsible for orders placed with incorrect links.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">6. Acceptable Use</h3>
            <p className="mt-2">You agree not to use Social Padu for illegal purposes, hate speech, harassment, or any content that violates the terms of the target social media platform. We reserve the right to suspend accounts that misuse our services without notice or refund.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">7. Refunds</h3>
            <p className="mt-2">Refund requests are reviewed on a case-by-case basis. Please refer to our <a href="/refund" className="text-primary hover:underline">Refund Policy</a> for full details. Approved refunds are credited back to your wallet balance within 24 hours.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">8. Platform Compliance</h3>
            <p className="mt-2">Our services use publicly available links and do not require passwords. We make no guarantees regarding compliance with third-party platform policies. Use of our services is at your own risk, and we are not liable for any consequences resulting from platform enforcement actions.</p>
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
            <p className="mt-2">For questions about these terms, contact us at <a href="mailto:support@socialpadu.my" className="text-primary hover:underline">support@socialpadu.my</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
