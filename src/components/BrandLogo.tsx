import logo from "@/assets/follocia-logo-new.png";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  compact?: boolean;
};

export function BrandLogo({ className = "", imageClassName = "", compact = false }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src={logo}
        alt="Follocia logo"
        className={`block bg-transparent object-contain ${compact ? "h-24 w-24" : "h-32 w-32"} ${imageClassName}`}
      />
    </span>
  );
}
