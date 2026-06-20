import logoAsset from "@/assets/igb-logo.png.asset.json";

type Props = {
  size?: number;
  /** Show the inverse (white-on-dark) lockup with the gradient tile. Default true. */
  onDark?: boolean;
  className?: string;
};

/**
 * iGroBrand logo mark. The source PNG is black-on-transparent;
 * we flip it to white via CSS filter when placed on the gradient accent tile.
 */
export function BrandMark({ size = 36, onDark = true, className }: Props) {
  const inner = (
    <img
      src={logoAsset.url}
      alt="iGroBrand"
      className="object-contain"
      style={{
        width: Math.round(size * 0.66),
        height: Math.round(size * 0.66),
        filter: onDark ? "brightness(0) invert(1)" : "none",
      }}
      draggable={false}
    />
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