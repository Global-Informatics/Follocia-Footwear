import logo from "@/assets/follocia-logo.jpeg";

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
        className={`block bg-white object-contain ${compact ? "h-12 w-12" : "h-16 w-16"} ${imageClassName}`}
      />
    </span>
  );
}
