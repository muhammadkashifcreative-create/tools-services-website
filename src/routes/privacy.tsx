import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — iGroBrand" },
      { name: "description", content: "How iGroBrand collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy — iGroBrand" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <section><h3 className="text-base font-semibold text-foreground">Information we collect</h3><p>Account email, profile details, order metadata, payment confirmations, and basic analytics.</p></section>
          <section><h3 className="text-base font-semibold text-foreground">How we use it</h3><p>To deliver services you order, route payments, prevent fraud, provide support, and improve the product.</p></section>
          <section><h3 className="text-base font-semibold text-foreground">Sharing</h3><p>We share order targets with our upstream provider to fulfill the work. We never sell your personal data.</p></section>
          <section><h3 className="text-base font-semibold text-foreground">Your rights</h3><p>Request export or deletion of your data by opening a Case from your dashboard.</p></section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}