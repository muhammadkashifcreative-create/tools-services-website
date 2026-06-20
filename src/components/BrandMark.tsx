type Props = {
  size?: number;
  /** Show the inverse (white-on-dark) lockup with the gradient tile. Default true. */
  onDark?: boolean;
  className?: string;
};

export function BrandMark({ size = 36, onDark = true, className }: Props) {
  const inner = (
    <span
      aria-label="iGroBrand"
      className="font-display font-black leading-none tracking-tight"
      style={{
        color: onDark ? "currentColor" : "hsl(var(--primary))",
        fontSize: Math.max(12, Math.round(size * 0.42)),
      }}
    >
      iG
    </span>
  );
  if (!onDark) return <span className={className}>{inner}</span>;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl text-primary-foreground shadow-glow ${className ?? ""}`}
      style={{ width: size, height: size, background: "var(--gradient-accent)" }}
    >
      {inner}
    </span>
  );
}
