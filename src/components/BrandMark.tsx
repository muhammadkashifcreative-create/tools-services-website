import logo from "@/assets/logo.png";

type Props = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 36, className }: Props) {
  return (
    <img
      src={logo}
      alt="Social Padu"
      className={`object-contain ${className ?? ""}`}
      style={{ width: size, height: "auto" }}
    />
  );
}
