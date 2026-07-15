import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import type { Book } from "@/lib/books.functions";

export function BookCard({ book, fxSymbol, fxRate }: { book: Book; fxSymbol: string; fxRate: number }) {
  const local = Number(book.price_usd) * fxRate;
  return (
    <Link
      to="/books/$slug"
      params={{ slug: book.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`${book.title} cover`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: "var(--gradient-card)" }}>
            <BookOpen className="h-10 w-10 text-primary/60" />
            <p className="line-clamp-3 text-sm font-semibold text-foreground/80">{book.title}</p>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-border/60 bg-background/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur">
          {book.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base">{book.title}</h3>
        {book.author && <p className="mt-1 text-xs text-muted-foreground">by {book.author}</p>}
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="text-lg font-bold tabular-nums text-gradient">
              {fxSymbol}
              {local.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">${Number(book.price_usd).toFixed(2)} USD</p>
          </div>
          <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow transition group-hover:opacity-90" style={{ background: "var(--gradient-accent)" }}>
            View
          </span>
        </div>
      </div>
    </Link>
  );
}
