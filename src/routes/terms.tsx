import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — iGroBrand" },
      { name: "description", content: "The terms that govern your use of iGroBrand." },
      { property: "og:title", content: "Terms — iGroBrand" },
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
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section><h3 className="text-base font-semibold text-foreground">1. Accepting these terms</h3><p>By creating an account or placing an order, you agree to these terms.</p></section>
          <section><h3 className="text-base font-semibold text-foreground">2. Service</h3><p>iGroBrand provides social growth services through partner networks. Delivery times and quality vary per service and platform.</p></section>
          <section><h3 className="text-base font-semibold text-foreground">3. Acceptable use</h3><p>You will not use the service for illegal content, harassment, or material that violates target platform rules.</p></section>
          <section><h3 className="text-base font-semibold text-foreground">4. Payment & wallet</h3><p>Wallet top-ups are non-transferable. Orders are paid from your wallet and are non-cancellable once dispatched.</p></section>
          <section><h3 className="text-base font-semibold text-foreground">5. Liability</h3><p>We are not responsible for actions taken by third-party platforms. Maximum liability is limited to amounts paid in the last 30 days.</p></section>
          <section><h3 className="text-base font-semibold text-foreground">6. Changes</h3><p>We may update these terms. Continued use after changes means you accept the updated version.</p></section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}