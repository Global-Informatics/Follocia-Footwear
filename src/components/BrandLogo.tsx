import logo from "@/assets/follocia-logo-new.png";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  compact?: boolean;
};

export function BrandLogo({ className = "", imageClassName = "", compact = false }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <img
        src={logo}
        alt="Follicia logo"
        className={`block bg-transparent object-contain transition-transform hover:scale-105 ${
          compact ? "h-13 w-auto max-w-[130px]" : "h-24 w-auto max-w-[180px]"
        } ${imageClassName}`}
      />
    </span>
  );
}
