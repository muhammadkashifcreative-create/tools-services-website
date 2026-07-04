import { useState } from "react";
import { X, Copy, Check, Package, User } from "lucide-react";

export type OrderDetailData = {
  id: string;
  product_name: string;
  qty: number;
  unit_price?: number | string | null;
  total_price: number | string;
  codes?: string[] | null;
  status: string;
  created_at: string;
  /** Shown only in the admin panel */
  buyer?: { name?: string | null; email?: string | null } | null;
};

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
  processing: "bg-blue-500/10 text-blue-600 border border-blue-500/30",
  pending: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
  canceled: "bg-destructive/10 text-destructive border border-destructive/30",
  cancelled: "bg-destructive/10 text-destructive border border-destructive/30",
};

export function OrderDetailModal({ order, onClose }: { order: OrderDetailData; onClose: () => void }) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const codes = (order.codes ?? []) as string[];
  const statusCls = STATUS_STYLE[order.status?.toLowerCase()] ?? "bg-muted text-muted-foreground border border-border";

  const copyAll = () => {
    navigator.clipboard?.writeText(codes.join("\n")).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };
  const copyOne = (code: string, i: number) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="h-1 w-10 rounded-full bg-border" /></div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-accent)" }}>
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order Detail</p>
              <p className="font-bold text-sm leading-snug">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-border p-1.5 hover:bg-accent transition"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status + date */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusCls}`}>{order.status}</span>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              {new Date(order.created_at).toLocaleString()}
            </span>
          </div>

          {/* Order summary */}
          <div className="overflow-hidden rounded-xl border border-border/60">
            <dl className="divide-y divide-border/60 text-sm">
              <Row label="Product"><span className="font-medium">{order.product_name}</span></Row>
              <Row label="Order ID"><span className="font-mono text-xs break-all">{order.id}</span></Row>
              <Row label="Quantity"><span className="tabular-nums">{order.qty}</span></Row>
              {order.unit_price != null && (
                <Row label="Unit price"><span className="tabular-nums">${Number(order.unit_price).toFixed(2)} USD</span></Row>
              )}
              <Row label="Total paid"><span className="font-bold tabular-nums text-gradient">${Number(order.total_price).toFixed(2)} USD</span></Row>
              {order.buyer && (
                <Row label="Customer">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{order.buyer.name || "—"}</span>
                    {order.buyer.email && <span className="text-xs text-muted-foreground">· {order.buyer.email}</span>}
                  </span>
                </Row>
              )}
            </dl>
          </div>

          {/* Delivered codes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Delivered codes {codes.length > 0 && `(${codes.length})`}
              </p>
              {codes.length > 0 && (
                <button
                  onClick={copyAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-accent transition"
                >
                  {copiedAll ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy all</>}
                </button>
              )}
            </div>
            {codes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                No codes attached to this order.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {codes.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <span className="min-w-0 flex-1 break-all font-mono text-xs sm:text-sm">{c}</span>
                    <button
                      onClick={() => copyOne(c, i)}
                      aria-label="Copy code"
                      className="shrink-0 rounded-md border border-border bg-card p-1.5 hover:bg-accent transition"
                    >
                      {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button onClick={onClose} className="w-full rounded-xl border border-border bg-card py-2.5 text-sm font-semibold hover:bg-accent transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground pt-0.5">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}
