import { useState } from "react";

interface BrandImageSlotProps {
  src?: string;
  alt: string;
  label?: string;
  className?: string;
}

export function BrandImageSlot({ src, alt, className = "" }: BrandImageSlotProps) {
  const [unavailable, setUnavailable] = useState(false);
  if (!src || unavailable) return null;
  return (
    <span className={`brand-image-slot ${className}`}>
      <img src={src} alt={alt} loading="lazy" onError={() => setUnavailable(true)} />
    </span>
  );
}
