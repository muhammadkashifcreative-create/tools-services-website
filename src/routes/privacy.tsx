import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Social Padu" },
      { name: "description", content: "How Social Padu collects, uses, and protects your personal data." },
      { property: "og:title", content: "Privacy Policy — Social Padu" },
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
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h3 className="text-base font-semibold text-foreground">1. Who We Are</h3>
            <p className="mt-2">Social Padu ("we", "us", "our") operates the website socialpadu.my. We are committed to protecting your personal data and respecting your privacy. Contact: <a href="mailto:socialpadu@gmail.com" className="text-primary hover:underline">socialpadu@gmail.com</a></p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">2. Data We Collect</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Account data:</strong> Your name and email address from Google OAuth sign-in.</li>
              <li><strong className="text-foreground">Order data:</strong> Products purchased, quantities, delivered codes, and transaction history.</li>
              <li><strong className="text-foreground">Payment data:</strong> Wallet top-up amounts and transaction records. We do not store card numbers.</li>
              <li><strong className="text-foreground">Usage data:</strong> Page visits, session duration, and feature usage for product improvement.</li>
              <li><strong className="text-foreground">Support data:</strong> Messages and files you submit via support cases.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">3. How We Use Your Data</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>To create and manage your account.</li>
              <li>To process and fulfil your orders.</li>
              <li>To process wallet payments and maintain transaction records.</li>
              <li>To provide customer support.</li>
              <li>To send important service notifications (no marketing without consent).</li>
              <li>To detect and prevent fraud or misuse.</li>
              <li>To improve our platform and services.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">4. Data Sharing</h3>
            <p className="mt-2">We share limited data with the following trusted parties:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Upstream suppliers:</strong> Order details required to fulfil your purchase.</li>
              <li><strong className="text-foreground">Supabase:</strong> Secure database and authentication hosting.</li>
              <li><strong className="text-foreground">Google:</strong> OAuth authentication only.</li>
            </ul>
            <p className="mt-2">We never sell your personal data to third parties.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">5. Cookies</h3>
            <p className="mt-2">We use essential cookies for authentication (keeping you signed in) and preference storage (language, currency). We do not use advertising or cross-site tracking cookies. You can manage cookies in your browser settings.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">6. Data Retention</h3>
            <p className="mt-2">We retain your account data for as long as your account is active. Order and transaction records are retained for 7 years for financial compliance purposes. Support case data is retained for 2 years after resolution.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">7. Your Rights</h3>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Access a copy of your personal data.</li>
              <li>Correct inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Object to certain processing activities.</li>
              <li>Export your data in a portable format.</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, open a support case from your dashboard or email <a href="mailto:socialpadu@gmail.com" className="text-primary hover:underline">socialpadu@gmail.com</a>. We will respond within 30 days.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">8. Security</h3>
            <p className="mt-2">We implement industry-standard security measures including HTTPS encryption, hashed session tokens, and role-based access controls. In the event of a data breach affecting your personal data, we will notify you within 72 hours where required by law.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">9. Children's Privacy</h3>
            <p className="mt-2">Our services are not directed at individuals under 18. We do not knowingly collect data from minors. If you believe a minor has created an account, contact us immediately.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">10. Changes to This Policy</h3>
            <p className="mt-2">We may update this policy periodically. We will post the updated version on this page and update the "Last updated" date. Continued use of Social Padu after changes constitutes acceptance.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
