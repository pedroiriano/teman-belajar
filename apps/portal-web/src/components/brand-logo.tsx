import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "main" | "mark";
  decorative?: boolean;
};

const brandAssets = {
  main: { src: "/brand/logo-main.png", size: 512 },
  mark: { src: "/brand/logo-mark.png", size: 256 },
} as const;

export function BrandLogo({ className, priority = false, variant = "mark", decorative = true }: BrandLogoProps) {
  const asset = brandAssets[variant];
  return (
    <Image
      src={asset.src}
      width={asset.size}
      height={asset.size}
      alt={decorative ? "" : "Logo Teman Belajar"}
      className={className}
      priority={priority}
      sizes="(max-width: 640px) 48px, 80px"
    />
  );
}
