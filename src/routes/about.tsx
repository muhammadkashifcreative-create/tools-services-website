import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Social Padu" },
      { name: "description", content: "Social Padu helps creators and brands grow on every major social platform — fast, reliable, transparent." },
      { property: "og:title", content: "About — Social Padu" },
      { property: "og:description", content: "Our mission, story, and the team behind Social Padu." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About Social Padu</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Social Padu is a social growth engine for creators, agencies, and brands.
          We connect you to a curated network of top providers so every order ships fast and stays compliant with platform rules.
        </p>
        <h2 className="mt-10 text-xl font-semibold">What we do</h2>
        <p className="mt-3 text-muted-foreground">
          From follower growth and engagement to live-stream views and short-form discovery boosts, our catalog covers every major platform.
          Every service is monitored, with auto-refill where supported and refund coverage when results miss spec.
        </p>
        <h2 className="mt-10 text-xl font-semibold">Built for scale</h2>
        <p className="mt-3 text-muted-foreground">
          Resellers and agencies plug straight in through our developer API — the same engine we use for the website powers everyone else.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}